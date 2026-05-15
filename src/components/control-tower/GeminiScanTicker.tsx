"use client";

/**
 * UX V2.2 §11 — Purposeful Gemini scan animation.
 *
 * Shown while Gemini is auditing the trace. Replaces the older
 * `GeminiTicker` with a more cinematic 5-step scan checklist:
 *
 *   1. Reading agent trace…
 *   2. Checking tool calls…
 *   3. Detecting external side effects…
 *   4. Applying production policies…
 *   5. Generating verdict…
 *
 * Cycle is ~600ms per step (full loop ~3s) so judges always see the
 * narration even when Gemini answers in <2s. The cycle wraps so the
 * ticker keeps moving on cold latency. Restrained motion: a single
 * vertical scan beam slides across the panel; no gimmicky animation.
 *
 * Pure presentational.
 */
import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const SCAN_STEPS: readonly string[] = [
  "Reading agent trace…",
  "Checking tool calls…",
  "Detecting external side effects…",
  "Applying production policies…",
  "Generating Gemini verdict…",
];

const STEP_DURATION_MS = 600;

interface GeminiScanTickerProps {
  /** Visual size — affects padding and font scale. */
  variant?: "default" | "compact";
}

export function GeminiScanTicker({
  variant = "default",
}: GeminiScanTickerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % SCAN_STEPS.length);
    }, STEP_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  const compact = variant === "compact";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Gemini production gate audit in progress"
      data-testid="gemini-scan-ticker"
      className={[
        "relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-violet-400/20 bg-violet-500/[0.06]",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
      ].join(" ")}
    >
      {/* Scan beam — single vertical sweep. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[gateScan_2.5s_ease-in-out_infinite] bg-gradient-to-r from-violet-500/0 via-violet-400/15 to-violet-500/0"
      />

      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-5 w-5 flex-none place-items-center rounded-md bg-violet-500/20 text-violet-200"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          Gemini production gate · scan in progress
        </span>
      </div>

      {SCAN_STEPS.map((msg, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        return (
          <div
            key={msg}
            className={[
              "flex items-center gap-2 transition-colors",
              compact ? "text-[11px]" : "text-xs",
              isActive
                ? "text-violet-100"
                : isPast
                  ? "text-zinc-400"
                  : "text-zinc-600",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="inline-flex h-3.5 w-3.5 flex-none items-center justify-center"
            >
              {isActive ? (
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-violet-300" />
              ) : isPast ? (
                <Check className="h-3 w-3 text-emerald-300" aria-hidden />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/15" />
              )}
            </span>
            <span className="font-mono text-[11px]">{msg}</span>
          </div>
        );
      })}

      <style>{`
        @keyframes gateScan {
          0% { transform: translateX(-110%); }
          50% { transform: translateX(220%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  );
}
