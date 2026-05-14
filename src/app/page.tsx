import {
  ArrowRight,
  GitBranch,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

/**
 * Public landing page.
 *
 * Hackathon judges sometimes arrive on `/` instead of `/control-tower`.
 * The page must, in 5 seconds:
 *   - state what the product is (a Gemini-powered production gate);
 *   - hint at the multi-agent storytelling (so it doesn't read as a
 *     trace-audit dashboard);
 *   - send the visitor to /control-tower with a single, obvious CTA.
 *
 * Kept fully static (no client hooks, no fetches) — the dynamic demo
 * lives at /control-tower.
 */
export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Subtle background glows — purely decorative, accessibility-hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"
      />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:px-10 sm:py-20">
        {/* Hero */}
        <header className="flex flex-col items-start gap-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
            ArcadeOps Control Tower
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            A Gemini-powered production gate
            <br className="hidden sm:block" /> for autonomous AI agents.
          </h1>
          {/* Lot 4a — V2 punchline displayed verbatim under the hero so
              the same sentence shows up in the cockpit, the deck, the
              README and the video script. Decision §6-A acted. */}
          <p className="max-w-2xl text-balance text-base font-semibold text-emerald-200 sm:text-lg">
            Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents
            before production.
          </p>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            ArcadeOps lets autonomous agents use tools, delegate to sub-agents,
            and execute business workflows. Control Tower audits every run with
            Gemini before it can safely ship to production.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/control-tower"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            >
              Launch Control Tower
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="https://github.com/Damso74/arcadeops-control-tower-hackathon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              View on GitHub
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Pill tone="violet" icon={<Sparkles className="h-3 w-3" aria-hidden />}>
              Powered by Gemini
            </Pill>
            <Pill tone="emerald" icon={<Radio className="h-3 w-3" aria-hidden />}>
              Deterministic replay
            </Pill>
            <Pill tone="emerald" icon={<ShieldCheck className="h-3 w-3" aria-hidden />}>
              Production gate
            </Pill>
          </div>
        </header>

        {/* Three pillars */}
        <section
          aria-label="What Control Tower delivers"
          className="grid gap-4 sm:grid-cols-3"
        >
          <Pillar
            icon={GitBranch}
            title="Multi-agent traces"
            body="CEO, Support, CRM and Email agents collaborate. Every handoff, every tool call, every cost is captured in a single trace."
          />
          <Pillar
            icon={Sparkles}
            title="Gemini Reliability Agent"
            body="Server-side Gemini reads the full trace and produces a structured judgment: risks, missing evidence, remediation plan."
          />
          <Pillar
            icon={ShieldCheck}
            title="Deterministic production gates"
            body="ArcadeOps applies non-negotiable rules on top of Gemini. The verdict, score and next action are guaranteed coherent."
          />
        </section>

        {/* Mini architecture peek — same ribbon as the runtime section in
            /control-tower, kept compact here as a visual teaser. */}
        <section
          aria-label="ArcadeOps architecture preview"
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Architecture
            </span>
          </div>
          <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-zinc-300">
            {ARCH_RIBBON.map((node, idx) => (
              <li key={node.label} className="inline-flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${ribbonClasses(
                    node.tone,
                  )}`}
                >
                  {node.label}
                </span>
                {idx < ARCH_RIBBON.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    className="h-3 w-3 flex-none text-zinc-600"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
            ArcadeOps orchestrates the autonomous run. Control Tower stops it
            before it can touch a real system if anything looks unsafe.
          </p>
        </section>

        <footer className="flex flex-col gap-1 border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>
            <strong className="text-zinc-300">Try it without an API key.</strong>{" "}
            The deterministic replay path runs without{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-zinc-300">
              GEMINI_API_KEY
            </code>{" "}
            and produces identical traces — useful for video and audit
            reproducibility.
          </p>
          <p className="mt-2">
            Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.
          </p>
        </footer>
      </main>
    </div>
  );
}

interface PillarProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}

function Pillar({ icon: Icon, title, body }: PillarProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-200"
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="text-xs leading-relaxed text-zinc-400">{body}</p>
    </article>
  );
}

type PillTone = "violet" | "emerald";

function Pill({
  tone,
  icon,
  children,
}: {
  tone: PillTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const palette =
    tone === "violet"
      ? "bg-violet-500/15 text-violet-200"
      : "bg-emerald-400/15 text-emerald-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${palette}`}
    >
      {icon}
      {children}
    </span>
  );
}

type RibbonTone = "neutral" | "violet" | "emerald" | "amber";

const ARCH_RIBBON: readonly { label: string; tone: RibbonTone }[] = [
  { label: "Agents", tone: "violet" },
  { label: "Tools", tone: "neutral" },
  { label: "Sub-agents", tone: "violet" },
  { label: "Trace", tone: "neutral" },
  { label: "Gemini", tone: "emerald" },
  { label: "Decision", tone: "amber" },
  { label: "Guardrails", tone: "emerald" },
];

function ribbonClasses(tone: RibbonTone): string {
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
