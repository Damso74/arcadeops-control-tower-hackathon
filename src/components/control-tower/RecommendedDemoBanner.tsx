"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * Lot 1d (P1#18) — pedagogical 1-line banner shown right under the
 * sticky stepper. Spells out the recommended 4-step demo path so a
 * first-time judge knows exactly what to click. Dismissible (the choice
 * is persisted in localStorage `arcadeops-demo-banner-dismissed-v1` so
 * power users only see it once).
 *
 * Strictly cosmetic — no global state, no events fired. Implemented
 * with `useSyncExternalStore` so the dismiss state stays consistent
 * with localStorage even across tabs and hydrates without violating
 * React 19's `set-state-in-effect` rule.
 */

const STORAGE_KEY = "arcadeops-demo-banner-dismissed-v1";

const STEPS: ReadonlyArray<{ index: number; label: string }> = [
  { index: 1, label: "Audit critical CRM run" },
  { index: 2, label: "Watch Gemini block it" },
  { index: 3, label: "Audit safe research run" },
  { index: 4, label: "Watch it ship with monitoring" },
];

// Module-level subscriber set so the dismiss button can synchronously
// notify any mounted instance (typically just one in our cockpit).
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Cross-tab sync: another tab dismissing the banner triggers the
  // browser-native `storage` event (only fires in *other* tabs).
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

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / disabled storage — banner stays visible, dismiss
    // still works for the current session via in-memory listeners.
    return false;
  }
}

function getServerSnapshot(): boolean {
  // SSR: assume not-yet-dismissed so the banner is always rendered on
  // first hydration. The client read may then immediately hide it on
  // the second render — that's the cost of localStorage access being
  // client-only.
  return false;
}

function dismiss() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  } catch {
    // Swallow — dismiss still works for the current session below.
  }
  for (const listener of listeners) listener();
}

export function RecommendedDemoBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (dismissed) return null;

  return (
    <aside
      role="note"
      aria-label="Recommended demo path"
      className="flex flex-col gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
        <Sparkles className="h-3 w-3" aria-hidden />
        Recommended demo path
      </div>
      <ol className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-300">
        {STEPS.map((step, idx) => (
          <li key={step.index} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="grid h-4 w-4 flex-none place-items-center rounded-full bg-emerald-400/20 font-mono text-[9px] font-semibold text-emerald-200"
            >
              {step.index}
            </span>
            <span className="text-zinc-200">{step.label}</span>
            {idx < STEPS.length - 1 ? (
              <ArrowRight aria-hidden className="h-3 w-3 text-zinc-600" />
            ) : null}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss recommended demo path"
        className="ml-auto inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 sm:ml-0"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </aside>
  );
}
