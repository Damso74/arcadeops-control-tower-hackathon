import type { ControlTowerResult } from "@/lib/control-tower/types";

interface ResultCardProps {
  result: Omit<ControlTowerResult, "type"> | null;
  onRunAgain: () => void;
  disabled?: boolean;
}

export function ResultCard({ result, onRunAgain, disabled }: ResultCardProps) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
        The audit report will appear here once the mission completes.
      </div>
    );
  }

  return (
    <article className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
            Result
          </div>
          <h3 className="mt-1 text-xl font-semibold text-zinc-50">{result.title}</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
          <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-400" />
          Audit ready
        </span>
      </header>

      <p className="mt-4 text-sm leading-relaxed text-zinc-200">{result.summary}</p>

      {result.recommendations.length > 0 ? (
        <div className="mt-5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Recommendations
          </div>
          <ul className="mt-2 space-y-2">
            {result.recommendations.map((rec) => (
              <li
                key={rec}
                className="flex items-start gap-2 text-sm text-zinc-200"
              >
                <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRunAgain}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run again
        </button>
        <span className="text-xs text-zinc-500">
          Replays produce identical traces — useful for video and audit reproducibility.
        </span>
      </div>
    </article>
  );
}
