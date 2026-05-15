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

        <ArcadeOpsRuntimeSection />

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
