import type { ControlTowerPhase, ControlTowerStatus } from "@/lib/control-tower/types";

const PHASES: Array<{ id: ControlTowerPhase; label: string }> = [
  { id: "analyze", label: "Analyze" },
  { id: "plan", label: "Plan" },
  { id: "execute", label: "Execute" },
  { id: "evaluate", label: "Evaluate" },
  { id: "summarize", label: "Summarize" },
];

interface PhasePillsProps {
  phaseStatuses: Partial<Record<ControlTowerPhase, ControlTowerStatus>>;
}

export function PhasePills({ phaseStatuses }: PhasePillsProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Agent phases">
      {PHASES.map((phase, idx) => {
        const status = phaseStatuses[phase.id] ?? "queued";
        return (
          <li key={phase.id} className="flex items-center gap-2">
            <PhasePill index={idx + 1} label={phase.label} status={status} />
            {idx < PHASES.length - 1 ? (
              <span aria-hidden className="hidden h-px w-6 bg-white/10 sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function PhasePill({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: ControlTowerStatus;
}) {
  const classes = pillClasses(status);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${classes}`}
      data-status={status}
    >
      <span
        aria-hidden
        className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-semibold"
      >
        {index}
      </span>
      <span>{label}</span>
      <StatusDot status={status} />
    </span>
  );
}

function StatusDot({ status }: { status: ControlTowerStatus }) {
  const dot = (() => {
    switch (status) {
      case "running":
        return "bg-sky-400 animate-pulse";
      case "completed":
        return "bg-emerald-400";
      case "error":
        return "bg-red-400";
      default:
        return "bg-zinc-500/60";
    }
  })();
  return <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />;
}

function pillClasses(status: ControlTowerStatus): string {
  switch (status) {
    case "running":
      return "border-sky-400/40 bg-sky-400/10 text-sky-100";
    case "completed":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
    case "error":
      return "border-red-400/40 bg-red-400/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}
