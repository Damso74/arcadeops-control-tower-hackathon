import type { Metadata } from "next";

import { ControlTowerExperience } from "@/components/control-tower/ControlTowerExperience";
import type { ControlTowerModeAvailability } from "@/lib/control-tower/types";

export const metadata: Metadata = {
  title:
    "ArcadeOps Control Tower — Production gate for autonomous AI agents",
  description:
    "Replay or paste an AI agent trace. Gemini audits the plan, tools, cost, risks and output, then returns a production-readiness verdict.",
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

  const footerNote = availability.live
    ? "The deterministic replay path runs without any API key and produces identical traces — useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured. Live ArcadeOps mode proxies a sandboxed backend — the bearer token never reaches your browser. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026."
    : "The deterministic replay path runs without any API key — replays produce identical traces, useful for video and audit reproducibility. The Gemini Reliability Judge activates whenever GEMINI_API_KEY is configured on the deployment. Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.";

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-10">
        {/* Hero — production-gate framing */}
        <header className="flex flex-col gap-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
            ArcadeOps · Production gate for autonomous AI agents
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Can this AI agent run safely ship to production?
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-zinc-300">
            Replay or paste an agent trace. Gemini audits the plan, tools,
            cost, risks and output, then returns a production-readiness
            verdict.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
              Powered by Gemini
            </span>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
              Deterministic replay
            </span>
            <span className="rounded-full bg-red-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-200">
              Production gate
            </span>
          </div>

          <ol className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <MicroFlowStep
              n={1}
              title="Choose or paste a run"
              body="Pick a recorded scenario, replay the safe sample, or drop your own trace."
            />
            <MicroFlowStep
              n={2}
              title="Inspect the evidence"
              body="See tool calls, cost, risks and missing audit trail before any model call."
            />
            <MicroFlowStep
              n={3}
              title="Let Gemini judge"
              body="Get a verdict, risk inventory, remediation plan, and a re-score with guardrails."
            />
          </ol>
        </header>

        <ControlTowerExperience liveAvailable={availability.live} />

        <footer className="border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>
            Catch unsafe AI agent runs before they ship. From black-box agents
            to production decisions. Works with traces from agent frameworks,
            APIs, MCP tools and browser agents — pasted as text, audited
            server-side.
          </p>
          <p className="mt-3">{footerNote}</p>
        </footer>
      </div>
    </div>
  );
}

function MicroFlowStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <span
        aria-hidden
        className="grid h-7 w-7 flex-none place-items-center rounded-full bg-white/10 text-xs font-semibold text-zinc-100"
      >
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
        <span className="text-xs leading-relaxed text-zinc-400">{body}</span>
      </div>
    </li>
  );
}
