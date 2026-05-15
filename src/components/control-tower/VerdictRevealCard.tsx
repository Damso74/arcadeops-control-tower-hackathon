"use client";

/**
 * UX V2.2 §13 — Cinematic verdict reveal.
 *
 * Wraps the historical `JudgeResultView` with a top-of-card Gate
 * Status banner so the SHIP / NEEDS REVIEW / BLOCKED + Gate
 * Open / Paused / Closed pair is the first thing the user sees once
 * Gemini lands — without forcing them to scroll inside the result
 * card.
 *
 * The actual decision tile (score dial, copy/export buttons,
 * expected-vs-actual badge, top risks…) is rendered by
 * `JudgeResultView`, which we reuse verbatim — no behaviour change,
 * no risky duplication. We only wire two extra knobs:
 *
 *   - The Gate Status banner sits above the JudgeResultView so the
 *     gate metaphor is reinforced before the cockpit shows reasons.
 *   - The InfrastructureProofCard is hidden inside the verdict card
 *     because the V2.2 cockpit surfaces it through the Infrastructure
 *     tab instead.
 */
import { useEffect, useRef } from "react";

import {
  JudgeResultView,
  verdictPalette,
} from "@/components/control-tower/GeminiJudgePanel";
import type {
  GeminiJudgeResult,
  GeminiVerdict,
} from "@/lib/control-tower/gemini-types";

import { GateStatus } from "./GateStatus";

interface VerdictRevealCardProps {
  result: GeminiJudgeResult;
  /** Optional canonical scenario expected verdict for the badge. */
  expectedVerdict: GeminiVerdict | null;
  /** Real round-trip latency surfaced by the parent's judge hook. */
  lastAuditLatencyMs: number | null;
  /** Auto-scroll the gate status into view when the card mounts. */
  autoScrollOnMount?: boolean;
}

export function VerdictRevealCard({
  result,
  expectedVerdict,
  lastAuditLatencyMs,
  autoScrollOnMount = true,
}: VerdictRevealCardProps) {
  const palette = verdictPalette(result.verdict);
  const subtitle = subtitleForVerdict(result.verdict);
  const businessImpact = businessImpactForVerdict(result.verdict);
  const gateRef = useRef<HTMLDivElement | null>(null);

  // V2.2 §12 — once the verdict lands, scroll the Gate Status into
  // view so judges never hunt for the result on a 1080p laptop. The
  // parent already auto-flips the active step to "decide" on judge
  // result; this scroll completes the move into the decision state.
  useEffect(() => {
    if (!autoScrollOnMount) return;
    gateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [autoScrollOnMount]);

  return (
    <article
      data-testid="verdict-reveal"
      data-verdict={result.verdict}
      className={`relative flex animate-[verdictFadeIn_400ms_ease-out] flex-col gap-5 overflow-hidden rounded-2xl border p-5 sm:p-6 ${palette.cardBorder} ${palette.cardBg}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${palette.aura}`}
      />

      {/* Gate status banner — full-width, hero size, drives the wow. */}
      <div ref={gateRef} className="scroll-mt-24">
        <GateBanner
          result={result}
          subtitle={subtitle}
          businessImpact={businessImpact}
        />
      </div>

      {/* Detail layer — score dial, copy/export, top risks, etc. */}
      <JudgeResultView
        result={result}
        expectedVerdict={expectedVerdict}
        lastAuditLatencyMs={lastAuditLatencyMs}
        showInfrastructureProof={false}
      />

      {/* Compact 1-line proof strip — what was used + where it ran + an
          obvious export hook. Keeps "this was a real audit" visible
          without making the technical surface scream for attention. */}
      <ProofStrip />

      <style>{`
        @keyframes verdictFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}

function GateBanner({
  result,
  subtitle,
  businessImpact,
}: {
  result: GeminiJudgeResult;
  subtitle: string;
  businessImpact: string;
}) {
  const palette = verdictPalette(result.verdict);
  const headline = headlineForVerdict(result.verdict);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-2">
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${palette.classes}`}
        >
          {headline}
        </span>
        <p className="text-base font-semibold text-zinc-100 sm:text-lg">
          {subtitle}
        </p>
        {/* Plain-English business impact line — P0 brief mandates this is
            the dominant narrative under the verdict banner. */}
        <p className="text-sm text-zinc-300 sm:text-base">{businessImpact}</p>
      </div>
      <GateStatus verdict={result.verdict} size="hero" />
    </div>
  );
}

function headlineForVerdict(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "BLOCKED — DO NOT SHIP";
    case "needs_review":
      return "NEEDS REVIEW";
    case "ready":
    default:
      return "READY TO SHIP";
  }
}

function subtitleForVerdict(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "Stopped before customer impact.";
    case "needs_review":
      return "Human approval required before production.";
    case "ready":
    default:
      return "Safe to ship with monitoring.";
  }
}

function businessImpactForVerdict(verdict: GeminiVerdict): string {
  switch (verdict) {
    case "blocked":
      return "Prevented unsafe CRM write and customer email before production.";
    case "needs_review":
      return "Paused the run until a human approves the risky action.";
    case "ready":
    default:
      return "Approved a read-only agent run with complete audit evidence.";
  }
}

/**
 * Single-line proof bar rendered immediately under the verdict body.
 * Uses the existing infrastructure proof + judge metadata (Gemini model,
 * Vultr region, JSON export hook) without duplicating any of those
 * cards. Clicking the export hint scrolls to the verdict export buttons
 * already inside `JudgeResultView`.
 */
function ProofStrip() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
      <span className="font-mono text-zinc-400">Gemini 2.5 Flash</span>
      <span aria-hidden>·</span>
      <span className="font-mono text-zinc-400">Vultr Frankfurt</span>
      <span aria-hidden>·</span>
      <span className="font-mono text-zinc-400">Exportable JSON verdict</span>
    </p>
  );
}
