import { ArrowRight, Gauge, ShieldAlert, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ArcadeOpsRuntimeSection } from "@/components/control-tower/ArcadeOpsRuntimeSection";
import { ControlTowerExperience } from "@/components/control-tower/ControlTowerExperience";
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
// Lot 5 FULL: the live backend is now the Vultr FastAPI runner, surfaced
// to Vercel as `RUNNER_URL`. The optional `RUNNER_SECRET` is enforced
// server-side through `runnerHeaders()` — it is never required for the
// availability check itself (a missing secret degrades to "no auth header",
// which the runner accepts when its kill-switch `RUNNER_REQUIRE_SECRET=0`).
function detectModeAvailability(): ControlTowerModeAvailability {
  const runnerUrl = process.env.RUNNER_URL?.trim();
  return { replay: true, live: Boolean(runnerUrl) };
}

export default function ControlTowerPage() {
  const availability = detectModeAvailability();

  const footerNote = availability.live
    ? "The deterministic replay path runs without any API key and produces identical traces — useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured. Live ArcadeOps mode proxies a sandboxed backend — the bearer token never reaches your browser. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026."
    : "The deterministic replay path runs without any API key — replays produce identical traces, useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured on the deployment. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-12">
        {/* Hero — decision-first, single fold */}
        <header className="flex flex-col gap-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
            ArcadeOps Control Tower
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            A Gemini-powered production gate for autonomous AI agents.
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Replay or paste an ArcadeOps agent trace. Control Tower audits
            tools, sub-agents, costs, approvals and risky outputs, then decides
            whether the run should ship, need review, or be blocked.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet" icon={<Sparkles className="h-3 w-3" aria-hidden />}>
              Powered by Gemini
            </Badge>
            <Badge tone="emerald" icon={<Gauge className="h-3 w-3" aria-hidden />}>
              Deterministic replay
            </Badge>
            <Badge tone="red" icon={<ShieldAlert className="h-3 w-3" aria-hidden />}>
              Production gate
            </Badge>
          </div>

          {/* Compact one-line flow — used to be three big cards */}
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

function Badge({
  tone,
  icon,
  children,
}: {
  tone: "violet" | "emerald" | "red";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const palette = {
    violet: "bg-violet-500/15 text-violet-200",
    emerald: "bg-emerald-400/15 text-emerald-200",
    red: "bg-red-400/15 text-red-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${palette}`}
    >
      {icon}
      {children}
    </span>
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
