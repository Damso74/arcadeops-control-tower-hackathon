"use client";

import { CheckCircle2, Lock, Loader2, Pause, ShieldOff } from "lucide-react";

import type { GeminiVerdict } from "@/lib/control-tower/gemini-types";

export type MiniStatusState =
  | { kind: "idle" }
  | { kind: "auditing" }
  | { kind: "verdict"; verdict: GeminiVerdict };

interface CockpitMiniStatusProps {
  state: MiniStatusState;
}

/**
 * Sticky 1-line status pinned at the top of the cockpit.
 *
 * The brief mandates that any reviewer can read the current production
 * decision without scrolling, even after the verdict card has scrolled
 * out of view. The bar is purely status — no actions — so it never
 * competes with the primary CTA inside the run preview card.
 */
export function CockpitMiniStatus({ state }: CockpitMiniStatusProps) {
  const palette = paletteFor(state);
  const Icon = palette.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "sticky top-0 z-30 -mx-2 flex items-center gap-2 rounded-b-xl border-b px-3 py-1.5 text-xs backdrop-blur",
        "shadow-[0_4px_14px_-8px_rgba(0,0,0,0.6)] sm:-mx-3 sm:px-4 sm:text-sm",
        palette.border,
        palette.bg,
        palette.text,
      ].join(" ")}
    >
      <Icon
        className={[
          "h-4 w-4 shrink-0",
          state.kind === "auditing" ? "animate-spin" : "",
        ].join(" ")}
        aria-hidden
      />
      <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
        {palette.tag}
      </span>
      <span className="truncate">{palette.label}</span>
    </div>
  );
}

function paletteFor(state: MiniStatusState): {
  tag: string;
  label: string;
  icon: typeof CheckCircle2;
  border: string;
  bg: string;
  text: string;
} {
  switch (state.kind) {
    case "auditing":
      return {
        tag: "Auditing",
        label: "Gemini is auditing this run…",
        icon: Loader2,
        border: "border-violet-400/30",
        bg: "bg-violet-500/10",
        text: "text-violet-100",
      };
    case "verdict":
      switch (state.verdict) {
        case "blocked":
          return {
            tag: "Decision",
            label: "Production decision: BLOCKED",
            icon: Lock,
            border: "border-red-400/40",
            bg: "bg-red-500/10",
            text: "text-red-100",
          };
        case "needs_review":
          return {
            tag: "Decision",
            label: "Production decision: NEEDS REVIEW",
            icon: Pause,
            border: "border-amber-400/40",
            bg: "bg-amber-500/10",
            text: "text-amber-100",
          };
        case "ready":
        default:
          return {
            tag: "Decision",
            label: "Production decision: READY",
            icon: CheckCircle2,
            border: "border-emerald-400/40",
            bg: "bg-emerald-500/10",
            text: "text-emerald-100",
          };
      }
    case "idle":
    default:
      return {
        tag: "Status",
        label: "Ready to audit. Pick a run, then click Audit this run.",
        icon: ShieldOff,
        border: "border-zinc-500/30",
        bg: "bg-zinc-900/70",
        text: "text-zinc-200",
      };
  }
}
