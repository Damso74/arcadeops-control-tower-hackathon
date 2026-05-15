/**
 * UX V2.2 §8 — Gate Status component.
 *
 * Signature visual element of ArcadeOps. Maps the Gemini verdict +
 * pre-audit state to one of four cinematic gate states:
 *
 *   - awaiting → "Awaiting Gemini verdict" (neutral, subtle pulse)
 *   - blocked  → "Gate Closed"  (red, lock)
 *   - paused   → "Gate Paused"  (amber, pause warning)
 *   - open     → "Gate Open"    (emerald, check)
 *
 * Pure presentational. No state, no fetches. Mounted in the Selected
 * Run Summary card and reused near the verdict reveal so the gate
 * metaphor is reinforced at every step of the flow.
 */
import {
  CheckCircle2,
  Lock,
  Pause,
  Radio,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";

import type { GeminiVerdict } from "@/lib/control-tower/gemini-types";

export type GateState = "awaiting" | "blocked" | "paused" | "open";

interface GateStatusProps {
  /** Gemini verdict, or `null` when no audit has run yet. */
  verdict: GeminiVerdict | null;
  /** Visual size — affects icon, padding and label scale. */
  size?: "compact" | "hero";
  /** Optional class hook for callers that need extra spacing. */
  className?: string;
}

/**
 * Translate a verdict into a gate state. Exported so smoke tests can
 * hit it directly without depending on React.
 */
export function gateStateForVerdict(verdict: GeminiVerdict | null): GateState {
  if (verdict === null) return "awaiting";
  if (verdict === "blocked") return "blocked";
  if (verdict === "needs_review") return "paused";
  return "open";
}

interface GatePalette {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  pulse: string;
}

function paletteFor(state: GateState): GatePalette {
  switch (state) {
    case "blocked":
      return {
        label: "Gate Closed",
        subtitle: "Blocked before production",
        icon: Lock,
        border: "border-red-400/50",
        bg: "bg-red-400/[0.07]",
        text: "text-red-100",
        badgeBg: "bg-red-500/20",
        badgeText: "text-red-200",
        pulse: "bg-red-400/40",
      };
    case "paused":
      return {
        label: "Gate Paused",
        subtitle: "Human review required",
        icon: Pause,
        border: "border-amber-400/50",
        bg: "bg-amber-400/[0.07]",
        text: "text-amber-100",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-200",
        pulse: "bg-amber-400/40",
      };
    case "open":
      return {
        label: "Gate Open",
        subtitle: "Ready with monitoring",
        icon: CheckCircle2,
        border: "border-emerald-400/50",
        bg: "bg-emerald-400/[0.07]",
        text: "text-emerald-100",
        badgeBg: "bg-emerald-500/20",
        badgeText: "text-emerald-200",
        pulse: "bg-emerald-400/40",
      };
    case "awaiting":
    default:
      return {
        label: "Awaiting Gemini verdict",
        subtitle: "Production gate is armed",
        icon: ShieldOff,
        border: "border-zinc-500/30",
        bg: "bg-white/[0.02]",
        text: "text-zinc-200",
        badgeBg: "bg-white/10",
        badgeText: "text-zinc-300",
        pulse: "bg-zinc-400/30",
      };
  }
}

export function GateStatus({
  verdict,
  size = "compact",
  className = "",
}: GateStatusProps) {
  const state = gateStateForVerdict(verdict);
  const palette = paletteFor(state);
  const Icon = palette.icon;
  const isHero = size === "hero";
  const isAwaiting = state === "awaiting";

  return (
    <div
      role="status"
      aria-label={`${palette.label}. ${palette.subtitle}.`}
      data-gate-state={state}
      className={[
        "flex items-center gap-3 rounded-xl border transition-colors",
        palette.border,
        palette.bg,
        isHero ? "px-5 py-4" : "px-4 py-3",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "relative grid flex-none place-items-center rounded-full",
          palette.badgeBg,
          isHero ? "h-12 w-12" : "h-10 w-10",
        ].join(" ")}
      >
        {isAwaiting ? (
          <span
            aria-hidden
            className={[
              "absolute inset-0 inline-flex animate-ping rounded-full opacity-60",
              palette.pulse,
            ].join(" ")}
          />
        ) : null}
        <Icon
          className={[
            "relative",
            palette.badgeText,
            isHero ? "h-5 w-5" : "h-4 w-4",
          ].join(" ")}
          aria-hidden
        />
        {isAwaiting ? (
          <Radio
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-zinc-400"
          />
        ) : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={[
            "text-[10px] font-semibold uppercase tracking-wider",
            palette.badgeText,
          ].join(" ")}
        >
          Gate Status
        </span>
        <span
          className={[
            "font-semibold",
            palette.text,
            isHero ? "text-base sm:text-lg" : "text-sm",
          ].join(" ")}
        >
          {palette.label}
        </span>
        <span className={`text-xs leading-snug ${palette.text}/70`}>
          {palette.subtitle}
        </span>
      </div>
    </div>
  );
}
