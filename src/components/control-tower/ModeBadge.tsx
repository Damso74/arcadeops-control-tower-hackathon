import type { ControlTowerMode } from "@/lib/control-tower/types";

interface ModeBadgeProps {
  mode: ControlTowerMode;
  available: boolean;
}

export function ModeBadge({ mode, available }: ModeBadgeProps) {
  const isLive = mode === "live";
  const dotClass = !available
    ? "bg-zinc-400"
    : isLive
      ? "bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/60"
      : "bg-sky-400 shadow-[0_0_10px] shadow-sky-400/60";
  const label = isLive
    ? available
      ? "Live ArcadeOps backend"
      : "Live backend not configured"
    : "Replay demo (deterministic)";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300 backdrop-blur">
      <span aria-hidden className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
  );
}
