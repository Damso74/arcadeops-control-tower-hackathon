"use client";

/**
 * UX V2.2 §7 — Selected Run Summary card.
 *
 * Core of the cockpit. Appears as soon as a scenario is selected and
 * BEFORE the user has launched Gemini. Hosts:
 *   - Selected run title + risk level + expected decision badge
 *   - 3 key findings (top risks for unsafe, top assurances for safe)
 *   - Compact metrics ribbon (cost, tokens, tools, flags)
 *   - <GateStatus /> reflecting the current verdict (or awaiting)
 *   - Primary CTA "Run Gemini Production Gate" (or "Re-run gate" once
 *     a verdict has landed)
 *   - Optional <AgentPipelineDiagram /> below the metrics
 *
 * Pure presentational layer — the parent owns the request body, the
 * loading state, and the runJudge handler. We forward the click and
 * surface the visual states only.
 */
import {
  AlertTriangle,
  ClipboardPaste,
  Coins,
  DollarSign,
  ListChecks,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type {
  GeminiJudgeResult,
  GeminiVerdict,
} from "@/lib/control-tower/gemini-types";
import type { TraceScenario } from "@/lib/control-tower/scenarios";

import { AgentPipelineDiagram } from "./AgentPipelineDiagram";
import { GateStatus } from "./GateStatus";

export type SummaryMode = "scenario" | "pasted" | "replay";

interface SelectedRunSummaryCardProps {
  /** Active mode driving the summary content. */
  mode: SummaryMode;
  /** Scenario instance when mode === "scenario", null otherwise. */
  scenario: TraceScenario | null;
  /** Latest verdict, when present — drives Gate Status + CTA label. */
  verdict: GeminiJudgeResult | null;
  /** True while a Gemini judge call is in flight (button disabled + label change). */
  busy: boolean;
  /** Whether the parent has a valid request body — disables the CTA when false. */
  ctaEnabled: boolean;
  /** Click handler for the primary CTA. */
  onRunGate: () => void;
  /** Hint to display when CTA is disabled (no scenario / empty paste / no replay). */
  emptyHint: string | null;
}

export function SelectedRunSummaryCard({
  mode,
  scenario,
  verdict,
  busy,
  ctaEnabled,
  onRunGate,
  emptyHint,
}: SelectedRunSummaryCardProps) {
  const verdictLabel = verdict?.verdict ?? null;
  const isAwaiting = verdictLabel === null;

  // Decide CTA copy. The page question is "Can this AI agent touch
  // production?" so the CTA must be the answer-action: audit this run.
  let ctaLabel: string;
  if (busy) {
    ctaLabel = "Auditing run…";
  } else if (verdictLabel) {
    ctaLabel = "Audit again";
  } else {
    ctaLabel = "Audit this run";
  }

  // Compose summary text per mode.
  const heading = headingFor(mode, scenario);
  const subtitle = subtitleFor(mode, scenario);
  const expectedBadge = expectedBadgeFor(mode, scenario);
  const findings = findingsFor(mode, scenario);
  const findingsTitle = findingsTitleFor(mode, scenario);
  const metrics = metricsFor(mode, scenario);

  return (
    <section
      aria-label="Selected run summary"
      className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.04] via-zinc-950/40 to-zinc-950/40 p-5 sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            <Sparkles className="h-3 w-3" aria-hidden />
            Run preview
          </span>
          {expectedBadge ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${expectedBadge.classes}`}
            >
              <expectedBadge.Icon className="h-3 w-3" aria-hidden />
              {expectedBadge.label}
            </span>
          ) : null}
        </div>
        <h2 className="text-balance text-lg font-semibold text-zinc-50 sm:text-xl">
          {heading}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">
          {subtitle}
        </p>
      </header>

      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          {/* Top findings — drive the wow narrative. */}
          {findings.length > 0 ? (
            <section
              aria-label={findingsTitle}
              className="flex flex-col gap-2"
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {findingsTitle}
              </h3>
              <ol className="flex flex-col gap-1.5">
                {findings.map((finding, idx) => (
                  <li
                    key={`${finding.tone}-${idx}`}
                    className="flex items-start gap-2 text-sm leading-snug text-zinc-200"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full font-mono text-[10px] font-semibold ${findingPalette(finding.tone)}`}
                    >
                      {idx + 1}
                    </span>
                    <span>{finding.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Metrics ribbon. */}
          <section
            aria-label="Run metrics"
            className="flex flex-wrap items-stretch gap-2"
          >
            {metrics.map((metric) => (
              <Metric key={metric.label} metric={metric} />
            ))}
          </section>

          {/* Pipeline only useful for canonical scenarios — kept compact. */}
          {mode === "scenario" ? (
            <AgentPipelineDiagram scenario={scenario} />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:max-w-[280px]">
          <GateStatus verdict={verdictLabel} size="hero" />
          <button
            type="button"
            data-testid="run-gemini-production-gate"
            onClick={onRunGate}
            disabled={busy || !ctaEnabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:bg-violet-500/40"
          >
            {busy ? (
              <Spinner />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {ctaLabel}
          </button>
          {!ctaEnabled && !busy && emptyHint ? (
            <p className="rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-[11px] leading-snug text-zinc-400">
              {emptyHint}
            </p>
          ) : null}
          {isAwaiting ? (
            <p className="text-[11px] leading-snug text-zinc-500">
              Run selected. Review the summary, then launch the Gemini
              production gate.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sub-components ---------- */

interface MetricItem {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning" | "danger" | "success";
}

function Metric({ metric }: { metric: MetricItem }) {
  const palette = (() => {
    switch (metric.tone) {
      case "danger":
        return "border-red-400/30 bg-red-400/[0.06] text-red-200";
      case "warning":
        return "border-amber-400/30 bg-amber-400/[0.06] text-amber-200";
      case "success":
        return "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200";
      case "neutral":
      default:
        return "border-white/10 bg-white/[0.03] text-zinc-200";
    }
  })();
  const Icon = metric.icon;
  return (
    <div
      className={`flex min-w-[110px] flex-col gap-0.5 rounded-md border px-3 py-2 ${palette}`}
    >
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        <Icon className="h-3 w-3" aria-hidden />
        {metric.label}
      </span>
      <span className="font-mono text-sm font-semibold text-zinc-50">
        {metric.value}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/* ---------- Content builders ---------- */

interface Finding {
  tone: "danger" | "warning" | "success" | "neutral";
  text: string;
}

function headingFor(mode: SummaryMode, scenario: TraceScenario | null): string {
  if (mode === "scenario" && scenario) {
    return `Selected run: ${scenario.title}`;
  }
  if (mode === "pasted") {
    return "Selected run: Pasted trace";
  }
  return "Selected run: Deterministic replay";
}

function subtitleFor(mode: SummaryMode, scenario: TraceScenario | null): string {
  if (mode === "scenario" && scenario) {
    return scenario.shortDescription;
  }
  if (mode === "pasted") {
    return "Drop logs, JSON, MCP tool calls, or framework outputs below. Gemini will judge whether the run is production-ready.";
  }
  return "Stream the bundled deterministic SSE trace, then let Gemini judge the run.";
}

function expectedBadgeFor(
  mode: SummaryMode,
  scenario: TraceScenario | null,
): { Icon: LucideIcon; label: string; classes: string } | null {
  if (mode !== "scenario" || !scenario) return null;
  const verdict: GeminiVerdict = scenario.expectedVerdict;
  switch (verdict) {
    case "blocked":
      return {
        Icon: ShieldAlert,
        label: "Expected decision: Block",
        classes: "bg-red-500/15 text-red-200",
      };
    case "needs_review":
      return {
        Icon: AlertTriangle,
        label: "Expected decision: Review",
        classes: "bg-amber-500/15 text-amber-200",
      };
    case "ready":
    default:
      return {
        Icon: ShieldCheck,
        label: "Expected decision: Ship",
        classes: "bg-emerald-500/15 text-emerald-200",
      };
  }
}

function findingsTitleFor(
  mode: SummaryMode,
  scenario: TraceScenario | null,
): string {
  if (mode === "scenario" && scenario) {
    if (scenario.expectedVerdict === "ready") return "Top 3 assurances";
    if (scenario.expectedVerdict === "needs_review") return "Top 3 review items";
    return "Top 3 risks";
  }
  if (mode === "pasted") return "What Gemini will look for";
  return "What Gemini will look for";
}

function findingsFor(
  mode: SummaryMode,
  scenario: TraceScenario | null,
): readonly Finding[] {
  if (mode === "scenario" && scenario) {
    return SCENARIO_FINDINGS[scenario.id] ?? [];
  }
  if (mode === "pasted") {
    return [
      { tone: "warning", text: "Destructive writes attempted without approval." },
      { tone: "warning", text: "Outbound messages sent without human review." },
      { tone: "warning", text: "Audit / replay evidence missing for the run." },
    ];
  }
  return [
    {
      tone: "success",
      text: "Read-only tool calls, audit trail persisted end-to-end.",
    },
    { tone: "success", text: "Cost stays under the configured budget." },
    {
      tone: "success",
      text: "Replay-ready snapshot — reproducible across runs.",
    },
  ];
}

function metricsFor(
  mode: SummaryMode,
  scenario: TraceScenario | null,
): readonly MetricItem[] {
  if (mode === "scenario" && scenario) {
    const obs = scenario.snapshot.observability;
    const flagsCount = obs.riskFlags.length;
    return [
      {
        label: "Cost",
        value: formatUsd(obs.costUsd),
        icon: DollarSign,
      },
      {
        label: "Tokens",
        value: formatNumber(obs.totalTokens),
        icon: Coins,
      },
      {
        label: "Tools",
        value: String(obs.toolCallsCount),
        icon: Wrench,
      },
      {
        label: "Flags",
        value: String(flagsCount),
        icon: ShieldAlert,
        tone:
          flagsCount === 0 ? "success" : flagsCount <= 2 ? "warning" : "danger",
      },
    ];
  }
  if (mode === "pasted") {
    return [
      {
        label: "Mode",
        value: "Free-form trace",
        icon: ClipboardPaste,
      },
      {
        label: "Limit",
        value: "12k chars",
        icon: ListChecks,
      },
    ];
  }
  return [
    {
      label: "Mode",
      value: "Deterministic SSE",
      icon: ListChecks,
    },
  ];
}

function findingPalette(tone: Finding["tone"]): string {
  switch (tone) {
    case "danger":
      return "bg-red-500/20 text-red-200";
    case "warning":
      return "bg-amber-500/20 text-amber-200";
    case "success":
      return "bg-emerald-500/20 text-emerald-200";
    case "neutral":
    default:
      return "bg-white/10 text-zinc-300";
  }
}

const SCENARIO_FINDINGS: Record<string, readonly Finding[]> = {
  multi_agent_escalation: [
    {
      tone: "danger",
      text: "CRM update attempted without human approval.",
    },
    {
      tone: "danger",
      text: "Outbound customer email attempted without human review.",
    },
    {
      tone: "warning",
      text: "Missing replay / audit evidence on multi-agent handoffs.",
    },
  ],
  blocked_crm_write_agent: [
    {
      tone: "danger",
      text: "Bulk CRM delete attempted without approval gate.",
    },
    {
      tone: "danger",
      text: "38 customer emails sent without human review.",
    },
    {
      tone: "warning",
      text: "Token budget exceeded — no replay or audit log persisted.",
    },
  ],
  needs_review_support_agent: [
    {
      tone: "warning",
      text: "Reply drafted without a confidence threshold.",
    },
    {
      tone: "warning",
      text: "External web sources used with no freshness check.",
    },
    {
      tone: "warning",
      text: "Replay evidence partial — escalation rule missing.",
    },
  ],
  ready_research_agent: [
    {
      tone: "success",
      text: "Read-only web research only, no destructive writes.",
    },
    {
      tone: "success",
      text: "Complete audit trail persisted (replay-ready).",
    },
    {
      tone: "success",
      text: "Cost stayed under the configured budget.",
    },
  ],
};

/* ---------- formatting helpers ---------- */

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}
