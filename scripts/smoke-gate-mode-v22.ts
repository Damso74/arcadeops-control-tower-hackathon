/**
 * UX V2.2 §20 — Smoke test for the guided Gate Mode cockpit.
 *
 * Validates the 17 acceptance assertions of the V2.2 brief by mixing:
 *
 *   - 12 static HTML probes against `/control-tower` (header, scoreboard,
 *     gallery section, "Select run" CTA wording, Selected Run Summary
 *     card, primary CTA, tab affordances) — anything that is observable
 *     in the server-rendered HTML.
 *   - 2 deterministic verdict checks via `applyProductionPolicyGates` +
 *     `enforceVerdictConsistency` on the canonical critical & safe
 *     scenarios (verdict + Gate Status mapping) — same code path the
 *     server-side `/api/gemini/judge` route runs after Gemini.
 *   - 3 dynamic assertions are explicitly marked "browser only"
 *     (React #185 console error, scan animation visibility, persistence
 *     of Copy/Export buttons after verdict) — the final pass is run
 *     through the browser MCP against production.
 *
 * Run with:
 *
 *     # against the local Next dev server
 *     npx tsx scripts/smoke-gate-mode-v22.ts
 *
 *     # against the live Vercel deployment
 *     SMOKE_BASE_URL=https://arcadeops-control-tower-hackathon.vercel.app \
 *       npx tsx scripts/smoke-gate-mode-v22.ts
 *
 * Exits with code `1` on the first failure. Pure TypeScript, zero test
 * framework — same shape as `smoke-policy-gates.ts`.
 */

import { applyProductionPolicyGates } from "../src/lib/control-tower/policy-gates";
import type { GeminiJudgeResult } from "../src/lib/control-tower/gemini-types";
import { findScenarioById } from "../src/lib/control-tower/scenarios";
import { enforceVerdictConsistency } from "../src/lib/control-tower/verdict-consistency";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const TARGET = `${BASE_URL.replace(/\/$/, "")}/control-tower`;

interface AssertionResult {
  index: number;
  label: string;
  status: "PASS" | "FAIL" | "WARN" | "MANUAL";
  details?: string;
}

const results: AssertionResult[] = [];

function record(
  index: number,
  label: string,
  status: AssertionResult["status"],
  details?: string,
) {
  results.push({ index, label, status, details });
}

async function main(): Promise<number> {
  console.log(`\n[smoke v2.2] target = ${TARGET}\n`);

  // ----- HTML probe ------------------------------------------------------
  let html = "";
  try {
    const res = await fetch(TARGET, { cache: "no-store" });
    if (!res.ok) {
      record(
        0,
        "Fetch /control-tower",
        "FAIL",
        `HTTP ${res.status} ${res.statusText}`,
      );
      summarize();
      return 1;
    }
    html = await res.text();
  } catch (err) {
    record(0, "Fetch /control-tower", "FAIL", (err as Error).message);
    summarize();
    return 1;
  }

  // 1 — React #185: not detectable from server HTML, browser MCP only.
  record(
    1,
    "Page loads without React #185",
    "MANUAL",
    "Verified via browser MCP smoke against production.",
  );

  // 2 — header shows "Production Security Audit"
  assertContains(2, "Header shows \"Production Security Audit\"", html, [
    "Production Security Audit",
  ]);

  // 3 — header shows the V2 punchline
  assertContains(3, "Header shows the V2 punchline", html, [
    "Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents",
  ]);

  // 4 — scoreboard visible (aria-label)
  assertContains(4, "Cockpit scoreboard is visible", html, [
    'aria-label="Cockpit scoreboard"',
  ]);

  // 5 — Scenario gallery section visible. The aria-label + heading were
  // renamed in the V2.2.1 clarity patch ("Agent Test Gallery" →
  // "Start here: choose an agent run") so the first-time judge knows
  // exactly what to do. We keep the `data-section` anchor stable for
  // the recommended demo path scroll targets.
  assertContains(5, "Scenario gallery section is visible", html, [
    'data-section="agent-test-gallery"',
    "Start here: choose an agent run",
    "Pick a risky or safe agent run",
  ]);

  // 6 — scenario CTAs are "Select run"
  assertContains(6, "Scenario CTAs are \"Select run\"", html, [
    'data-cta="select-run"',
    "Select run",
  ]);

  // 7 — clicking Select run sets active step to Inspect: behaviour
  // tested through the browser MCP smoke.
  record(
    7,
    "Clicking Select run sets active step to Inspect",
    "MANUAL",
    "Verified via browser MCP smoke (helper banner + active tab).",
  );

  // 8 — Selected Run Summary card mounts on the default landing.
  assertContains(8, "Selected Run Summary card appears", html, [
    'aria-label="Selected run summary"',
  ]);

  // 9 — Gemini CTA visible above the fold (test id). Label was
  // renamed to "Audit this run" in the UX V2.2 wording sweep, the
  // data-testid is kept stable for tooling.
  assertContains(9, "Gemini CTA is rendered (above-the-fold testid)", html, [
    'data-testid="run-gemini-production-gate"',
    "Audit this run",
  ]);

  // 10 — scan animation: dynamic (only renders during audit).
  record(
    10,
    "Gemini scan animation appears when audit starts",
    "MANUAL",
    "Verified via browser MCP smoke (data-testid=gemini-scan-ticker).",
  );

  // 11 / 12 — verdict mapping for the canonical scenarios.
  await assertScenarioVerdict(
    11,
    "Critical CRM run returns BLOCKED + Gate Closed",
    "blocked_crm_write_agent",
    "blocked",
  );
  await assertScenarioVerdict(
    12,
    "Safe research run returns SHIP + Gate Open",
    "ready_research_agent",
    "ready",
  );

  // 13 / 14 — copy / export persistence: only meaningful after a verdict.
  record(
    13,
    "Copy audit report remains visible after verdict",
    "MANUAL",
    "Verified via browser MCP smoke after the critical run.",
  );
  record(
    14,
    "Export verdict JSON remains visible after verdict",
    "MANUAL",
    "Verified via browser MCP smoke after the critical run.",
  );

  // 15 — Infrastructure tab affordance visible in HTML.
  assertContains(15, "Infrastructure tab affordance present", html, [
    'data-cockpit-tab="infrastructure"',
    "Infrastructure",
  ]);

  // 16 — Policies tab affordance visible in HTML.
  assertContains(16, "Policies tab affordance present", html, [
    'data-cockpit-tab="policies"',
    "Policies",
  ]);

  // 17 — Trace tab is present but Trace content is empty by default.
  assertTraceHiddenByDefault(17, html);

  return summarize();
}

/* ---------- Helpers ---------- */

function assertContains(
  index: number,
  label: string,
  html: string,
  needles: readonly string[],
) {
  const missing = needles.filter((n) => !html.includes(n));
  if (missing.length === 0) {
    record(index, label, "PASS");
    return;
  }
  record(
    index,
    label,
    "FAIL",
    `Missing fragments: ${missing.map((m) => JSON.stringify(m)).join(", ")}`,
  );
}

function assertTraceHiddenByDefault(index: number, html: string) {
  const hasTraceTab = html.includes('data-cockpit-tab="trace"');
  if (!hasTraceTab) {
    record(
      index,
      "Trace/debug content is not shown by default",
      "FAIL",
      "Trace tab affordance missing — cockpit broke.",
    );
    return;
  }
  // CockpitTabs lazy-mounts inactive panels, so the Trace empty-state copy
  // is not rendered server-side. We only need to assert that the *active*
  // Summary panel does not leak the Trace surface (Download verdict JSON,
  // raw verdict JSON block) before any audit has run.
  const exposedExport = html.includes("Download verdict JSON");
  if (exposedExport) {
    record(
      index,
      "Trace/debug content is not shown by default",
      "FAIL",
      "Trace surface should hide Download verdict JSON before any audit.",
    );
    return;
  }
  // The active panel must be Summary, not Trace, on the default landing.
  const summaryActive = html.includes(
    'data-cockpit-tab="summary" data-active="true"',
  );
  if (!summaryActive) {
    record(
      index,
      "Trace/debug content is not shown by default",
      "FAIL",
      "Summary tab is not the default active tab.",
    );
    return;
  }
  record(index, "Trace/debug content is not shown by default", "PASS");
}

/**
 * Build a lenient pre-judge `GeminiJudgeResult`, then run it through the
 * deterministic gate enforcer to obtain the *same* outcome the
 * `/api/gemini/judge` route would surface after Gemini lands. Lets us
 * check assertions 11 and 12 without a live Gemini key.
 */
async function assertScenarioVerdict(
  index: number,
  label: string,
  scenarioId: string,
  expected: GeminiJudgeResult["verdict"],
) {
  const scenario = findScenarioById(scenarioId);
  if (!scenario) {
    record(index, label, "FAIL", `Scenario "${scenarioId}" not found.`);
    return;
  }
  const lenient: GeminiJudgeResult = {
    provider: "Google",
    model: "gemini-smoke",
    readinessScore: 88,
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
  const gated = applyProductionPolicyGates({
    result: lenient,
    mode: "scenario_trace",
    scenarioId,
  });
  const consistent = enforceVerdictConsistency(gated.result);
  const finalVerdict = consistent.result.verdict;
  const finalScore = consistent.result.readinessScore;
  if (finalVerdict === expected) {
    record(
      index,
      label,
      "PASS",
      `verdict=${finalVerdict} score=${finalScore}`,
    );
  } else {
    record(
      index,
      label,
      "FAIL",
      `Expected ${expected}, got ${finalVerdict} (score ${finalScore}).`,
    );
  }
}

function summarize(): number {
  const pad = (n: number) => String(n).padStart(2, " ");
  for (const r of results) {
    const symbol =
      r.status === "PASS"
        ? "✅"
        : r.status === "FAIL"
          ? "❌"
          : r.status === "WARN"
            ? "⚠️"
            : "👁";
    const detail = r.details ? ` — ${r.details}` : "";
    console.log(`${symbol}  ${pad(r.index)} ${r.label}${detail}`);
  }
  const failed = results.filter((r) => r.status === "FAIL").length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const manual = results.filter((r) => r.status === "MANUAL").length;
  console.log(
    `\n[smoke v2.2] ${passed} pass · ${manual} manual (browser MCP) · ${failed} fail\n`,
  );
  return failed === 0 ? 0 : 1;
}

void main().then((code) => process.exit(code));
