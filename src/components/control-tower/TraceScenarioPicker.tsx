"use client";

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
}

/**
 * "Choose a run" picker — the entry point of the production-gate flow.
 *
 * Lays out one card per trace scenario plus two extra entry tiles:
 *   - "Replay safe sample" → keeps the original V0–V3 deterministic
 *     replay path (the bundled fixture). The judge still works on top
 *     of it — this is the comfort path for a quick 30-second demo.
 *   - "Paste your own trace" → feeds the pasted-trace input. Nothing
 *     gets stored: the text only travels with the next judge call.
 *
 * The critical-risk scenario is visually emphasized (border + ring +
 * label tone) because catching unsafe runs is the differentiator.
 */
export function TraceScenarioPicker({
  scenarios,
  selection,
  onSelect,
  disabled,
}: TraceScenarioPickerProps) {
  return (
    <section
      aria-label="Choose a run to audit"
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          1 · Choose a run
        </h2>
        <p className="text-sm text-zinc-300">
          Pick a recorded agent run, replay the safe sample, or paste your own
          trace. Gemini will judge production readiness on the next click.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scenarios.map((scenario) => {
          const isSelected =
            selection.mode === "scenario" && selection.scenarioId === scenario.id;
          return (
            <ScenarioCard
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

        <ExtraCard
          title="Paste your own trace"
          subtitle="Logs, JSON, MCP tool calls, framework outputs"
          cta="Audit pasted trace"
          tone="neutral"
          selected={selection.mode === "pasted"}
          disabled={disabled}
          onSelect={() => onSelect({ mode: "pasted", scenarioId: null })}
        />

        <ExtraCard
          title="Replay safe sample"
          subtitle="Deterministic SSE replay of the bundled trace (no key)"
          cta="Replay safe sample"
          tone="positive"
          selected={selection.mode === "replay"}
          disabled={disabled}
          onSelect={() => onSelect({ mode: "replay", scenarioId: null })}
        />
      </div>
    </section>
  );
}

interface ScenarioCardProps {
  scenario: TraceScenario;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function ScenarioCard({ scenario, selected, disabled, onSelect }: ScenarioCardProps) {
  const palette = riskPalette(scenario.riskLevel);
  const isCritical = scenario.riskLevel === "critical";
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? `${palette.borderSelected} ${palette.bgSelected}`
          : `${palette.border} ${palette.bg} hover:border-white/30`,
        isCritical ? "ring-1 ring-red-400/30" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${palette.badge}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {palette.riskLabel}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {expectedVerdictLabel(scenario.expectedVerdict)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-zinc-50">{scenario.title}</h3>
      <p className="text-xs leading-relaxed text-zinc-400">
        {scenario.shortDescription}
      </p>

      <span
        aria-hidden
        className={`mt-auto inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${palette.cta}`}
      >
        {ctaLabel(scenario.riskLevel)}
        <span>→</span>
      </span>
    </button>
  );
}

function ExtraCard({
  title,
  subtitle,
  cta,
  tone,
  selected,
  disabled,
  onSelect,
}: {
  title: string;
  subtitle: string;
  cta: string;
  tone: "neutral" | "positive";
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const palette =
    tone === "positive"
      ? {
          border: "border-emerald-400/20",
          bg: "bg-emerald-400/[0.03]",
          borderSelected: "border-emerald-400/60",
          bgSelected: "bg-emerald-400/10",
          cta: "bg-emerald-400/15 text-emerald-100",
        }
      : {
          border: "border-white/10",
          bg: "bg-white/[0.02]",
          borderSelected: "border-violet-400/50",
          bgSelected: "bg-violet-400/10",
          cta: "bg-violet-400/15 text-violet-100",
        };

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? `${palette.borderSelected} ${palette.bgSelected}`
          : `${palette.border} ${palette.bg} hover:border-white/30`,
      ].join(" ")}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {tone === "positive" ? "Sandbox replay" : "Bring your own"}
      </span>
      <h3 className="text-sm font-semibold text-zinc-50">{title}</h3>
      <p className="text-xs leading-relaxed text-zinc-400">{subtitle}</p>
      <span
        aria-hidden
        className={`mt-auto inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${palette.cta}`}
      >
        {cta}
        <span>→</span>
      </span>
    </button>
  );
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
        border: "border-red-400/30",
        bg: "bg-red-400/[0.05]",
        borderSelected: "border-red-400/70",
        bgSelected: "bg-red-400/10",
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

function ctaLabel(level: ScenarioRiskLevel): string {
  switch (level) {
    case "critical":
      return "Audit unsafe run";
    case "medium":
      return "Review this run";
    case "low":
    default:
      return "Audit this run";
  }
}

function expectedVerdictLabel(v: TraceScenario["expectedVerdict"]): string {
  switch (v) {
    case "ready":
      return "Expected: ready";
    case "needs_review":
      return "Expected: needs review";
    case "blocked":
    default:
      return "Expected: blocked";
  }
}
