"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileWarning,
  Globe,
  HelpCircle,
  Send,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ScenarioEvidence, TraceScenario } from "@/lib/control-tower/scenarios";

import { Disclosure } from "./Disclosure";

interface ScenarioEvidenceTimelineProps {
  scenario: TraceScenario;
}

/**
 * Decision-first evidence panel.
 *
 *   - 4 key items visible immediately, picked to match the scenario tone.
 *   - The full evidence list lives behind "View full evidence", so the
 *     judge can drill in only when they want to.
 */
export function ScenarioEvidenceTimeline({
  scenario,
}: ScenarioEvidenceTimelineProps) {
  const keyItems = pickKeyEvidence(scenario);
  const remaining = scenario.evidence.filter(
    (e) => !keyItems.some((k) => k.kind === e.kind && k.label === e.label),
  );

  return (
    <section className="flex flex-col gap-3" aria-label="Key evidence">
      <header className="flex flex-col gap-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          2 · Inspect key evidence
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400">
          These are the signals Gemini will use before making a production
          decision.
        </p>
      </header>

      <ul className="grid gap-2 md:grid-cols-2">
        {keyItems.map((entry, idx) => (
          <li key={`${entry.kind}-${idx}`}>
            <EvidenceCard entry={entry} />
          </li>
        ))}
      </ul>

      {remaining.length > 0 ? (
        <Disclosure
          label="View full evidence"
          hint={`${remaining.length} more`}
        >
          <ul className="grid gap-2 md:grid-cols-2">
            {remaining.map((entry, idx) => (
              <li key={`extra-${entry.kind}-${idx}`}>
                <EvidenceCard entry={entry} />
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

function EvidenceCard({ entry }: { entry: ScenarioEvidence }) {
  const palette = tonePalette(entry.tone);
  return (
    <article
      className={`flex items-start gap-3 rounded-lg border ${palette.border} ${palette.bg} px-4 py-3`}
    >
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md ${palette.iconBg} ${palette.text}`}
      >
        {renderEvidenceIcon(entry.kind, entry.tone)}
      </span>
      <div className="flex-1">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wider ${palette.text}`}
        >
          {entry.kind}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-100">
          {entry.label}
        </p>
      </div>
    </article>
  );
}

/**
 * Hand-pick the most important evidence items per scenario tone so the
 * decision-first view never shows 7 cards on first paint. Items not
 * surfaced here remain accessible behind the disclosure.
 */
function pickKeyEvidence(scenario: TraceScenario): ScenarioEvidence[] {
  const desiredKinds = preferredKindsFor(scenario.expectedVerdict);
  const picked: ScenarioEvidence[] = [];
  for (const target of desiredKinds) {
    const match = scenario.evidence.find((e) =>
      e.kind.toLowerCase() === target.toLowerCase(),
    );
    if (match && !picked.includes(match)) picked.push(match);
    if (picked.length >= 4) break;
  }
  // Fallback: top up from the head of the list if not enough hits.
  for (const e of scenario.evidence) {
    if (picked.length >= 4) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked.slice(0, 4);
}

function preferredKindsFor(
  verdict: TraceScenario["expectedVerdict"],
): string[] {
  switch (verdict) {
    case "blocked":
      return [
        "Destructive action",
        "Outbound action",
        "Cost",
        "Audit gap",
        "Tool call",
        "Final output",
      ];
    case "needs_review":
      return [
        "Tool call",
        "Missing control",
        "Audit gap",
        "Plan",
      ];
    case "ready":
    default:
      return [
        "Tool call",
        "Output",
        "Cost",
        "Audit",
        "Plan",
      ];
  }
}

function renderEvidenceIcon(
  kind: string,
  tone: ScenarioEvidence["tone"],
): ReactNode {
  const className = "h-4 w-4";
  const k = kind.toLowerCase();
  if (k.includes("destructive")) {
    return <Trash2 className={className} aria-hidden />;
  }
  if (k.includes("outbound")) {
    return <Send className={className} aria-hidden />;
  }
  if (k.includes("cost")) {
    return <DollarSign className={className} aria-hidden />;
  }
  if (k.includes("audit")) {
    return <FileWarning className={className} aria-hidden />;
  }
  if (k.includes("missing")) {
    return <AlertTriangle className={className} aria-hidden />;
  }
  if (k.includes("tool")) {
    return <Activity className={className} aria-hidden />;
  }
  if (k.includes("plan")) {
    return <ClipboardCheck className={className} aria-hidden />;
  }
  if (k.includes("output") || k.includes("final")) {
    return tone === "positive" ? (
      <CheckCircle2 className={className} aria-hidden />
    ) : (
      <FileWarning className={className} aria-hidden />
    );
  }
  if (k.includes("external")) {
    return <Globe className={className} aria-hidden />;
  }
  return <HelpCircle className={className} aria-hidden />;
}

function tonePalette(tone: ScenarioEvidence["tone"]): {
  border: string;
  bg: string;
  iconBg: string;
  text: string;
} {
  switch (tone) {
    case "danger":
      return {
        border: "border-red-400/30",
        bg: "bg-red-400/[0.05]",
        iconBg: "bg-red-400/15",
        text: "text-red-200",
      };
    case "warning":
      return {
        border: "border-amber-400/30",
        bg: "bg-amber-400/[0.05]",
        iconBg: "bg-amber-400/15",
        text: "text-amber-200",
      };
    case "positive":
      return {
        border: "border-emerald-400/30",
        bg: "bg-emerald-400/[0.04]",
        iconBg: "bg-emerald-400/15",
        text: "text-emerald-200",
      };
    case "neutral":
    default:
      return {
        border: "border-white/10",
        bg: "bg-white/[0.03]",
        iconBg: "bg-white/10",
        text: "text-zinc-300",
      };
  }
}
