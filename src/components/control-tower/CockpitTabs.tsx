"use client";

/**
 * UX V2.2 §9 — Internal cockpit tabs.
 *
 * Progressive disclosure primitive that hides Evidence / Policies /
 * Infrastructure / Trace by default and lets the user pivot through
 * them after the verdict has landed. Pure controlled component:
 * parent owns `activeTab` and `onChange`. Each tab content lives in
 * `panels[tabId]` so the parent can lazy-mount expensive children
 * (no inner state, no Suspense — Next.js will tree-shake naturally).
 *
 * Accessibility: standard role="tablist" / role="tab" / role="tabpanel"
 * with `aria-controls` + `aria-labelledby` cross-references.
 *
 * The Trace tab is intentionally rendered as a quiet last entry to
 * communicate "advanced / debug" — the brief V2.2 §10 demands that
 * trace + raw JSON stay hidden by default.
 */
import { useId, type ReactNode } from "react";
import {
  CircleDashed,
  type LucideIcon,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";

export const COCKPIT_TAB_IDS = [
  "summary",
  "evidence",
  "policies",
  "infrastructure",
  "trace",
] as const;

export type CockpitTabId = (typeof COCKPIT_TAB_IDS)[number];

interface TabDef {
  id: CockpitTabId;
  label: string;
  icon: LucideIcon;
}

const TAB_DEFS: readonly TabDef[] = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "evidence", label: "Evidence", icon: ScrollText },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "infrastructure", label: "Infrastructure", icon: Wrench },
  { id: "trace", label: "Trace", icon: Terminal },
];

interface CockpitTabsProps {
  activeTab: CockpitTabId;
  onChange: (next: CockpitTabId) => void;
  /** Map of tab id → ReactNode, all panels are rendered hidden when not active. */
  panels: Partial<Record<CockpitTabId, ReactNode>>;
  /** Optional badge attached to a tab (e.g. "5 rules"). */
  badges?: Partial<Record<CockpitTabId, string>>;
  /** Optional dot indicator on tabs that hold new info (e.g. verdict landed). */
  pulse?: Partial<Record<CockpitTabId, boolean>>;
}

export function CockpitTabs({
  activeTab,
  onChange,
  panels,
  badges,
  pulse,
}: CockpitTabsProps) {
  const idPrefix = useId();
  const visibleTabs = TAB_DEFS.filter((tab) => panels[tab.id] !== undefined);

  return (
    <section className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Cockpit sections"
        className="flex flex-wrap items-center gap-1 border-b border-white/5 pb-1"
      >
        {visibleTabs.map((tab) => {
          const active = tab.id === activeTab;
          const Icon = tab.icon;
          const badge = badges?.[tab.id];
          const isPulsing = pulse?.[tab.id] === true && !active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-cockpit-tab={tab.id}
              data-active={active ? "true" : "false"}
              onClick={() => onChange(tab.id)}
              className={[
                "relative inline-flex items-center gap-2 rounded-md border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
                active
                  ? "border-emerald-400 text-emerald-200"
                  : "border-transparent text-zinc-400 hover:text-zinc-100",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span>{tab.label}</span>
              {badge ? (
                <span
                  className={[
                    "ml-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]",
                    active
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-white/10 text-zinc-400",
                  ].join(" ")}
                >
                  {badge}
                </span>
              ) : null}
              {isPulsing ? (
                <span aria-hidden className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 inline-flex h-2 w-2 animate-ping rounded-full bg-violet-400/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {visibleTabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const content = panels[tab.id];
        if (!content) return null;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${idPrefix}-panel-${tab.id}`}
            aria-labelledby={`${idPrefix}-tab-${tab.id}`}
            data-cockpit-panel={tab.id}
            hidden={!isActive}
          >
            {isActive ? (
              <div className="flex flex-col gap-4">{content}</div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

/**
 * Tiny placeholder used by the Trace tab when no audit has run yet —
 * the brief V2.2 §10 mandates that the Trace tab stays quiet by
 * default.
 */
export function TraceEmptyState() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
      <CircleDashed className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
      Trace, raw JSON and debug data appear here once Gemini has audited the
      run.
    </div>
  );
}
