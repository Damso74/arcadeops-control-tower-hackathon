import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { ArcadeOpsRuntimeSection } from "@/components/control-tower/ArcadeOpsRuntimeSection";
import { CockpitStepper } from "@/components/control-tower/CockpitStepper";
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
// Lot 1a (Décision §6-B) — the live ArcadeOps mode (Vultr FastAPI runner,
// `⚡ Run live with ArcadeOps backend` button + deterministic SSE replay
// link in the picker) is gated by an explicit env kill-switch
// `NEXT_PUBLIC_LIVE_VULTR === "1"` instead of the implicit presence of
// `RUNNER_URL`. AGENTS.md acts the rationale: 130s/run is too long for
// jury demo, the official video films Replay only, the live mode stays
// available for internal demos when explicitly enabled. `RUNNER_URL`
// remains required server-side for `/api/arcadeops/run` to actually
// reach the Vultr backend — the kill-switch only controls UI exposure.
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
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-12">
        {/* Hero — decision-first, single fold (Lot 1d compaction) */}
        <header className="flex flex-col gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
            ArcadeOps Control Tower
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            A Gemini-powered production gate for autonomous AI agents.
          </h1>
          {/* Compact one-line flow — replaces the deprecated 3-badge row.
              The 3 capability badges (Powered by Gemini / Deterministic
              replay / Production gate) live in `ArcadeOpsRuntimeSection`
              MetaBadges so the hero stays under 3 lines on 1080p. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <FlowStep n={1}>Pick a multi-agent run</FlowStep>
            <ArrowRight aria-hidden className="h-3 w-3 text-zinc-600" />
            <FlowStep n={2}>Inspect agents, tools &amp; evidence</FlowStep>
            <ArrowRight aria-hidden className="h-3 w-3 text-zinc-600" />
            <FlowStep n={3}>
              Gemini decides:{" "}
              <span className="font-mono text-emerald-300">ship</span>,{" "}
              <span className="font-mono text-amber-300">review</span> or{" "}
              <span className="font-mono text-red-300">block</span>
            </FlowStep>
          </p>
        </header>

        <CockpitStepper />

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

function FlowStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="grid h-4 w-4 flex-none place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-zinc-200"
      >
        {n}
      </span>
      <span className="text-zinc-300">{children}</span>
    </span>
  );
}
