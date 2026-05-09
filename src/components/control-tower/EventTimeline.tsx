import type { ControlTowerStatus } from "@/lib/control-tower/types";

export interface TimelineEntry {
  id: string;
  kind: "phase_change" | "step" | "tool_call";
  title: string;
  description?: string;
  status: ControlTowerStatus;
  timestamp: string;
}

interface EventTimelineProps {
  entries: TimelineEntry[];
}

export function EventTimeline({ entries }: EventTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
        Execution timeline will populate as the agent runs.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
          data-status={entry.status}
        >
          <KindIcon kind={entry.kind} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-100">{entry.title}</span>
              <StatusDot status={entry.status} />
            </div>
            {entry.description ? (
              <p className="mt-1 truncate text-xs text-zinc-400">{entry.description}</p>
            ) : null}
          </div>
          <span className="font-mono text-[10px] text-zinc-500">{formatTime(entry.timestamp)}</span>
        </li>
      ))}
    </ol>
  );
}

function KindIcon({ kind }: { kind: TimelineEntry["kind"] }) {
  const map = {
    phase_change: { glyph: "▸", title: "Phase change" },
    step: { glyph: "•", title: "Step" },
    tool_call: { glyph: "🔧", title: "Tool call" },
  } as const;
  const { glyph, title } = map[kind];
  return (
    <span
      aria-label={title}
      className="grid h-6 w-6 flex-none place-items-center rounded-full border border-white/10 bg-white/5 text-xs"
    >
      {glyph}
    </span>
  );
}

function StatusDot({ status }: { status: ControlTowerStatus }) {
  const cls =
    status === "completed"
      ? "bg-emerald-400"
      : status === "running"
        ? "bg-sky-400 animate-pulse"
        : status === "error"
          ? "bg-red-400"
          : "bg-zinc-500/60";
  return <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${cls}`} />;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
