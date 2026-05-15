"use client";

/**
 * UX V2.2 §9 — Trace tab content.
 *
 * Hidden by default (Trace is the last tab and intentionally quiet —
 * brief V2.2 §10). Once a verdict has landed, this component surfaces:
 *
 *   - The raw `GeminiJudgeResult` (verdict, score, risks, policy gate,
 *     remediation plan…).
 *   - The audited input — scenario id / pasted trace / replay snapshot
 *     and mission prompt.
 *   - The optional after-guardrails verdict, when the user re-scored
 *     through the Policies tab.
 *
 * Pure presentational. The parent owns all state — we only render a
 * `<details>` per artefact and a single "Download verdict JSON" CTA so
 * judges can extract a machine-readable record.
 */
import { Download } from "lucide-react";
import { useCallback } from "react";

import type {
  GeminiJudgeResult,
  JudgeRunSnapshot,
} from "@/lib/control-tower/gemini-types";
import type { TraceScenario } from "@/lib/control-tower/scenarios";

interface TraceJsonInspectorProps {
  result: GeminiJudgeResult;
  afterResult: GeminiJudgeResult | null;
  activeScenario: TraceScenario | null;
  pastedTrace?: string;
  replaySnapshot?: JudgeRunSnapshot | null;
  replayMissionPrompt?: string;
}

export function TraceJsonInspector({
  result,
  afterResult,
  activeScenario,
  pastedTrace,
  replaySnapshot,
  replayMissionPrompt,
}: TraceJsonInspectorProps) {
  const onExport = useCallback(() => {
    try {
      const bundle = {
        verdict: result,
        afterGuardrails: afterResult ?? null,
        audited: {
          scenarioId: activeScenario?.id ?? null,
          pastedTrace: pastedTrace ? `${pastedTrace.slice(0, 8000)}` : null,
          replay: replaySnapshot
            ? {
                missionId: replaySnapshot.mission.id,
                missionPrompt: replayMissionPrompt ?? null,
                observability: replaySnapshot.observability,
                toolCallsCount: replaySnapshot.toolCalls.length,
              }
            : null,
        },
      };
      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const filename = `arcadeops-trace-${result.verdict}-${Date.now()}.json`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      // Swallow — the worst case is the user not getting the file.
    }
  }, [
    result,
    afterResult,
    activeScenario,
    pastedTrace,
    replaySnapshot,
    replayMissionPrompt,
  ]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Raw audit JSON · debug surface
          </span>
          <p className="text-xs leading-snug text-zinc-400">
            Inspect the verdict payload exchanged between Gemini and the
            ArcadeOps production gate, plus the audited input.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <Download className="h-3 w-3" aria-hidden />
          Download verdict JSON
        </button>
      </header>

      <JsonBlock label="Gemini verdict (before)" value={result} />

      {afterResult ? (
        <JsonBlock label="Gemini verdict (after guardrails)" value={afterResult} />
      ) : null}

      {activeScenario ? (
        <JsonBlock
          label={`Scenario · ${activeScenario.id}`}
          value={{
            id: activeScenario.id,
            title: activeScenario.title,
            riskLevel: activeScenario.riskLevel,
            expectedVerdict: activeScenario.expectedVerdict,
            observability: activeScenario.snapshot.observability,
            toolCallsCount: activeScenario.snapshot.toolCalls.length,
          }}
        />
      ) : null}

      {pastedTrace ? (
        <details className="group rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none font-mono text-[11px] text-zinc-300">
            Pasted trace · {pastedTrace.length} chars
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-zinc-300">
            {pastedTrace.slice(0, 8000)}
          </pre>
        </details>
      ) : null}

      {replaySnapshot ? (
        <JsonBlock
          label="Replay snapshot"
          value={{
            missionId: replaySnapshot.mission.id,
            missionPrompt: replayMissionPrompt ?? null,
            observability: replaySnapshot.observability,
            toolCallsCount: replaySnapshot.toolCalls.length,
          }}
        />
      ) : null}
    </section>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="group rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none font-mono text-[11px] text-zinc-300">
        {label}
      </summary>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-zinc-300">
        {safeStringify(value)}
      </pre>
    </details>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "<unserialisable>";
  }
}
