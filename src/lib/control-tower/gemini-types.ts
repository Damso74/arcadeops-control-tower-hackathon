/**
 * Types and validation helpers for the Gemini Reliability Judge.
 *
 * The judge takes a Control Tower agent run trace and asks Gemini to assess
 * whether the run is production-ready. The output is a strict JSON object
 * that the UI renders as a verdict, score and remediation plan.
 *
 * No SDK is imported here — both the API route and the UI consume these
 * types directly. Validation is intentionally lenient: missing optional
 * fields are filled with safe defaults so a slightly off-spec model
 * response never crashes the panel.
 */

export type GeminiVerdict = "ready" | "needs_review" | "blocked";

export type GeminiRiskSeverity = "low" | "medium" | "high";

export type GeminiRiskCategory =
  | "tool_safety"
  | "cost"
  | "observability"
  | "data_exposure"
  | "governance"
  | "output_quality";

export interface GeminiRisk {
  severity: GeminiRiskSeverity;
  category: GeminiRiskCategory;
  finding: string;
  evidence: string;
}

export interface GeminiJudgeResult {
  provider: "Google";
  model: string;
  readinessScore: number;
  verdict: GeminiVerdict;
  summary: string;
  risks: GeminiRisk[];
  costAssessment: string;
  toolSafetyAssessment: string;
  observabilityAssessment: string;
  missingEvidence: string[];
  remediationPlan: string[];
  executiveDecision: string;
  businessValue: string;
  /**
   * Optional deterministic production policy gate result. Attached by the
   * server route after `normalizeJudgeResult`. Gemini reasons over the
   * trace; ArcadeOps applies non-negotiable production rules on top of
   * the verdict (destructive-without-approval, outbound-without-review,
   * write-without-audit, unbounded-cost). When `triggered === true` the
   * UI shows a discreet badge in the decision card explaining that a
   * hard production rule fired in addition to the model verdict.
   */
  policyGate?: {
    triggered: boolean;
    rules: Array<{
      id: string;
      label: string;
      severity: "medium" | "high";
      reason: string;
    }>;
  };
}

const VALID_VERDICTS: ReadonlySet<GeminiVerdict> = new Set([
  "ready",
  "needs_review",
  "blocked",
]);

const VALID_SEVERITIES: ReadonlySet<GeminiRiskSeverity> = new Set([
  "low",
  "medium",
  "high",
]);

const VALID_CATEGORIES: ReadonlySet<GeminiRiskCategory> = new Set([
  "tool_safety",
  "cost",
  "observability",
  "data_exposure",
  "governance",
  "output_quality",
]);

/** Snapshot of a Control Tower run sent to the judge as evidence. */
export interface JudgeRunSnapshot {
  mission: { id?: string; title: string; prompt?: string };
  observability: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs: number;
    toolCallsCount: number;
    riskFlags: string[];
  };
  toolCalls: Array<{
    name: string;
    description?: string;
    durationMs?: number;
    status: string;
  }>;
  phases: Array<{ phase: string; status: string }>;
  result: {
    title: string;
    summary: string;
    recommendations: string[];
  };
}

/**
 * Judge invocation modes.
 *
 * - `sample_replay` — the original V0–V3 path: the user replays the
 *   bundled trace, the snapshot is built from the streamed events, and
 *   Gemini is asked to audit it.
 * - `scenario_trace` — one of the pre-canned trace scenarios is selected
 *   (`scenarioId`). The route uses the bundled trace text + snapshot for
 *   that scenario as the audit evidence. The user never types anything.
 * - `pasted_trace` — the user pasted their own free-form agent trace.
 *   The text is sanitized server-side, length-clamped, and audited as-is.
 * - `remediation_simulation` — second pass on top of any of the above.
 *   The original trace is re-judged *as if* the listed `guardrails` were
 *   already implemented in production. The verdict and residual risks
 *   may change, but Gemini is asked to remain evidence-based and to
 *   keep residual risks where appropriate.
 */
export type JudgeMode =
  | "sample_replay"
  | "scenario_trace"
  | "pasted_trace"
  | "remediation_simulation";

export interface JudgeRequestBody {
  /**
   * Optional explicit mode. When omitted the route falls back to
   * `sample_replay` for backward compatibility with V3 clients that
   * only sent `runSnapshot` + `mission`.
   */
  mode?: JudgeMode;
  /** Required for `scenario_trace`. Optional for `remediation_simulation`. */
  scenarioId?: string;
  /** Free-form pasted trace. Required for `pasted_trace`. */
  traceText?: string;
  /** Snapshot built from the visible run state. Used by `sample_replay`. */
  runSnapshot?: JudgeRunSnapshot;
  /** Mission override for `sample_replay`. Capped server-side. */
  mission?: string;
  /** Selected guardrails for `remediation_simulation`. Capped server-side. */
  guardrails?: string[];
}

export interface JudgeErrorResponse {
  ok: false;
  code:
    | "GEMINI_NOT_CONFIGURED"
    | "GEMINI_REQUEST_FAILED"
    | "GEMINI_INVALID_RESPONSE"
    | "INVALID_REQUEST"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message?: string;
  /**
   * Optional non-sensitive diagnostic payload. Surfaced only when the upstream
   * model returned an unparseable answer, so operators can tell apart "model
   * hit MAX_TOKENS", "model hit a SAFETY filter", or "model returned prose
   * around the JSON". Never contains the API key or the full prompt.
   */
  debug?: {
    finishReason?: string;
    promptTokens?: number;
    candidatesTokens?: number;
    thoughtsTokens?: number;
    totalTokens?: number;
    rawHead?: string;
    rawTail?: string;
    rawLength?: number;
  };
}

/**
 * Best-effort normalization of a Gemini response into a `GeminiJudgeResult`.
 *
 * Gemini sometimes returns extra prose around the JSON, or omits an optional
 * field. We strip wrapping fences, parse the largest JSON object, then clamp
 * each field to a safe value. The function returns `null` only when no JSON
 * object can be recovered at all — the route then emits a structured error.
 */
export function normalizeJudgeResult(
  raw: string,
  model: string,
): GeminiJudgeResult | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  const candidate = json as Record<string, unknown>;

  return {
    provider: "Google",
    model,
    readinessScore: clampScore(candidate.readinessScore),
    verdict: coerceVerdict(candidate.verdict),
    summary: coerceString(candidate.summary, "No summary returned by Gemini."),
    risks: coerceRisks(candidate.risks),
    costAssessment: coerceString(candidate.costAssessment, ""),
    toolSafetyAssessment: coerceString(candidate.toolSafetyAssessment, ""),
    observabilityAssessment: coerceString(candidate.observabilityAssessment, ""),
    missingEvidence: coerceStringArray(candidate.missingEvidence),
    remediationPlan: coerceStringArray(candidate.remediationPlan),
    executiveDecision: coerceString(candidate.executiveDecision, ""),
    businessValue: coerceString(candidate.businessValue, ""),
  };
}

/**
 * Find the first balanced JSON object inside an arbitrary string. Tolerates
 * wrapping ```json fences, leading prose, and trailing commentary.
 */
export function extractJsonObject(input: string): unknown | null {
  // Strip common code fences first to give JSON.parse a clean shot.
  const stripped = input
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/```[\s\S]*$/i, "")
    .trim();

  for (const candidate of [stripped, input]) {
    const start = candidate.indexOf("{");
    if (start === -1) continue;

    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const slice = candidate.slice(start, i + 1);
          try {
            return JSON.parse(slice) as unknown;
          } catch {
            // Try the next candidate (e.g. raw input) before giving up.
            break;
          }
        }
      }
    }
  }
  return null;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Accept either 0–1 (Gemini sometimes returns floats) or 0–100 (the
  // documented contract). Always normalize to 0–100 integer.
  const scaled = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function coerceVerdict(value: unknown): GeminiVerdict {
  if (typeof value === "string" && VALID_VERDICTS.has(value as GeminiVerdict)) {
    return value as GeminiVerdict;
  }
  return "needs_review";
}

function coerceString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().slice(0, 4_000);
  }
  return fallback;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

function coerceRisks(value: unknown): GeminiRisk[] {
  if (!Array.isArray(value)) return [];
  const risks: GeminiRisk[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const severity =
      typeof r.severity === "string" &&
      VALID_SEVERITIES.has(r.severity as GeminiRiskSeverity)
        ? (r.severity as GeminiRiskSeverity)
        : "medium";
    const category =
      typeof r.category === "string" &&
      VALID_CATEGORIES.has(r.category as GeminiRiskCategory)
        ? (r.category as GeminiRiskCategory)
        : "governance";
    const finding = coerceString(r.finding, "");
    const evidence = coerceString(r.evidence, "");
    if (finding.length === 0) continue;
    risks.push({ severity, category, finding, evidence });
    if (risks.length >= 12) break;
  }
  return risks;
}
