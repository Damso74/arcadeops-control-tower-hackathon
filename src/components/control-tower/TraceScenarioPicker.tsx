"use client";

import {
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import type {
  ScenarioRiskLevel,
  TraceScenario,
} from "@/lib/control-tower/scenarios";

export type SelectableMode = "scenario" | "replay" | "pasted";

export interface ScenarioPickerSelection {
  mode: SelectableMode;
  scenarioId: string | null;
}

interface TraceScenarioPickerProps {
  scenarios: readonly TraceScenario[];
  selection: ScenarioPickerSelection;
  onSelect: (selection: ScenarioPickerSelection) => void;
  /** Disabled while a Gemini judge call is in flight. */
  disabled?: boolean;
  /**
   * Whether the deterministic SSE replay link should be exposed.
   * Gated server-side by `NEXT_PUBLIC_LIVE_VULTR === "1"` to keep the
   * picker focused on the 3 scenarios + paste in production demos.
   */
  showReplayLink?: boolean;
}

/**
 * "Choose a run" picker — V5 decision-first layout.
 *
 *   - One large hero card for the critical-risk scenario (the wow path).
 *   - Three compact cards: needs-review scenario, ready scenario, paste.
 *   - One quiet text link for the deterministic replay (back-compat path
 *     for video reproducibility, not the primary entry).
 *
 * The judge will run on whatever the user picks. The visual hierarchy
 * makes "Audit unsafe run" the obvious action a first-time judge will
 * take.
 */
export function TraceScenarioPicker({
  scenarios,
  selection,
  onSelect,
  disabled,
  showReplayLink = false,
}: TraceScenarioPickerProps) {
  const critical = scenarios.find((s) => s.riskLevel === "critical") ?? null;
  const others = scenarios.filter((s) => s.riskLevel !== "critical");

  return (
    <section
      aria-label="Start here: choose an agent run"
      data-section="agent-test-gallery"
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          Start here: pick an agent run
        </h2>
        <p className="text-sm text-zinc-300">
          Pick a risky run to see what gets blocked, a safe run to see what
          ships, or paste your own run log.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {critical ? (
          <CriticalScenarioCard
            scenario={critical}
            selected={
              selection.mode === "scenario" &&
              selection.scenarioId === critical.id
            }
            disabled={disabled}
            onSelect={() =>
              onSelect({ mode: "scenario", scenarioId: critical.id })
            }
          />
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {others.map((scenario) => {
            const isSelected =
              selection.mode === "scenario" &&
              selection.scenarioId === scenario.id;
            return (
              <SecondaryScenarioCard
                key={scenario.id}
                scenario={scenario}
                selected={isSelected}
                disabled={disabled}
                onSelect={() =>
                  onSelect({ mode: "scenario", scenarioId: scenario.id })
                }
              />
            );
          })}

          <PasteCard
            selected={selection.mode === "pasted"}
            disabled={disabled}
            onSelect={() => onSelect({ mode: "pasted", scenarioId: null })}
          />
        </div>

        {showReplayLink ? (
          <ReplayLink
            selected={selection.mode === "replay"}
            disabled={disabled}
            onSelect={() => onSelect({ mode: "replay", scenarioId: null })}
          />
        ) : null}
      </div>
    </section>
  );
}

interface CardProps {
  scenario: TraceScenario;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function CriticalScenarioCard({
  scenario,
  selected,
  disabled,
  onSelect,
}: CardProps) {
  const palette = riskPalette(scenario.riskLevel);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? `${palette.borderSelected} ${palette.bgSelected}`
          : `${palette.border} ${palette.bg} hover:border-red-400/60`,
        "ring-1 ring-red-400/30 sm:p-6",
      ].join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-red-500/10 blur-3xl"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${palette.badge}`}
          >
            <ShieldAlert className="h-3 w-3" aria-hidden />
            {palette.riskLabel}
          </span>
          {scenario.recommendedDemoPath ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/30">
              <Sparkles className="h-3 w-3" aria-hidden />
              Recommended demo path
            </span>
          ) : null}
          <span className="text-[10px] uppercase tracking-wider text-red-200/70">
            Expected decision: Block
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-xl font-semibold text-zinc-50 sm:text-2xl">
          {scenario.title}
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
          {scenario.shortDescription}
        </p>
      </div>

      <span
        aria-hidden
        data-cta="select-run"
        className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-colors group-hover:bg-red-400"
      >
        Select run
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

function SecondaryScenarioCard({
  scenario,
  selected,
  disabled,
  onSelect,
}: CardProps) {
  const palette = riskPalette(scenario.riskLevel);
  const description = secondaryDescription(scenario);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex h-full flex-col gap-2.5 rounded-xl border p-4 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? `${palette.borderSelected} ${palette.bgSelected}`
          : `${palette.border} ${palette.bg} hover:border-white/30`,
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${palette.badge}`}
        >
          {renderSecondaryIcon(scenario.riskLevel)}
          {palette.riskLabel}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-50">{scenario.title}</h3>
      <p className="text-xs leading-relaxed text-zinc-400">{description}</p>
      <span
        aria-hidden
        data-cta="select-run"
        className={`mt-auto inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${palette.cta}`}
      >
        {SECONDARY_CTA_LABEL}
        <ArrowRight className="h-3 w-3" aria-hidden />
      </span>
    </button>
  );
}

function PasteCard({
  selected,
  disabled,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex h-full flex-col gap-2.5 rounded-xl border p-4 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-violet-400/60 bg-violet-400/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/30",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          <ClipboardPaste className="h-3 w-3" aria-hidden />
          Paste a run log
        </span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-50">
        Paste your own run log
      </h3>
      <p className="text-xs leading-relaxed text-zinc-400">
        Drop logs, JSON, or MCP tool calls — Gemini will audit them.
      </p>
      <span
        aria-hidden
        data-cta="select-run"
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-md bg-violet-400/15 px-2 py-1 text-[11px] font-medium text-violet-100"
      >
        Select run
        <ArrowRight className="h-3 w-3" aria-hidden />
      </span>
    </button>
  );
}

function ReplayLink({
  selected,
  disabled,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "text-emerald-200 underline-offset-4"
          : "text-zinc-400 hover:text-emerald-200",
      ].join(" ")}
    >
      <Gauge className="h-3.5 w-3.5" aria-hidden />
      <span>
        Or{" "}
        <span className="underline decoration-zinc-600 decoration-dotted underline-offset-4">
          replay the deterministic safe sample
        </span>
        {" "}
        (no key required)
      </span>
    </button>
  );
}

function renderSecondaryIcon(level: ScenarioRiskLevel) {
  const className = "h-3 w-3";
  switch (level) {
    case "medium":
      return <AlertTriangle className={className} aria-hidden />;
    case "low":
    default:
      return <ShieldCheck className={className} aria-hidden />;
  }
}

// Lot 3b (P1#19) — micro-copies rewritten with action verbs and a
// stake. Each line names the agent's intent first, then the production
// signal a reviewer should pay attention to (confidence threshold,
// audit trail, destructive write). Keeps the picker scannable on 1080p
// while raising the narrative tension before the verdict drops.
function secondaryDescription(scenario: TraceScenario): string {
  switch (scenario.expectedVerdict) {
    case "needs_review":
      return "Drafts a customer reply without confidence and approval controls.";
    case "ready":
      return "Reads sources only, every step audited — green-light candidate.";
    case "blocked":
      return "Tries to mass-update CRM deals via destructive writes, no approval — block or let it ship?";
    default:
      return scenario.shortDescription;
  }
}

function riskPalette(level: ScenarioRiskLevel): {
  riskLabel: string;
  border: string;
  bg: string;
  borderSelected: string;
  bgSelected: string;
  badge: string;
  cta: string;
} {
  switch (level) {
    case "critical":
      return {
        riskLabel: "Critical risk",
        border: "border-red-400/40",
        bg: "bg-red-400/[0.06]",
        borderSelected: "border-red-400/80",
        bgSelected: "bg-red-400/[0.12]",
        badge: "bg-red-400/15 text-red-200",
        cta: "bg-red-400/15 text-red-100",
      };
    case "medium":
      return {
        riskLabel: "Medium risk",
        border: "border-amber-400/25",
        bg: "bg-amber-400/[0.04]",
        borderSelected: "border-amber-400/60",
        bgSelected: "bg-amber-400/10",
        badge: "bg-amber-400/15 text-amber-200",
        cta: "bg-amber-400/15 text-amber-100",
      };
    case "low":
    default:
      return {
        riskLabel: "Low risk",
        border: "border-emerald-400/25",
        bg: "bg-emerald-400/[0.04]",
        borderSelected: "border-emerald-400/60",
        bgSelected: "bg-emerald-400/10",
        badge: "bg-emerald-400/15 text-emerald-200",
        cta: "bg-emerald-400/15 text-emerald-100",
      };
  }
}

// V2.2 §5 — uniform CTA across the 4 cards. "Select run" replaces
// "Audit this run" because the actual audit only happens later, when
// the user clicks "Run Gemini Production Gate" inside the Selected
// Run Summary card.
const SECONDARY_CTA_LABEL = "Select run";
