import type { Metadata } from "next";

import { ArcadeOpsRuntimeSection } from "@/components/control-tower/ArcadeOpsRuntimeSection";
import { CompactDashboardHeader } from "@/components/control-tower/CompactDashboardHeader";
import { ControlTowerExperience } from "@/components/control-tower/ControlTowerExperience";
import { RecommendedDemoBanner } from "@/components/control-tower/RecommendedDemoBanner";
import type { ControlTowerModeAvailability } from "@/lib/control-tower/types";

export const metadata: Metadata = {
  title:
    "ArcadeOps Control Tower — A Gemini-powered production gate for autonomous AI agents",
  description:
    "Replay or paste an ArcadeOps agent trace. Control Tower audits tools, sub-agents, costs, approvals and risky outputs, then decides whether the run should ship, need review, or be blocked.",
};

// Server-side detection of the live ArcadeOps backend availability — keeps
// the browser out of the configuration loop entirely (no token leakage,
// no client probe). Gemini availability is detected at runtime via
// /api/capabilities so a key added post-deploy enables the judge without a
// rebuild.
//
// V2.2 §1 — the dense V0–V5 hero is replaced by `CompactDashboardHeader`.
// Live ArcadeOps mode (Vultr FastAPI runner) is still gated by the
// explicit env kill-switch `NEXT_PUBLIC_LIVE_VULTR === "1"` — 130s/run
// is too long for jury demo, official video films Replay only, the live
// mode stays available for internal demos when explicitly enabled.
function detectModeAvailability(): ControlTowerModeAvailability {
  const liveEnabled = process.env.NEXT_PUBLIC_LIVE_VULTR === "1";
  return { replay: true, live: liveEnabled };
}

export default function ControlTowerPage() {
  const availability = detectModeAvailability();

  const footerNote = availability.live
    ? "The deterministic replay path runs without any API key and produces identical traces — useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured. Live ArcadeOps mode proxies a sandboxed backend — the bearer token never reaches your browser. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026."
    : "The deterministic replay path runs without any API key — replays produce identical traces, useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured on the deployment. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10">
        {/* V2.2 §1 + §2 — compact security audit dashboard header. */}
        <CompactDashboardHeader />

        {/* V2.2 §15 — recommended demo path stays as a quiet 1-line
            banner so first-time judges know exactly what to click. */}
        <RecommendedDemoBanner />

        <ControlTowerExperience liveAvailable={availability.live} />

        {/* V2.2.1 — clarity patch: hide the runtime architecture section
            behind a native disclosure so it never competes with the main
            demo flow (Summary tab + Gate Closed/Open). Judges can still
            reach it in one click, but the cockpit lands clean on first
            paint. */}
        <details className="group rounded-2xl border border-white/10 bg-white/[0.02] open:bg-white/[0.03]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 sm:px-6">
            <span className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Under the hood
              </span>
              <span className="text-zinc-100">Show technical architecture</span>
            </span>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="h-4 w-4 flex-none text-zinc-400 transition-transform group-open:rotate-180"
            >
              <path
                fill="currentColor"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
              />
            </svg>
          </summary>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <ArcadeOpsRuntimeSection />
          </div>
        </details>

        <footer className="border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>
            Catch unsafe AI agent runs before they ship. Works with traces
            from agent frameworks, APIs, MCP tools and browser agents —
            pasted as text, audited server-side.
          </p>
          <p className="mt-3">{footerNote}</p>
        </footer>
      </div>
    </div>
  );
}
