import type { ControlTowerStatus } from "@/lib/control-tower/types";

export interface ToolCallView {
  name: string;
  description?: string;
  status: ControlTowerStatus;
  durationMs?: number;
  startedAtIso: string;
}

interface ToolCallCardProps {
  call: ToolCallView;
}

export function ToolCallCard({ call }: ToolCallCardProps) {
  return (
    <article
      className="group rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20"
      data-status={call.status}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            🔧
          </span>
          <h4 className="font-mono text-sm font-medium text-zinc-100">{call.name}</h4>
        </div>
        <StatusChip status={call.status} />
      </header>
      {call.description ? (
        <p className="mt-2 break-all text-sm leading-relaxed text-zinc-400">{call.description}</p>
      ) : null}
      <footer className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
        <span>{formatTime(call.startedAtIso)}</span>
        {typeof call.durationMs === "number" ? (
          <>
            <span aria-hidden>•</span>
            <span>{formatDuration(call.durationMs)}</span>
          </>
        ) : null}
      </footer>
    </article>
  );
}

function StatusChip({ status }: { status: ControlTowerStatus }) {
  const map: Record<ControlTowerStatus, { label: string; classes: string }> = {
    queued: { label: "Queued", classes: "bg-zinc-500/15 text-zinc-300" },
    running: { label: "Running", classes: "bg-sky-400/15 text-sky-200" },
    completed: { label: "Completed", classes: "bg-emerald-400/15 text-emerald-200" },
    error: { label: "Error", classes: "bg-red-400/15 text-red-200" },
  };
  const { label, classes } = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${classes}`}>
      {label}
    </span>
  );
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

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}
