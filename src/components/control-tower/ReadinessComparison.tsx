import { ArrowRight, Sparkles } from "lucide-react";

import type { GeminiJudgeResult } from "@/lib/control-tower/gemini-types";

import { verdictPalette } from "./GeminiJudgePanel";

interface ReadinessComparisonProps {
  before: GeminiJudgeResult | null;
  after: GeminiJudgeResult | null;
  /**
   * Lot 2b — when `true`, render a placeholder for the "after" side
   * even before any guardrail has been applied. Lets the cockpit show
   * the comparison frame as soon as the first verdict lands so the
   * judge sees the wow-moment slot from the very first audit.
   */
  showPlaceholderWhenAfterMissing?: boolean;
}

/**
 * Decision-first before/after comparison — V5 polished version.
 *
 * The wow moment of the demo: BLOCKED → NEEDS REVIEW (or → READY) in
 * one click. The card shows score, verdict and an interpretation
 * sentence so a judge does not have to read four paragraphs to know
 * whether the simulation moved the needle.
 *
 * Lot 2b (P0#8) — Pre-guardrails placeholder mode:
 * When `before` is set but `after` is still null, the card now
 * renders a dimmed "Apply guardrails below to compute the After
 * score" panel instead of returning `null`. Lets the comparison
 * appear as soon as the first verdict lands.
 */
export function ReadinessComparison({
  before,
  after,
  showPlaceholderWhenAfterMissing = false,
}: ReadinessComparisonProps) {
  if (!before) return null;
  if (!after) {
    if (!showPlaceholderWhenAfterMissing) return null;
    return <ReadinessComparisonPlaceholder before={before} />;
  }
  const delta = after.readinessScore - before.readinessScore;
  const sign = delta === 0 ? "±" : delta > 0 ? "+" : "−";
  const deltaTone =
    delta === 0
      ? "bg-white/5 text-zinc-300"
      : delta > 0
        ? "bg-emerald-400/15 text-emerald-200"
        : "bg-red-400/15 text-red-200";
  const interpretation = interpretComparison(before, after);

  return (
    <section
      aria-label="Readiness comparison before and after guardrails"
      className="flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] via-white/[0.02] to-emerald-500/[0.06] p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
          <h3 className="text-sm font-semibold text-zinc-50 sm:text-base">
            Before guardrails → after guardrails
          </h3>
        </div>
        <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          What-if simulation
        </span>
      </header>

      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <ReadinessCard label="Before guardrails" result={before} accent="muted" />
        <div className="flex items-center justify-center sm:flex-col sm:gap-2">
          <ArrowRight
            aria-hidden
            className="h-5 w-5 text-zinc-500 sm:hidden"
          />
          <span
            aria-hidden
            className="hidden text-zinc-500 sm:block"
          >
            <ArrowRight className="h-6 w-6" aria-hidden />
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-sm font-semibold ${deltaTone}`}
            aria-label={`Score delta ${sign}${Math.abs(delta)}`}
          >
            {sign}
            {Math.abs(delta)}
          </span>
        </div>
        <ReadinessCard label="After guardrails" result={after} accent="emerald" />
      </div>

      {interpretation ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-zinc-200">
          {interpretation}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Pre-guardrails placeholder rendered next to the Before card so the
 * comparison frame appears immediately after the first audit. Once the
 * user applies guardrails the panel re-renders with the real After
 * card from the parent.
 */
function ReadinessComparisonPlaceholder({
  before,
}: {
  before: GeminiJudgeResult;
}) {
  return (
    <section
      aria-label="Readiness comparison waiting for guardrails"
      className="flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] via-white/[0.02] to-emerald-500/[0.06] p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
          <h3 className="text-sm font-semibold text-zinc-50 sm:text-base">
            Before guardrails → after guardrails
          </h3>
        </div>
        <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          What-if simulation
        </span>
      </header>

      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <ReadinessCard label="Before guardrails" result={before} accent="muted" />
        <div className="flex items-center justify-center sm:flex-col sm:gap-2">
          <ArrowRight aria-hidden className="h-5 w-5 text-zinc-600" />
        </div>
        <article className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-zinc-950/40 p-4 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            After guardrails
          </span>
          <p className="text-sm leading-relaxed text-zinc-300">
            Apply guardrails below to compute the After score.
          </p>
        </article>
      </div>
    </section>
  );
}

function ReadinessCard({
  label,
  result,
  accent,
}: {
  label: string;
  result: GeminiJudgeResult;
  accent: "muted" | "emerald";
}) {
  const verdict = verdictPalette(result.verdict);
  const ring =
    accent === "emerald" ? "border-emerald-400/30" : "border-white/10";
  const Icon = verdict.Icon;
  return (
    <article className={`rounded-xl border ${ring} bg-zinc-950/60 p-4`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-4xl font-semibold text-zinc-50">
          {result.readinessScore}
        </span>
        <span className="font-mono text-base text-zinc-500">/100</span>
      </div>
      <span
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${verdict.classes}`}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {verdict.label}
      </span>
    </article>
  );
}

/**
 * Build a one-sentence interpretation tailored to the before/after
 * verdict pair. Keeps the wow moment human — the judge gets the
 * meaning, not just two numbers.
 */
function interpretComparison(
  before: GeminiJudgeResult,
  after: GeminiJudgeResult,
): string {
  const b = before.verdict;
  const a = after.verdict;
  if (b === "blocked" && a === "ready") {
    return "Guardrails moved the run from blocked to ready with monitoring.";
  }
  if (b === "blocked" && a === "needs_review") {
    return "Guardrails reduced the immediate blocker, but the run still needs review before production.";
  }
  if (b === "blocked" && a === "blocked") {
    return "Guardrails helped, but critical production gates are still missing.";
  }
  if (b === "needs_review" && a === "ready") {
    return "Guardrails closed the residual gaps — this run is now ready with monitoring.";
  }
  if (b === "needs_review" && a === "needs_review") {
    return "Guardrails improved confidence, but the run still needs review before production.";
  }
  if (b === "ready" && a === "ready") {
    return "Guardrails reinforce the existing audit trail — this run remains ready with monitoring.";
  }
  if (after.readinessScore > before.readinessScore) {
    return "Guardrails moved the readiness score up — see the after-guardrails audit for residual risks.";
  }
  return "Guardrails did not move the verdict — see the after-guardrails audit for residual risks.";
}
