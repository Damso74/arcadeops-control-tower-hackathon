import type { Metadata } from "next";

import { DemoMissionLauncher } from "@/components/control-tower/DemoMissionLauncher";
import type { ControlTowerModeAvailability } from "@/lib/control-tower/types";

export const metadata: Metadata = {
  title: "ArcadeOps Control Tower",
  description: "Mission control for autonomous AI agents.",
};

// Server-side detection of the live backend availability — keeps the browser
// out of the configuration loop entirely (no token leakage, no client probe).
function detectModeAvailability(): ControlTowerModeAvailability {
  const baseUrl = process.env.ARCADEOPS_API_BASE_URL;
  const token = process.env.ARCADEOPS_DEMO_TOKEN;
  const agentId = process.env.ARCADEOPS_DEMO_AGENT_ID;
  const live = Boolean(baseUrl && token && agentId);
  return { replay: true, live };
}

export default function ControlTowerPage() {
  const availability = detectModeAvailability();

  const heroDescription = availability.live
    ? "From mission to audit trail in 90 seconds. Replay the deterministic demo run for reliable judging, or run a live mission against a sandboxed ArcadeOps backend with streamed phases, tool calls, observability metrics and a production-readiness report."
    : "From mission to audit trail in 90 seconds. A deterministic replay of an autonomous AI agent workflow — streamed phases, tool calls, observability metrics and a production-readiness report.";

  const footerNote = availability.live
    ? "Replay mode is deterministic and runs without any API key. Live mode proxies a sandboxed ArcadeOps demo endpoint — the bearer token never reaches your browser. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026."
    : "Deterministic replay mode runs without any API key — replays produce identical traces, useful for video and audit reproducibility. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-10">
        {/* Hero */}
        <header className="flex flex-col gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
            ArcadeOps · Hackathon demo
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            ArcadeOps Control Tower
          </h1>
          <p className="text-lg text-zinc-300">
            Mission control for autonomous AI agents.
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{heroDescription}</p>
        </header>

        {/* Launcher */}
        <DemoMissionLauncher liveAvailable={availability.live} />

        {/* Footer note */}
        <footer className="border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>{footerNote}</p>
        </footer>
      </div>
    </div>
  );
}
