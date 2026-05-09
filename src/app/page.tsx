import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-300">
          ArcadeOps · Hackathon demo
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          ArcadeOps Control Tower
        </h1>
        <p className="max-w-xl text-lg text-zinc-300">
          Mission control for autonomous AI agents — from mission to audit
          trail in 90 seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/control-tower"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
          >
            Enter Control Tower
          </Link>
          <a
            href="https://github.com/Damso74/arcadeops-control-tower-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/10"
          >
            View on GitHub
          </a>
        </div>
        <p className="text-xs text-zinc-500">
          Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.
        </p>
      </main>
    </div>
  );
}
