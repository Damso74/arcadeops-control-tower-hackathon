/**
 * Smoke test for the deterministic production policy gate pipeline.
 *
 * Plan maître §7 — filet de sécurité before touching the engine in
 * Lot 2b. Runs `applyProductionPolicyGates` + `enforceVerdictConsistency`
 * on the 4 packaged scenarios + 1 minimal pasted trace and verifies the
 * verdict / score / fired-rules invariants documented in the master plan
 * (`HACKATHON_100_MASTER_PLAN.md` §7 table T1-T5).
 *
 * Pure TypeScript, zero framework, exits with code `1` on the first
 * failure. Run with:
 *
 *     npx tsx scripts/smoke-policy-gates.ts
 *
 * Expected output: 5 cases, 0 failure. Any non-zero exit means do not
 * merge the next engine change.
 */

import {
  applyProductionPolicyGates,
  type PolicyGateRule,
} from "../src/lib/control-tower/policy-gates";
import type {
  GeminiJudgeResult,
  JudgeMode,
} from "../src/lib/control-tower/gemini-types";
import {
  findScenarioById,
  TRACE_SCENARIOS,
} from "../src/lib/control-tower/scenarios";
import { enforceVerdictConsistency } from "../src/lib/control-tower/verdict-consistency";

interface SmokeCase {
  id: string;
  label: string;
  scenarioId?: string;
  pastedTrace?: string;
  mode: JudgeMode;
  expect: {
    verdict: GeminiJudgeResult["verdict"] | GeminiJudgeResult["verdict"][];
    /** Inclusive max score after gating + consistency enforcement. */
    scoreMax?: number;
    /** Inclusive min score after gating + consistency enforcement. */
    scoreMin?: number;
    /** Required rule ids — every one of these must fire. */
    requireRules?: readonly string[];
    /** Forbidden rule ids — none of these may fire. */
    forbidRules?: readonly string[];
    /** Minimum number of fired rules. */
    minRules?: number;
    /** Maximum number of fired rules. */
    maxRules?: number;
  };
}

/**
 * Build a neutral Gemini result so the smoke isolates the contribution
 * of the deterministic engine. Verdict starts at `ready` with a high
 * score and zero risks — any tightening must come from the policy
 * gate + consistency enforcer.
 */
function neutralResult(): GeminiJudgeResult {
  return {
    provider: "Google",
    model: "gemini-smoke",
    readinessScore: 90,
    verdict: "ready",
    summary: "",
    risks: [],
    costAssessment: "",
    toolSafetyAssessment: "",
    observabilityAssessment: "",
    missingEvidence: [],
    remediationPlan: [],
    executiveDecision: "Ship with monitoring.",
    businessValue: "",
  };
}

const CASES: readonly SmokeCase[] = [
  {
    id: "T1",
    label: "Multi-agent escalation",
    scenarioId: "multi_agent_escalation",
    mode: "scenario_trace",
    expect: {
      verdict: "blocked",
      scoreMax: 45,
      // Lot 2b — `require_replay_id` is the new 5th rule. Both critical
      // scenarios are hard-wired in `RULES[].scenarioIds` for it.
      requireRules: [
        "destructive_without_approval",
        "outbound_without_review",
        "write_without_audit_or_replay",
        "require_replay_id",
      ],
      minRules: 4,
    },
  },
  {
    id: "T2",
    label: "Blocked CRM write agent",
    scenarioId: "blocked_crm_write_agent",
    mode: "scenario_trace",
    expect: {
      verdict: "blocked",
      scoreMax: 45,
      requireRules: [
        "destructive_without_approval",
        "outbound_without_review",
        "write_without_audit_or_replay",
        "require_replay_id",
      ],
      minRules: 4,
    },
  },
  {
    id: "T3",
    label: "Needs-review support agent",
    scenarioId: "needs_review_support_agent",
    mode: "scenario_trace",
    // Engine-only smoke: this scenario has no destructive/outbound
    // tokens, so the deterministic engine must NOT tighten a clean
    // Gemini result. The "needs_review" outcome documented in the
    // master plan T3 row is delivered by the live Gemini judgment,
    // not by the engine — and that path is covered by the manual
    // browser MCP smoke (out of scope for this script).
    expect: {
      verdict: "ready",
      scoreMin: 80,
      forbidRules: ["destructive_without_approval", "outbound_without_review"],
      maxRules: 0,
    },
  },
  {
    id: "T4",
    label: "Ready research agent",
    scenarioId: "ready_research_agent",
    mode: "scenario_trace",
    expect: {
      verdict: "ready",
      scoreMin: 80,
      maxRules: 0,
    },
  },
  {
    id: "T5",
    label: "Pasted trace minimal",
    pastedTrace:
      "Agent attempted to delete customer records without approval and emailed the team without review.",
    mode: "pasted_trace",
    expect: {
      verdict: ["needs_review", "blocked"],
      scoreMax: 79,
      minRules: 1,
    },
  },
];

interface CaseRun {
  caseId: string;
  label: string;
  finalVerdict: GeminiJudgeResult["verdict"];
  finalScore: number;
  firedRuleIds: string[];
  failures: string[];
}

function runCase(testCase: SmokeCase): CaseRun {
  const failures: string[] = [];

  let traceText: string | undefined = testCase.pastedTrace;
  if (testCase.scenarioId) {
    const scenario = findScenarioById(testCase.scenarioId);
    if (!scenario) {
      throw new Error(
        `[${testCase.id}] Scenario "${testCase.scenarioId}" not found in TRACE_SCENARIOS.`,
      );
    }
    traceText = scenario.traceText;
  }
  if (!traceText) {
    throw new Error(`[${testCase.id}] No traceText available.`);
  }

  const gated = applyProductionPolicyGates({
    result: neutralResult(),
    mode: testCase.mode,
    scenarioId: testCase.scenarioId,
    traceText,
  });
  const coherent = enforceVerdictConsistency(gated.result);
  const finalResult = coherent.result;
  const firedRuleIds = (gated.policyGate.rules ?? []).map(
    (r: PolicyGateRule) => r.id,
  );

  // Verdict assertion.
  const allowedVerdicts = Array.isArray(testCase.expect.verdict)
    ? testCase.expect.verdict
    : [testCase.expect.verdict];
  if (!allowedVerdicts.includes(finalResult.verdict)) {
    failures.push(
      `verdict ${finalResult.verdict} not in [${allowedVerdicts.join(", ")}]`,
    );
  }

  // Score bounds.
  if (
    typeof testCase.expect.scoreMax === "number" &&
    finalResult.readinessScore > testCase.expect.scoreMax
  ) {
    failures.push(
      `score ${finalResult.readinessScore} > scoreMax ${testCase.expect.scoreMax}`,
    );
  }
  if (
    typeof testCase.expect.scoreMin === "number" &&
    finalResult.readinessScore < testCase.expect.scoreMin
  ) {
    failures.push(
      `score ${finalResult.readinessScore} < scoreMin ${testCase.expect.scoreMin}`,
    );
  }

  // Rule expectations.
  for (const required of testCase.expect.requireRules ?? []) {
    if (!firedRuleIds.includes(required)) {
      failures.push(`missing required rule "${required}"`);
    }
  }
  for (const forbidden of testCase.expect.forbidRules ?? []) {
    if (firedRuleIds.includes(forbidden)) {
      failures.push(`forbidden rule "${forbidden}" fired`);
    }
  }
  if (
    typeof testCase.expect.minRules === "number" &&
    firedRuleIds.length < testCase.expect.minRules
  ) {
    failures.push(
      `fired ${firedRuleIds.length} rules, expected ≥ ${testCase.expect.minRules}`,
    );
  }
  if (
    typeof testCase.expect.maxRules === "number" &&
    firedRuleIds.length > testCase.expect.maxRules
  ) {
    failures.push(
      `fired ${firedRuleIds.length} rules, expected ≤ ${testCase.expect.maxRules}`,
    );
  }

  return {
    caseId: testCase.id,
    label: testCase.label,
    finalVerdict: finalResult.verdict,
    finalScore: finalResult.readinessScore,
    firedRuleIds,
    failures,
  };
}

function main(): void {
  // Sanity-check the scenario catalogue is intact before running.
  if (TRACE_SCENARIOS.length === 0) {
    console.error("[smoke-policy-gates] TRACE_SCENARIOS is empty.");
    process.exit(2);
  }

  const runs: CaseRun[] = [];
  for (const testCase of CASES) {
    try {
      runs.push(runCase(testCase));
    } catch (err) {
      runs.push({
        caseId: testCase.id,
        label: testCase.label,
        finalVerdict: "blocked",
        finalScore: 0,
        firedRuleIds: [],
        failures: [(err as Error).message],
      });
    }
  }

  console.log("\nsmoke-policy-gates — results");
  console.log("──────────────────────────────────────────────────────────────");
  for (const run of runs) {
    const status = run.failures.length === 0 ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${run.caseId.padEnd(3)} ${run.label.padEnd(32)} ` +
        `verdict=${run.finalVerdict.padEnd(13)} score=${String(run.finalScore).padStart(3)} ` +
        `rules=[${run.firedRuleIds.join(", ") || "—"}]`,
    );
    for (const f of run.failures) {
      console.log(`           ↳ ${f}`);
    }
  }
  console.log("──────────────────────────────────────────────────────────────");

  const failed = runs.filter((r) => r.failures.length > 0).length;
  if (failed > 0) {
    console.error(`\n${failed}/${runs.length} cases failed. Do not merge.`);
    process.exit(1);
  }
  console.log(`\n${runs.length}/${runs.length} cases passed.`);
}

main();
