"use client";

import { ClipboardList, Scale, ScanSearch } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Lot 1c (P0#1) — sticky top-bar stepper that mirrors the cockpit
 * sections (`#pick`, `#evidence`, `#decide`).
 *
 *   - 3 chips, each clickable + jumps to the matching anchor with smooth
 *     scroll behaviour (browser-native, no JS animation).
 *   - The active chip is highlighted via `IntersectionObserver` watching
 *     the three target sections; the section closest to the viewport top
 *     wins.
 *   - Compact icon-only rendering under 640px so the stepper does not
 *     compete with the hero on mobile.
 *   - Sticky (`sticky top-0 z-20 backdrop-blur`) so it stays visible
 *     during the entire cockpit interaction.
 */

interface StepDef {
  id: "pick" | "evidence" | "decide";
  label: string;
  shortLabel: string;
  icon: typeof ClipboardList;
  index: number;
}

const STEPS: readonly StepDef[] = [
  { id: "pick", label: "Pick a run", shortLabel: "Pick", icon: ClipboardList, index: 1 },
  { id: "evidence", label: "Inspect evidence", shortLabel: "Inspect", icon: ScanSearch, index: 2 },
  { id: "decide", label: "Decide", shortLabel: "Decide", icon: Scale, index: 3 },
];

export function CockpitStepper() {
  const [activeId, setActiveId] = useState<StepDef["id"]>("pick");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sections = STEPS.map((step) => ({
      id: step.id,
      el: document.getElementById(step.id),
    })).filter((entry): entry is { id: StepDef["id"]; el: HTMLElement } =>
      Boolean(entry.el),
    );
    if (sections.length === 0) return;

    // We pick the section whose top is closest to a band just below the
    // sticky bar (~120px from the top). This is more stable than the
    // standard "first intersecting" heuristic when several sections fit
    // in the viewport at once.
    const visible = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry);
        }
        let bestId: StepDef["id"] = activeId;
        let bestRatio = -Infinity;
        for (const step of STEPS) {
          const entry = visible.get(step.id);
          if (!entry) continue;
          // Prefer the one with the largest intersection ratio, with a
          // small bias towards earlier sections so the stepper does not
          // jitter when two sections are equally visible.
          const ratio = entry.intersectionRatio - step.index * 0.001;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = step.id;
          }
        }
        setActiveId(bestId);
      },
      {
        // Collapse the viewport top by ~110px so the sticky stepper itself
        // does not count towards the active section.
        rootMargin: "-110px 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const { el } of sections) observer.observe(el);
    return () => observer.disconnect();
    // We intentionally exclude `activeId` from deps — the observer only
    // needs to be wired once per mount; reading the latest state inside
    // the callback would just churn observers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJump = (id: StepDef["id"]) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Cockpit steps"
      className="sticky top-0 z-20 -mx-6 border-b border-white/5 bg-zinc-950/85 px-6 py-2 backdrop-blur sm:-mx-10 sm:px-10"
    >
      <ol className="flex items-center justify-center gap-2 sm:gap-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === activeId;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => handleJump(step.id)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${step.index}: ${step.label}`}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
                  "sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs",
                  isActive
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "grid h-4 w-4 flex-none place-items-center rounded-full font-mono text-[9px] font-semibold sm:h-4.5 sm:w-4.5 sm:text-[10px]",
                    isActive ? "bg-emerald-400/30 text-emerald-50" : "bg-white/10 text-zinc-300",
                  ].join(" ")}
                >
                  {step.index}
                </span>
                <Icon className="h-3.5 w-3.5 flex-none sm:hidden" aria-hidden />
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </button>
              {step.id !== "decide" ? (
                <span
                  aria-hidden
                  className="mx-1 inline-block h-px w-3 bg-white/10 align-middle sm:mx-2 sm:w-6"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
