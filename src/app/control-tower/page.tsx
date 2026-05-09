import type { Metadata } from "next";

import { ControlTowerExperience } from "@/components/control-tower/ControlTowerExperience";
import type { ControlTowerModeAvailability } from "@/lib/control-tower/types";

export const metadata: Metadata = {
  title: "ArcadeOps Control Tower — Flight recorder for AI agents",
  description:
    "Replay an autonomous AI agent run, let Gemini judge production readiness, and get a risk-aware remediation plan.",
};

// Server-side detection of the live ArcadeOps backend availability — keeps
// the browser out of the configuration loop entirely (no token leakage,
// no client probe). Gemini availability is detected at runtime via
// /api/capabilities so a key added post-deploy enables the judge without a
// rebuild.
function detectModeAvailability(): ControlTowerModeAvailability {
  const baseUrl = process.env.ARCADEOPS_API_BASE_URL;
  const token = process.env.ARCADEOPS_DEMO_TOKEN;
  const agentId = process.env.ARCADEOPS_DEMO_AGENT_ID;
  const live = Boolean(baseUrl && token && agentId);
  return { replay: true, live };
}

export default function ControlTowerPage() {
  const availability = detectModeAvailability();

  const heroDescription =
    "ArcadeOps Control Tower is the flight recorder and reliability judge for autonomous AI agents. Replay every run — plan, tools, cost, risks and final output — then let Gemini decide whether the run is production-ready.";

  const footerNote = availability.live
    ? "Replay mode is deterministic and runs without any API key. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured. Live ArcadeOps mode proxies a sandboxed backend — the bearer token never reaches your browser. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026."
    : "Deterministic replay runs without any API key — replays produce identical traces, useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured on the deployment. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.";

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
            The flight recorder and Gemini-powered reliability judge for autonomous AI agents.
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{heroDescription}</p>
        </header>

        {/* Replay launcher + Gemini judge */}
        <ControlTowerExperience liveAvailable={availability.live} />

        {/* Footer note */}
        <footer className="border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>{footerNote}</p>
        </footer>
      </div>
    </div>
  );
}
