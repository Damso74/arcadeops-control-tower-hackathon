/**
 * "Architecture: powered by ArcadeOps Runtime"
 *
 * Hackathon storytelling block. The Control Tower demo only shows the
 * production gate; this section reminds the judge that the gate is the
 * tip of an actual autonomous-agent platform — agents, tools, sub-agent
 * delegation, trace persistence, cost / risk audit, safety rules.
 *
 * Pure, server-friendly (no client hooks, no fetches). Static content
 * deliberately — there is no value in making this interactive for a
 * 90-second judge walkthrough.
 */
import {
  ArrowRight,
  Boxes,
  Database,
  GitBranch,
  ShieldX,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface RuntimeBullet {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}

const RUNTIME_BULLETS: readonly RuntimeBullet[] = [
  {
    icon: Workflow,
    title: "Autonomous agent loop",
    body: "Plan → execute → evaluate → summarize, with budget caps and stop conditions.",
  },
  {
    icon: Wrench,
    title: "Tool execution",
    body: "Read, write, search, send, generate — every call typed, scoped, and auditable.",
  },
  {
    icon: GitBranch,
    title: "Multi-agent handoff",
    body: "CEO and Manager agents delegate to specialists, sub-agents and ephemeral recruits.",
  },
  {
    icon: Database,
    title: "Trace persistence",
    body: "AgentRun, AgentStep and LLMCall stored end-to-end — replay-friendly by design.",
  },
  {
    icon: Boxes,
    title: "Cost & risk audit",
    body: "Tokens, USD, latency, providers, models and risk flags surfaced per run.",
  },
  {
    icon: Sparkles,
    title: "Production policy gates",
    body: "Approvals, HITL, write-without-audit and outbound-without-review enforced server-side.",
  },
];

const PREVENTED_FAILURES: readonly string[] = [
  "Unsafe CRM writes shipped without human approval",
  "Customer-facing emails sent without human review",
  "Multi-agent delegation running with no audit trail",
  "Production-touching tool calls with no replay ID",
];

const ARCH_NODES: readonly { label: string; tone: ArchTone }[] = [
  { label: "ArcadeOps runtime", tone: "neutral" },
  { label: "Agents", tone: "violet" },
  { label: "Tools", tone: "neutral" },
  { label: "Sub-agents", tone: "violet" },
  { label: "Trace", tone: "neutral" },
  { label: "Gemini Reliability Agent", tone: "emerald" },
  { label: "Production decision", tone: "amber" },
  { label: "Safety rules", tone: "emerald" },
];

type ArchTone = "neutral" | "violet" | "emerald" | "amber";

export function ArcadeOpsRuntimeSection() {
  return (
    <section
      aria-label="Architecture: powered by ArcadeOps Runtime"
      className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.04] via-white/[0.02] to-violet-500/[0.04] p-6 sm:p-8"
    >
      <header className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          Architecture
        </p>
        <h2 className="text-balance text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          Powered by ArcadeOps Runtime
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
          This demo focuses on the production gate, but ArcadeOps is built to
          orchestrate autonomous agents, tools, and multi-agent workflows
          end-to-end. Control Tower is the gate that decides whether any of
          those runs can ship to production.
        </p>
      </header>

      {/* Business impact — translates the technical gate into a list of
          failures the gate actually prevents. Kept in the same section as
          the runtime bullets to make the link "what we built" → "what it
          stops" obvious in 2 seconds. */}
      <div className="flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-red-400/15 text-red-200"
          >
            <ShieldX className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-red-200">
              Business impact
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">
              What Control Tower prevents from reaching production
            </h3>
          </div>
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {PREVENTED_FAILURES.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300"
            >
              <span
                aria-hidden
                className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-red-300"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RUNTIME_BULLETS.map((bullet) => {
          const Icon = bullet.icon;
          return (
            <li
              key={bullet.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-md bg-emerald-400/15 text-emerald-200"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-100">
                  {bullet.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {bullet.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Architecture
        </div>
        <ol
          aria-label="ArcadeOps Control Tower architecture flow"
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-zinc-300"
        >
          {ARCH_NODES.map((node, idx) => (
            <li
              key={node.label}
              className="inline-flex items-center gap-2"
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${archToneClasses(
                  node.tone,
                )}`}
              >
                {node.label}
              </span>
              {idx < ARCH_NODES.length - 1 ? (
                <ArrowRight
                  aria-hidden
                  className="h-3 w-3 flex-none text-zinc-600"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function archToneClasses(tone: ArchTone): string {
  switch (tone) {
    case "violet":
      return "border-violet-400/30 bg-violet-400/10 text-violet-100";
    case "emerald":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
    case "amber":
      return "border-amber-400/30 bg-amber-400/10 text-amber-100";
    case "neutral":
    default:
      return "border-white/15 bg-white/5 text-zinc-200";
  }
}
