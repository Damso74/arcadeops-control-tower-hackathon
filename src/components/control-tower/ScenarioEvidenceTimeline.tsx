import type { ScenarioEvidence, TraceScenario } from "@/lib/control-tower/scenarios";

interface ScenarioEvidenceTimelineProps {
  scenario: TraceScenario;
}

/**
 * Lightweight evidence card list rendered for textual scenarios. Lets a
 * judge "see" the risk profile before clicking Gemini, without forcing us
 * to fake a full SSE replay for non-deterministic content.
 */
export function ScenarioEvidenceTimeline({ scenario }: ScenarioEvidenceTimelineProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="Scenario evidence">
      <header className="flex flex-col gap-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Evidence
        </h3>
        <p className="text-sm leading-relaxed text-zinc-300">
          What the recorded run actually shows — read this before letting
          Gemini judge.
        </p>
      </header>

      <ul className="space-y-2">
        {scenario.evidence.map((entry, idx) => (
          <li key={`${entry.kind}-${idx}`}>
            <EvidenceCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EvidenceCard({ entry }: { entry: ScenarioEvidence }) {
  const palette = tonePalette(entry.tone);
  return (
    <article
      className={`flex items-start gap-3 rounded-lg border ${palette.border} ${palette.bg} px-4 py-3`}
    >
      <span
        aria-hidden
        className={`mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full ${palette.dot}`}
      />
      <div className="flex-1">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wider ${palette.text}`}
        >
          {entry.kind}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-100">{entry.label}</p>
      </div>
    </article>
  );
}

function tonePalette(tone: ScenarioEvidence["tone"]): {
  border: string;
  bg: string;
  dot: string;
  text: string;
} {
  switch (tone) {
    case "danger":
      return {
        border: "border-red-400/30",
        bg: "bg-red-400/[0.05]",
        dot: "bg-red-400",
        text: "text-red-200",
      };
    case "warning":
      return {
        border: "border-amber-400/30",
        bg: "bg-amber-400/[0.05]",
        dot: "bg-amber-400",
        text: "text-amber-200",
      };
    case "positive":
      return {
        border: "border-emerald-400/30",
        bg: "bg-emerald-400/[0.04]",
        dot: "bg-emerald-400",
        text: "text-emerald-200",
      };
    case "neutral":
    default:
      return {
        border: "border-white/10",
        bg: "bg-white/[0.03]",
        dot: "bg-zinc-400",
        text: "text-zinc-300",
      };
  }
}
