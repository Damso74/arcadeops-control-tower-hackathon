import type { GeminiJudgeResult } from "@/lib/control-tower/gemini-types";

import { verdictPalette } from "./GeminiJudgePanel";

interface ReadinessComparisonProps {
  before: GeminiJudgeResult | null;
  after: GeminiJudgeResult | null;
}

/**
 * Compact "Before / After" readiness comparison shown above the guardrails
 * detail panel. Only renders when both results exist; otherwise we let the
 * guardrails panel own the empty / loading state.
 */
export function ReadinessComparison({ before, after }: ReadinessComparisonProps) {
  if (!before || !after) return null;
  const delta = after.readinessScore - before.readinessScore;
  const sign = delta === 0 ? "±" : delta > 0 ? "+" : "−";
  const deltaTone =
    delta === 0
      ? "text-zinc-300"
      : delta > 0
        ? "text-emerald-300"
        : "text-red-300";

  return (
    <section
      aria-label="Readiness comparison before and after guardrails"
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">
          Before guardrails → after guardrails
        </h3>
        <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          What-if simulation
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <ReadinessCard label="Before guardrails" result={before} accent="zinc" />
        <div className="flex items-center justify-center">
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 font-mono text-xs ${deltaTone}`}
            aria-label={`Score delta ${sign}${Math.abs(delta)}`}
          >
            {sign}
            {Math.abs(delta)}
          </span>
        </div>
        <ReadinessCard label="After guardrails" result={after} accent="emerald" />
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
  accent: "zinc" | "emerald";
}) {
  const verdict = verdictPalette(result.verdict);
  const ring =
    accent === "emerald" ? "border-emerald-400/30" : "border-white/10";
  return (
    <article className={`rounded-lg border ${ring} bg-white/[0.03] p-4`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="font-mono text-3xl font-semibold text-zinc-50">
          {result.readinessScore}
          <span className="ml-1 text-base text-zinc-500">/100</span>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${verdict.classes}`}
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
          {verdict.label}
        </span>
      </div>
    </article>
  );
}
