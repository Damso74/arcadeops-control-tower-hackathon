"use client";

import { Activity, AlertTriangle, CheckCircle2, DollarSign, RotateCcw, ShieldOff } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import {
  averageCostUsd,
  emptyCounters,
  getCounters,
  resetCounters,
  type ScoreboardCounters,
} from "@/lib/control-tower/scoreboard-store";

/**
 * Lot 3a — Cockpit scoreboard.
 *
 * Compact horizontal 6-KPI strip pinned under the stepper, fed by the
 * `scoreboard-store` (localStorage `arcadeops-scoreboard-v1`). Gives a
 * jury an immediate "sense of progress" when they audit several runs
 * back-to-back: the Blocked / Needs review / Shipped triplet matches
 * what they just clicked, and the High-risk-blocked counter reinforces
 * the platform pitch — *we caught X autonomous calls regardless of
 * what Gemini said*.
 *
 * Implemented with `useSyncExternalStore` (same pattern as the
 * RecommendedDemoBanner) so:
 *   - SSR is safe (server snapshot = zeros, no hydration warning),
 *   - cross-tab updates propagate via the native `storage` event,
 *   - in-tab updates from `incrementCounter()` propagate via a
 *     module-level listener set notified by `notifyChange()`.
 *
 * Kill-switch: callers may render `null` based on
 * `process.env.NEXT_PUBLIC_SCOREBOARD === "0"`. The component itself is
 * always renderable.
 */

const STORAGE_KEY = "arcadeops-scoreboard-v1";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): ScoreboardCounters {
  return getCounters();
}

function getServerSnapshot(): ScoreboardCounters {
  return emptyCounters();
}

/**
 * Notify mounted scoreboards that the localStorage value changed in
 * the current tab (the native `storage` event only fires in *other*
 * tabs). Callers that mutate counters from outside this component
 * (typically `ControlTowerExperience::handleJudgeBefore`) should call
 * this after `incrementCounter()` so the UI repaints immediately.
 */
export function notifyScoreboardChange(): void {
  for (const listener of listeners) listener();
}

export function CockpitScoreboard() {
  const counters = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const handleReset = useCallback(() => {
    resetCounters();
    notifyScoreboardChange();
  }, []);

  const avg = averageCostUsd(counters);
  const avgLabel = avg === null ? "—" : formatCurrency(avg);

  return (
    <section
      aria-label="Cockpit scoreboard"
      className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Cockpit summary · session
        </h2>
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset cockpit counters"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset
        </button>
      </header>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <ScoreboardItem
          icon={<Activity className="h-3.5 w-3.5 text-zinc-400" aria-hidden />}
          label="Runs audited"
          value={counters.runsAudited.toString()}
          tone="neutral"
        />
        <ScoreboardItem
          icon={<ShieldOff className="h-3.5 w-3.5 text-rose-400" aria-hidden />}
          label="Blocked"
          value={counters.blocked.toString()}
          tone="danger"
        />
        <ScoreboardItem
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden />}
          label="Needs review"
          value={counters.needsReview.toString()}
          tone="warning"
        />
        <ScoreboardItem
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
          label="Shipped"
          value={counters.shipped.toString()}
          tone="success"
        />
        <ScoreboardItem
          icon={<DollarSign className="h-3.5 w-3.5 text-zinc-400" aria-hidden />}
          label="Avg cost / audit"
          value={avgLabel}
          tone="neutral"
        />
        <ScoreboardItem
          icon={<ShieldOff className="h-3.5 w-3.5 text-fuchsia-400" aria-hidden />}
          label="High-risk calls blocked"
          value={counters.policyGateTriggered.toString()}
          tone="accent"
        />
      </ul>
    </section>
  );
}

type Tone = "neutral" | "danger" | "warning" | "success" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-zinc-100",
  danger: "text-rose-200",
  warning: "text-amber-200",
  success: "text-emerald-200",
  accent: "text-fuchsia-200",
};

function ScoreboardItem({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-white/[0.06] bg-zinc-950/40 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </span>
      <span className={`text-base font-semibold tabular-nums ${TONE_CLASSES[tone]}`}>
        {value}
      </span>
    </li>
  );
}

function formatCurrency(value: number): string {
  // Display sub-cent precision when the average is below 1 cent — typical
  // Gemini Flash judge runs cost ~$0.001-$0.005 each.
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}
