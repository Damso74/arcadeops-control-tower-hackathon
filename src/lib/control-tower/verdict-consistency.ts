/**
 * Deterministic verdict / score / executiveDecision consistency layer.
 *
 * Gemini reasons over the trace. ArcadeOps Control Tower then enforces
 * three non-negotiable invariants on top of the model output, so the
 * decision card can never display a contradictory verdict.
 *
 * Invariants enforced:
 *   I1 — score >= 80                   → verdict must be `ready`
 *   I2 — 50 <= score < 80              → verdict must be `needs_review`
 *   I3 — score < 50                    → verdict must be `blocked`
 *   I4 — any high-severity policy gate → verdict forced to `blocked`
 *                                        and score capped at 45 (mirrors
 *                                        `policy-gates.ts` ceilings, just
 *                                        in case a gate fired but the
 *                                        scoreCap path was relaxed)
 *   I5 — `executiveDecision` substring is realigned with the final
 *         verdict — never "ship" while blocked, never "block" while
 *         ready. Original phrasing is preserved when it already matches.
 *
 * The function is pure (no I/O), takes the post-policy-gate
 * `GeminiJudgeResult`, and returns a NEW result. It never widens — it
 * can only **tighten** the verdict toward the conservative side, and
 * only rewrites `executiveDecision` when it would otherwise be
 * self-contradicting.
 *
 * Why a separate module from `policy-gates.ts`:
 *   - policy-gates.ts encodes *production rules* (destructive without
 *     approval, outbound without review, missing audit, cost overrun);
 *   - verdict-consistency.ts encodes *internal coherence* of the audit
 *     payload regardless of which gates fired.
 *
 * Both layers stack: gates first (tighten by rule), then consistency
 * (tighten by score↔verdict↔text invariants).
 */
import type {
  GeminiJudgeResult,
  GeminiVerdict,
} from "./gemini-types";

/* ──────────────────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────────────── */

export interface VerdictConsistencyAdjustment {
  /** True when at least one invariant fired and the result was rewritten. */
  adjusted: boolean;
  /** Verdict before the consistency pass. */
  originalVerdict: GeminiVerdict;
  /** Score before the consistency pass. */
  originalScore: number;
  /** Original executive decision text, before any rewrite. */
  originalExecutiveDecision: string;
  /**
   * Short machine-readable reasons (for logs / future analytics). Never
   * surfaced verbatim in the UI — the UI uses the final result.
   */
  reasons: string[];
}

export interface EnforceVerdictConsistencyOutput {
  result: GeminiJudgeResult;
  adjustment: VerdictConsistencyAdjustment;
}

/**
 * Apply the verdict / score / executiveDecision consistency invariants on
 * top of a (potentially policy-gated) Gemini judgment.
 *
 * Inputs are never mutated. The returned `result` is safe to serialize.
 */
export function enforceVerdictConsistency(
  result: GeminiJudgeResult,
): EnforceVerdictConsistencyOutput {
  const reasons: string[] = [];
  const originalVerdict = result.verdict;
  const originalScore = result.readinessScore;
  const originalExecutiveDecision = result.executiveDecision;

  // I4 — high-severity policy gate forces blocked.
  const hasHighGate =
    result.policyGate?.triggered &&
    result.policyGate.rules.some((rule) => rule.severity === "high");

  let verdict: GeminiVerdict = result.verdict;
  let score: number = clampScore(result.readinessScore);

  if (hasHighGate) {
    if (verdict !== "blocked") {
      reasons.push("high_severity_policy_gate_forces_blocked");
      verdict = "blocked";
    }
    if (score > 45) {
      reasons.push("high_severity_policy_gate_caps_score_45");
      score = 45;
    }
  }

  // I1/I2/I3 — score → verdict invariants. We pick the *most conservative*
  // verdict between Gemini's call and the score-derived one. We never
  // upgrade a Gemini blocked to ready just because the score happens to
  // be high — the gate-by-rule layer already ran upstream, so a high
  // Gemini score with a Gemini blocked verdict is treated as "Gemini
  // disagreed with itself" and we side with Gemini's verdict (the model
  // saw the trace, the score derivation hasn't).
  const fromScore = verdictFromScore(score);
  const tightened = pickStricter(verdict, fromScore);
  if (tightened !== verdict) {
    reasons.push(`score_band_tightens_${verdict}_to_${tightened}`);
    verdict = tightened;
  }

  // Now align the score band with the (possibly tightened) verdict so
  // the UI never displays "Ready 25/100" or "Blocked 90/100". We only
  // *cap* the score when the verdict says "no" — we never inflate it.
  const cappedScore = capScoreToVerdict(score, verdict);
  if (cappedScore !== score) {
    reasons.push(`verdict_${verdict}_caps_score_to_${cappedScore}`);
    score = cappedScore;
  }

  // I5 — rewrite executiveDecision when it directly contradicts the verdict.
  const decisionAligned = alignExecutiveDecision(
    originalExecutiveDecision,
    verdict,
  );
  if (decisionAligned.rewritten) {
    reasons.push(`executive_decision_realigned_to_${verdict}`);
  }

  const adjusted =
    verdict !== originalVerdict ||
    score !== originalScore ||
    decisionAligned.text !== originalExecutiveDecision;

  return {
    result: {
      ...result,
      verdict,
      readinessScore: score,
      executiveDecision: decisionAligned.text,
    },
    adjustment: {
      adjusted,
      originalVerdict,
      originalScore,
      originalExecutiveDecision,
      reasons,
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Score / verdict helpers
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Strict thresholds, matching the spec:
 *   score >= 80 → ready
 *   50  <= score < 80 → needs_review
 *   score < 50 → blocked
 */
export function verdictFromScore(score: number): GeminiVerdict {
  const safe = clampScore(score);
  if (safe >= 80) return "ready";
  if (safe >= 50) return "needs_review";
  return "blocked";
}

/**
 * Cap the score so it stays inside the band of the chosen verdict. We
 * never inflate — only cap downward. This matches the user-facing
 * promise: "the verdict is always coherent with the score".
 *
 *   blocked       → max 49
 *   needs_review  → max 79 (and at least 50 if the original was below)
 *   ready         → no upper cap (already top band)
 */
function capScoreToVerdict(score: number, verdict: GeminiVerdict): number {
  const safe = clampScore(score);
  switch (verdict) {
    case "blocked":
      return Math.min(safe, 49);
    case "needs_review":
      // If Gemini scored 92 but a high gate forced the verdict down, we
      // cap to 79 so the dial visually agrees. We do not raise a low
      // score — that would lie in the other direction.
      if (safe >= 80) return 79;
      // Likewise, if the score was 30 but verdict became needs_review
      // (e.g. via a covered guardrail in remediation_simulation), bump
      // to the band floor so the UI is internally coherent.
      if (safe < 50) return 50;
      return safe;
    case "ready":
      // Defensive — we should never reach this branch with a sub-80
      // score because we only ever tighten. But if a future caller
      // bypasses pickStricter, keep the floor explicit.
      return Math.max(safe, 80);
  }
}

/**
 * Pick the most conservative verdict (blocked < needs_review < ready).
 * Used when the Gemini call and the score band disagree — we always
 * side with the stricter signal.
 */
function pickStricter(a: GeminiVerdict, b: GeminiVerdict): GeminiVerdict {
  const rank: Record<GeminiVerdict, number> = {
    blocked: 0,
    needs_review: 1,
    ready: 2,
  };
  return rank[a] <= rank[b] ? a : b;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n <= 1 && n > 0 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/* ──────────────────────────────────────────────────────────────────────────
 * executiveDecision alignment
 * ──────────────────────────────────────────────────────────────────────── */

interface DecisionAlignment {
  text: string;
  rewritten: boolean;
}

/**
 * Realign the human-readable executive decision with the final verdict.
 *
 * - When it already matches the verdict (contains the right keyword and
 *   no contradicting one), keep Gemini's wording verbatim.
 * - When it contradicts the verdict (e.g. verdict=blocked but text
 *   says "ship"), replace it with a deterministic short sentence.
 * - When it is empty, fill it with the deterministic sentence.
 *
 * The rewritten text is intentionally short and never invents new
 * facts — it just states the decision band. Gemini's `summary` and
 * `remediationPlan` remain the place for nuance.
 */
function alignExecutiveDecision(
  text: string,
  verdict: GeminiVerdict,
): DecisionAlignment {
  const trimmed = (text ?? "").trim();
  if (trimmed.length === 0) {
    return { text: defaultDecisionFor(verdict), rewritten: true };
  }

  const lower = trimmed.toLowerCase();
  const sayShip = /\b(ship|deploy|release|go[\s-]?live|approve)\b/.test(lower);
  const sayHold = /\b(hold|review|pause|wait|defer)\b/.test(lower);
  const sayBlock = /\b(block|stop|reject|deny|halt|do not ship)\b/.test(lower);

  switch (verdict) {
    case "ready":
      // Block / hold contradicts ready. Ship matches ready.
      if (sayBlock || sayHold) {
        return { text: defaultDecisionFor("ready"), rewritten: true };
      }
      // Empty of action verbs but harmless — keep it.
      return { text: trimmed, rewritten: false };

    case "needs_review":
      if (sayShip || sayBlock) {
        return { text: defaultDecisionFor("needs_review"), rewritten: true };
      }
      return { text: trimmed, rewritten: false };

    case "blocked":
      if (sayShip || (sayHold && !sayBlock)) {
        return { text: defaultDecisionFor("blocked"), rewritten: true };
      }
      return { text: trimmed, rewritten: false };
  }
}

/**
 * Short, deterministic next-action sentence per verdict. Used as fallback
 * when Gemini's `executiveDecision` is empty or contradicts the verdict.
 */
function defaultDecisionFor(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "ready":
      return "Ship to production with monitoring enabled.";
    case "needs_review":
      return "Hold for human review before any production rollout.";
    case "blocked":
      return "Add the required guardrails before production. Do not ship.";
  }
}
