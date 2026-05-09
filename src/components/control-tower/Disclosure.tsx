"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

interface DisclosureProps {
  /** Label for the trigger button (e.g. "View full evidence"). */
  label: string;
  /** Optional smaller hint shown next to the label (e.g. "12 risks"). */
  hint?: string;
  /** Content revealed when expanded. */
  children: ReactNode;
  /** Open by default. Defaults to false. */
  defaultOpen?: boolean;
  /**
   * Visual variant. `subtle` renders the trigger as a quiet text button —
   * we use that everywhere details are secondary to the decision.
   */
  variant?: "subtle" | "card";
}

/**
 * Tiny, dependency-free progressive-disclosure primitive used everywhere
 * in the V5 polish. Decision-first means most of the audit lives behind
 * one of these.
 */
export function Disclosure({
  label,
  hint,
  children,
  defaultOpen = false,
  variant = "subtle",
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  const triggerClasses =
    variant === "card"
      ? "flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
      : "inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
        className={triggerClasses}
      >
        <span>
          {label}
          {hint ? (
            <span className="ml-2 text-[11px] text-zinc-500">{hint}</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 flex-none transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div id={contentId} className="flex flex-col gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
