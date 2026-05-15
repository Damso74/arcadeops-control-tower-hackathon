/**
 * Deterministic fallback verdict.
 *
 * Used when the live Gemini API call fails (HTTP 429 / 503 / timeout /
 * network error). The product brief is explicit:
 *
 *   "Never display raw API errors in the main flow. Use the deterministic
 *    replay fixture as a kill-switch and surface a clean banner."
 *
 * For canonical scenarios we already know the *expected* verdict, so the
 * fallback returns that exact verdict with a short, honest explanation
 * that this is a replay (not a fresh Gemini call). For the pasted-trace
 * mode we cannot guess what the user pasted, so we return a neutral
 * "needs_review" verdict that asks the user to retry the live audit.
 *
 * The fallback only ever runs client-side. The shape mirrors the strict
 * `GeminiJudgeResult` contract so the rest of the verdict / score / tabs
 * UI keeps working without conditional branches.
 */
import type {
  GeminiJudgeResult,
  GeminiRisk,
  GeminiVerdict,
} from "./gemini-types";
import type { TraceScenario } from "./scenarios";

const FALLBACK_PROVIDER: GeminiJudgeResult["provider"] = "Google";
const FALLBACK_MODEL = "deterministic-replay";

interface FallbackInput {
  /** Optional canonical scenario the user picked. Drives the verdict. */
  scenario?: TraceScenario | null;
  /**
   * Source mode the run came from. We surface a slightly different copy
   * for pasted traces (we can't know the right verdict) vs scenarios.
   */
  mode: "scenario" | "pasted" | "replay";
  /** Underlying error code/message — only surfaced in technical proof. */
  upstreamMessage?: string;
}

/**
 * Build a deterministic, well-formed Gemini judge result that the UI
 * can render without any conditional branches. The returned verdict
 * follows scenario.expectedVerdict when available, otherwise defaults
 * to `needs_review` so a reviewer is asked to look more closely.
 */
export function buildFallbackVerdict(input: FallbackInput): GeminiJudgeResult {
  const { scenario, mode, upstreamMessage } = input;
  const verdict: GeminiVerdict = scenario?.expectedVerdict ?? "needs_review";

  const baseSummary = scenarioSummary(verdict, scenario, mode);
  const replayNote = upstreamMessage
    ? `Live Gemini call failed: ${upstreamMessage}. Replay fallback used.`
    : "Live Gemini call unavailable. Replay fallback used.";

  return {
    provider: FALLBACK_PROVIDER,
    model: FALLBACK_MODEL,
    readinessScore: scoreForVerdict(verdict),
    verdict,
    summary: `${baseSummary} ${replayNote}`,
    risks: risksForVerdict(verdict, scenario),
    costAssessment: scenario
      ? `Run consumed roughly $${scenario.snapshot.observability.costUsd.toFixed(3)} on ${scenario.snapshot.observability.provider} / ${scenario.snapshot.observability.model}.`
      : "Cost data unavailable in replay fallback.",
    toolSafetyAssessment: toolSafetyFor(verdict),
    observabilityAssessment:
      "Replay fallback uses the bundled deterministic trace — observability values come from the original run, not from a fresh Gemini analysis.",
    missingEvidence: missingEvidenceFor(verdict),
    remediationPlan: remediationFor(verdict, scenario),
    executiveDecision: nextActionFor(verdict),
    businessValue: businessValueFor(verdict),
    policyGate: undefined,
  };
}

function scoreForVerdict(verdict: GeminiVerdict): number {
  switch (verdict) {
    case "blocked":
      return 18;
    case "needs_review":
      return 52;
    case "ready":
    default:
      return 86;
  }
}

function scenarioSummary(
  _verdict: GeminiVerdict,
  scenario: TraceScenario | null | undefined,
  mode: "scenario" | "pasted" | "replay",
): string {
  if (scenario) {
    return `Replay verdict for "${scenario.title}".`;
  }
  if (mode === "pasted") {
    return "We could not run a live audit on the pasted run log.";
  }
  return "Replay verdict for the bundled deterministic run.";
}

function risksForVerdict(
  verdict: GeminiVerdict,
  scenario: TraceScenario | null | undefined,
): GeminiRisk[] {
  if (verdict === "blocked") {
    return [
      {
        severity: "high",
        category: "tool_safety",
        finding: "Destructive tool call without human approval.",
        evidence:
          scenario?.snapshot.toolCalls
            .map((t) => t.name)
            .slice(0, 3)
            .join(", ") ?? "Replay trace shows write-class tools.",
      },
      {
        severity: "high",
        category: "governance",
        finding: "Outbound message would reach a real customer.",
        evidence: "No human review checkpoint detected before send.",
      },
      {
        severity: "medium",
        category: "observability",
        finding: "Audit evidence is missing for destructive actions.",
        evidence: "No persisted audit log entry for write events.",
      },
    ];
  }
  if (verdict === "needs_review") {
    return [
      {
        severity: "medium",
        category: "governance",
        finding: "Run should be reviewed by a human before production use.",
        evidence:
          "Replay fallback cannot inspect the run live — apply human review until the live audit is back.",
      },
    ];
  }
  return [
    {
      severity: "low",
      category: "observability",
      finding: "Read-only run with audit trail — safe to ship with monitoring.",
      evidence: "Tool calls limited to read scopes in the bundled replay.",
    },
  ];
}

function toolSafetyFor(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "Destructive write tools were attempted without an approval checkpoint.";
    case "needs_review":
      return "Tool usage is borderline — apply human review before production.";
    case "ready":
    default:
      return "Tool calls stayed read-only; no destructive scope was reached.";
  }
}

function missingEvidenceFor(verdict: GeminiVerdict): string[] {
  if (verdict === "blocked") {
    return [
      "Approval ticket linked to the write-class tool call.",
      "Persisted audit log for destructive actions.",
    ];
  }
  if (verdict === "needs_review") {
    return ["Confirmation that a human reviewed the outbound message."];
  }
  return [];
}

function remediationFor(
  verdict: GeminiVerdict,
  scenario: TraceScenario | null | undefined,
): string[] {
  if (scenario && scenario.recommendedGuardrails.length > 0) {
    return scenario.recommendedGuardrails.slice(0, 4) as string[];
  }
  if (verdict === "blocked") {
    return [
      "Add human approval before destructive tools.",
      "Persist an audit log entry for every write call.",
      "Block outbound messages until a human reviewer approves them.",
    ];
  }
  if (verdict === "needs_review") {
    return [
      "Add a human review step before this run is allowed in production.",
    ];
  }
  return ["Ship with monitoring — no remediation required."];
}

function nextActionFor(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "Add approval and audit evidence, then re-score.";
    case "needs_review":
      return "Have a human reviewer approve the outbound action, then re-score.";
    case "ready":
    default:
      return "Ship with monitoring.";
  }
}

function businessValueFor(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "Prevented unsafe CRM write and customer email before production.";
    case "needs_review":
      return "Paused the run until a human approves the risky action.";
    case "ready":
    default:
      return "Approved a read-only agent run with complete audit evidence.";
  }
}
