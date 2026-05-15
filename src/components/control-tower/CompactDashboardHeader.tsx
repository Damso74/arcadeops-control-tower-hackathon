"use client";

/**
 * UX V2.2 §1 + §2 — Compact security audit dashboard header.
 *
 * Replaces the V0–V5 hero with a tight enterprise-cockpit header that
 * sits above the fold on 1080p. Contents:
 *
 *   - Brand emblem (BrandLogoMark) + Product mark (ArcadeOps Control Tower)
 *   - Page title  : "Production Security Audit"
 *   - Subtitle    : "Audit autonomous agent runs before they reach production."
 *   - Punchline   : V2 main line ("Gemini judges. Vultr runs. ArcadeOps blocks
 *                   unsafe autonomous agents before production.") — same string
 *                   as `/`, README, deck, video script (do NOT change wording).
 *   - Badges      : Live Gemini Audit / Deterministic Replay (runtime detect)
 *                   + Vultr Online (when health probe passes) + Production Gate.
 *
 * Live/Replay detection is performed via /api/capabilities (same logic
 * the GeminiJudgePanel uses). Vultr Online badge piggy-backs on the
 * existing `pollHealth` helper — a single shared poll keeps the
 * network footprint tiny.
 */
import { Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import {
  type HealthSnapshot,
  pollHealth,
} from "@/lib/control-tower/health-probe";

import { BrandLogoMark } from "./BrandLogoMark";

interface CapabilitiesResponse {
  gemini: { available: boolean; model: string | null };
}

export function CompactDashboardHeader() {
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthSnapshot["status"] | null>(
    null,
  );

  // One-shot capabilities probe. Failures default to "replay mode" so
  // the header never half-loads. Same defensive pattern as the judge
  // panel.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/capabilities", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as CapabilitiesResponse;
        if (!cancelled) {
          setGeminiAvailable(Boolean(data.gemini?.available));
        }
      } catch {
        if (!cancelled) setGeminiAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Health polling (30s) for the Vultr Online badge. Initial render
  // shows nothing — the cell stays empty until the first probe lands
  // so we never lie about the runtime state.
  useEffect(() => {
    const stop = pollHealth(
      (snapshot) => setHealthStatus(snapshot.status),
      { intervalMs: 30_000 },
    );
    return stop;
  }, []);

  return (
    <header className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/60 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20"
        >
          <BrandLogoMark className="h-6 w-6" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          ArcadeOps Control Tower
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Production Security Audit
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
          Audit autonomous agent runs before they reach production.
        </p>
        {/* V2 punchline — verbatim across `/`, README, video, deck. */}
        <p className="max-w-3xl text-balance text-sm font-semibold text-emerald-200 sm:text-base">
          Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents
          before production.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ProductionGateBadge />
        <GeminiModeBadge available={geminiAvailable} />
        <VultrBadge status={healthStatus} />
      </div>
    </header>
  );
}

function ProductionGateBadge() {
  return (
    <span
      aria-label="Production Gate"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200"
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      Production Gate
    </span>
  );
}

function GeminiModeBadge({ available }: { available: boolean | null }) {
  // While we are still discovering capabilities, render a discreet
  // pending badge. Same UX as the judge panel — keeps the audience
  // out of the half-loaded state.
  if (available === null) {
    return (
      <span
        aria-label="Detecting Gemini mode"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300"
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        Detecting mode…
      </span>
    );
  }
  if (available) {
    return (
      <span
        aria-label="Live Gemini audit"
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200"
      >
        <Zap className="h-3 w-3" aria-hidden />
        Live Gemini Audit
      </span>
    );
  }
  return (
    <span
      aria-label="Deterministic replay"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200"
    >
      <Radio className="h-3 w-3" aria-hidden />
      Deterministic Replay
    </span>
  );
}

function VultrBadge({ status }: { status: HealthSnapshot["status"] | null }) {
  // No probe landed yet — keep the badge hidden so we never lie about
  // the runtime state.
  if (status === null) return null;
  if (status === "online") {
    return (
      <span
        aria-label="Vultr runtime online"
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200"
      >
        <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400/40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
        </span>
        Vultr Online
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span
        aria-label="Vultr runtime degraded"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200"
      >
        Vultr Degraded
      </span>
    );
  }
  return (
    <span
      aria-label="Vultr runtime offline"
      className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-200"
    >
      Vultr Offline
    </span>
  );
}
