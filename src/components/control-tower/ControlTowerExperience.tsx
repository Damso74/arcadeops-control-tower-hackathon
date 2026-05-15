"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  GeminiJudgeResult,
  JudgeRequestBody,
  JudgeRunSnapshot,
} from "@/lib/control-tower/gemini-types";
import {
  DEFAULT_SCENARIO_ID,
  findScenarioById,
  TRACE_SCENARIOS,
  type TraceScenario,
} from "@/lib/control-tower/scenarios";
import { incrementCounter } from "@/lib/control-tower/scoreboard-store";
import { useGeminiJudge } from "@/lib/control-tower/use-gemini-judge";

import { CockpitMiniStatus, type MiniStatusState } from "./CockpitMiniStatus";
import { CockpitScoreboard, notifyScoreboardChange } from "./CockpitScoreboard";
import {
  CockpitTabs,
  TraceEmptyState,
  type CockpitTabId,
} from "./CockpitTabs";
import { DemoMissionLauncher } from "./DemoMissionLauncher";
import { GeminiScanTicker } from "./GeminiScanTicker";
import { GuardrailsPanel } from "./GuardrailsPanel";
import { InfrastructureProofCard } from "./InfrastructureProofCard";
import { ObservabilityPanel } from "./ObservabilityPanel";
import { PastedTraceInput } from "./PastedTraceInput";
import { ProductionPoliciesCard } from "./ProductionPoliciesCard";
import { ReadinessComparison } from "./ReadinessComparison";
import { ScenarioEvidenceTimeline } from "./ScenarioEvidenceTimeline";
import { SelectedRunSummaryCard } from "./SelectedRunSummaryCard";
import { TraceJsonInspector } from "./TraceJsonInspector";
import {
  TraceScenarioPicker,
  type ScenarioPickerSelection,
} from "./TraceScenarioPicker";
import { VerdictRevealCard } from "./VerdictRevealCard";

// V2.2 §3 — scoreboard kill-switch (decision §6-G in the master plan):
// scoreboard is ON by default, can be hidden in any environment by
// setting `NEXT_PUBLIC_SCOREBOARD=0` at build time.
const SCOREBOARD_ENABLED = process.env.NEXT_PUBLIC_SCOREBOARD !== "0";

const MAX_TRACE_CHARS = 12_000;

interface ControlTowerExperienceProps {
  liveAvailable: boolean;
}

/**
 * UX V2.2 — guided cockpit state machine.
 *
 * Flow that drives the new layout:
 *
 *   pick → inspect (after Select run) → decide (after Gemini verdict)
 *
 * Tabs sit *inside* the experience and only become meaningful once a
 * run is selected. Default tab after Select run is "summary" — the
 * brief V2.2 §10 mandates that Evidence / Policies / Infrastructure /
 * Trace stay hidden by default.
 *
 * Three input modes still feed the same Gemini judge call:
 *   - "scenario" — pre-canned trace (the wow path, default on mount)
 *   - "replay"   — original deterministic SSE replay (gated when live)
 *   - "pasted"   — user pasted their own trace
 *
 * Once a verdict lands the user can pick guardrails and re-score the
 * SAME trace as a what-if simulation. The before/after comparison
 * shows up automatically once both results are available.
 */
export function ControlTowerExperience({
  liveAvailable,
}: ControlTowerExperienceProps) {
  const [selection, setSelection] = useState<ScenarioPickerSelection>({
    mode: "scenario",
    scenarioId: DEFAULT_SCENARIO_ID,
  });
  const [pastedTrace, setPastedTrace] = useState<string>("");
  const [replaySnapshot, setReplaySnapshot] = useState<JudgeRunSnapshot | null>(
    null,
  );
  const [replayMissionPrompt, setReplayMissionPrompt] = useState<string>("");
  const [judgeBefore, setJudgeBefore] = useState<GeminiJudgeResult | null>(null);
  const [judgeAfter, setJudgeAfter] = useState<GeminiJudgeResult | null>(null);
  const [activeTab, setActiveTab] = useState<CockpitTabId>("summary");
  const [hasUserSelectedRun, setHasUserSelectedRun] = useState<boolean>(false);
  const [helperVisible, setHelperVisible] = useState<boolean>(false);

  // V2.2 §6 — Selected Run Summary anchor used to scroll into view on
  // every Select run click. The summary card is the only landing
  // surface inside the cockpit, so we scroll directly to it instead
  // of an outer wrapper.
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);
  const helperTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScenario = useMemo<TraceScenario | null>(
    () =>
      selection.mode === "scenario"
        ? findScenarioById(selection.scenarioId)
        : null,
    [selection],
  );

  const judgeRequestBody = useMemo<JudgeRequestBody | null>(() => {
    if (selection.mode === "scenario") {
      if (!activeScenario) return null;
      return { mode: "scenario_trace", scenarioId: activeScenario.id };
    }
    if (selection.mode === "pasted") {
      const trimmed = pastedTrace.trim();
      if (trimmed.length < 20 || trimmed.length > MAX_TRACE_CHARS) return null;
      return { mode: "pasted_trace", traceText: trimmed };
    }
    if (selection.mode === "replay") {
      if (!replaySnapshot) return null;
      return {
        mode: "sample_replay",
        runSnapshot: replaySnapshot,
        mission: replayMissionPrompt || undefined,
      };
    }
    return null;
  }, [
    selection.mode,
    activeScenario,
    pastedTrace,
    replaySnapshot,
    replayMissionPrompt,
  ]);

  // Stable identity used to wipe the verdict when the audited trace
  // changes. Same shape as the historical panel `key` prop so the
  // semantics are preserved end-to-end.
  const judgeKey = useMemo(() => {
    switch (selection.mode) {
      case "scenario":
        return `scenario:${activeScenario?.id ?? "none"}`;
      case "pasted":
        return `pasted:${pastedTrace.length}:${pastedTrace.slice(0, 32)}`;
      case "replay":
        return [
          "replay",
          replaySnapshot?.mission.id ?? "none",
          replaySnapshot?.observability.totalTokens ?? 0,
          replaySnapshot?.toolCalls.length ?? 0,
          replaySnapshot?.result.title ?? "",
        ].join("|");
      default:
        return "none";
    }
  }, [
    selection.mode,
    activeScenario?.id,
    pastedTrace,
    replaySnapshot,
  ]);

  const handleJudgeResult = useCallback(
    (result: GeminiJudgeResult) => {
      setJudgeBefore(result);
      setJudgeAfter(null);

      // V2.2 §3 — feed the cockpit scoreboard. Cost is sourced
      // from the audited snapshot when available (scenario / replay) and
      // omitted for free-form pasted traces.
      if (SCOREBOARD_ENABLED) {
        let costUsd: number | undefined;
        if (selection.mode === "scenario" && activeScenario) {
          costUsd = activeScenario.snapshot.observability.costUsd;
        } else if (selection.mode === "replay" && replaySnapshot) {
          costUsd = replaySnapshot.observability.costUsd;
        }
        const policyGateTriggered = result.policyGate?.triggered === true;
        incrementCounter({
          verdict: result.verdict,
          costUsd,
          policyGateTriggered,
        });
        notifyScoreboardChange();
      }

      // V2.2 §12 — once Gemini lands, snap to Summary so the verdict
      // is visible immediately. The VerdictRevealCard then auto-
      // scrolls the Gate Status into view.
      setActiveTab("summary");
    },
    [selection.mode, activeScenario, replaySnapshot],
  );

  const judge = useGeminiJudge({
    requestBody: judgeRequestBody,
    judgeKey,
    onResult: handleJudgeResult,
  });

  // V2.2 §6 — Select run is the new explicit step. Wipe both verdicts,
  // mark the user as having selected a run, default the active tab
  // back to Summary, scroll the Selected Run Summary into view, and
  // surface the helper text for ~6s.
  const handleSelect = useCallback((next: ScenarioPickerSelection) => {
    setSelection(next);
    setJudgeBefore(null);
    setJudgeAfter(null);
    setHasUserSelectedRun(true);
    setActiveTab("summary");
    setHelperVisible(true);
    if (helperTimeoutRef.current) clearTimeout(helperTimeoutRef.current);
    helperTimeoutRef.current = setTimeout(() => setHelperVisible(false), 6000);
    // Defer the scroll one frame so the summary card has a chance to
    // mount with the new selection — otherwise we scroll to the old
    // bounding box.
    requestAnimationFrame(() => {
      summaryAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (helperTimeoutRef.current) clearTimeout(helperTimeoutRef.current);
    };
  }, []);

  const handleReplaySnapshot = useCallback(
    (snapshot: JudgeRunSnapshot | null, prompt: string) => {
      setReplaySnapshot(snapshot);
      setReplayMissionPrompt(prompt);
      if (selection.mode === "replay") {
        setJudgeBefore(null);
        setJudgeAfter(null);
      }
    },
    [selection.mode],
  );

  const summaryMode = selection.mode;
  const summaryHint = ctaEmptyHintFor(selection.mode, judgeRequestBody);

  const guardrailsForActiveSource = useMemo<readonly string[]>(() => {
    if (selection.mode === "scenario" && activeScenario) {
      return activeScenario.recommendedGuardrails;
    }
    return [
      "Require human approval for destructive tools",
      "Block outbound messages without review",
      "Set per-tool cost limits",
      "Persist replay IDs for every run",
      "Record audit logs for write actions",
    ];
  }, [selection.mode, activeScenario]);

  const expectedVerdictForActive = useMemo(() => {
    if (selection.mode === "scenario" && activeScenario) {
      return activeScenario.expectedVerdict;
    }
    return null;
  }, [selection.mode, activeScenario]);

  const summaryPanel = (
    <div className="flex flex-col gap-5">
      <div ref={summaryAnchorRef} id="summary-anchor" className="scroll-mt-24" />

      <SelectedRunSummaryCard
        mode={summaryMode}
        scenario={activeScenario}
        verdict={judgeBefore}
        busy={judge.busy}
        ctaEnabled={Boolean(judgeRequestBody)}
        emptyHint={summaryHint}
        onRunGate={() => void judge.runJudge()}
      />

      {helperVisible && hasUserSelectedRun && !judgeBefore && !judge.busy ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2 text-xs text-emerald-100"
        >
          Run selected. Review the summary, then click <strong>Audit this
          run</strong>.
        </p>
      ) : null}

      {/* Mode-specific paste / replay surfaces stay in the Summary tab
          when those are the active mode — judges should not have to
          dig into Evidence to type or stream a custom trace. */}
      {selection.mode === "pasted" ? (
        <section
          aria-label="Paste your own trace"
          className="flex flex-col gap-3"
        >
          <PastedTraceInput
            value={pastedTrace}
            onChange={setPastedTrace}
            onLoadUnsafe={() => {
              const unsafe = findScenarioById("blocked_crm_write_agent");
              if (unsafe) {
                setPastedTrace(unsafe.traceText);
                setJudgeBefore(null);
                setJudgeAfter(null);
              }
            }}
            onLoadSafe={() => {
              const safe = findScenarioById("ready_research_agent");
              if (safe) {
                setPastedTrace(safe.traceText);
                setJudgeBefore(null);
                setJudgeAfter(null);
              }
            }}
            onLoadMultiAgent={() => {
              const multi = findScenarioById("multi_agent_escalation");
              if (multi) {
                setPastedTrace(multi.traceText);
                setJudgeBefore(null);
                setJudgeAfter(null);
              }
            }}
            onClear={() => {
              setPastedTrace("");
              setJudgeBefore(null);
              setJudgeAfter(null);
            }}
            maxChars={MAX_TRACE_CHARS}
          />
        </section>
      ) : null}

      {selection.mode === "replay" ? (
        <section
          aria-label="Deterministic replay"
          className="flex flex-col gap-3"
        >
          <DemoMissionLauncher
            liveAvailable={liveAvailable}
            onSnapshotReady={handleReplaySnapshot}
          />
        </section>
      ) : null}

      {/* V2.2 §11 — purposeful Gemini scan animation while the audit
          is in flight. Replaces the previous panel-internal ticker. */}
      {judge.busy ? <GeminiScanTicker /> : null}

      {judge.state.status === "error" ? (
        <p
          role="status"
          className="rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {judge.state.message}
        </p>
      ) : null}

      {/* V2.2 §13 — cinematic verdict reveal, integrated into Summary so
          the result lands without making the user navigate. */}
      {judgeBefore ? (
        <VerdictRevealCard
          result={judgeBefore}
          expectedVerdict={expectedVerdictForActive}
          lastAuditLatencyMs={judge.lastAuditLatencyMs}
        />
      ) : null}

      {/* Before/After is part of Summary so the wow-moment frame is
          visible immediately after the first verdict. */}
      {judgeBefore ? (
        <ReadinessComparison
          before={judgeBefore}
          after={judgeAfter}
          showPlaceholderWhenAfterMissing
        />
      ) : null}
    </div>
  );

  const evidencePanel = (
    <div className="flex flex-col gap-5">
      {selection.mode === "scenario" && activeScenario ? (
        <>
          <ScenarioEvidenceTimeline scenario={activeScenario} />
          <ObservabilityPanel
            observability={activeScenario.snapshot.observability}
            compact
          />
        </>
      ) : null}
      {selection.mode === "pasted" ? (
        <PastedTraceInput
          value={pastedTrace}
          onChange={setPastedTrace}
          onLoadUnsafe={() => {
            const unsafe = findScenarioById("blocked_crm_write_agent");
            if (unsafe) {
              setPastedTrace(unsafe.traceText);
              setJudgeBefore(null);
              setJudgeAfter(null);
            }
          }}
          onLoadSafe={() => {
            const safe = findScenarioById("ready_research_agent");
            if (safe) {
              setPastedTrace(safe.traceText);
              setJudgeBefore(null);
              setJudgeAfter(null);
            }
          }}
          onLoadMultiAgent={() => {
            const multi = findScenarioById("multi_agent_escalation");
            if (multi) {
              setPastedTrace(multi.traceText);
              setJudgeBefore(null);
              setJudgeAfter(null);
            }
          }}
          onClear={() => {
            setPastedTrace("");
            setJudgeBefore(null);
            setJudgeAfter(null);
          }}
          maxChars={MAX_TRACE_CHARS}
        />
      ) : null}
      {selection.mode === "replay" ? (
        <DemoMissionLauncher
          liveAvailable={liveAvailable}
          onSnapshotReady={handleReplaySnapshot}
        />
      ) : null}
    </div>
  );

  const policiesPanel = (
    <div className="flex flex-col gap-4">
      <ProductionPoliciesCard result={judgeBefore} />
      {judgeBefore ? (
        <GuardrailsPanel
          key={`guardrails:${judgeKey}`}
          remediationSource={remediationSourceFor(
            selection.mode,
            activeScenario,
            replaySnapshot,
            replayMissionPrompt,
            pastedTrace,
          )}
          recommendedGuardrails={guardrailsForActiveSource}
          initialSelectedGuardrails={
            activeScenario?.defaultSelectedGuardrails ?? []
          }
          afterResult={judgeAfter}
          onAfterResult={setJudgeAfter}
        />
      ) : null}
    </div>
  );

  const infrastructurePanel = (
    <div className="flex flex-col gap-4">
      <InfrastructureProofCard
        lastAuditLatencyMs={judge.lastAuditLatencyMs}
      />
    </div>
  );

  const tracePanel = (
    <div className="flex flex-col gap-4">
      {judgeBefore ? (
        <TraceJsonInspector
          result={judgeBefore}
          afterResult={judgeAfter}
          activeScenario={activeScenario}
          pastedTrace={
            selection.mode === "pasted" ? pastedTrace : undefined
          }
          replaySnapshot={
            selection.mode === "replay" ? replaySnapshot : undefined
          }
          replayMissionPrompt={
            selection.mode === "replay" ? replayMissionPrompt : undefined
          }
        />
      ) : (
        <TraceEmptyState />
      )}
    </div>
  );

  const tabPanels: Partial<Record<CockpitTabId, React.ReactNode>> = {
    summary: summaryPanel,
    evidence: evidencePanel,
    policies: policiesPanel,
    infrastructure: infrastructurePanel,
    trace: tracePanel,
  };

  // Pulse hint — flag the freshly-relevant tabs so the user discovers
  // them after the verdict lands without forcing the navigation.
  const tabPulse: Partial<Record<CockpitTabId, boolean>> = {
    evidence: judgeBefore !== null,
    policies: judgeBefore?.policyGate?.triggered === true,
  };

  // P0-6 — sticky 1-line status that always tells a reviewer where the
  // production decision sits, even if the verdict card has scrolled out
  // of view. Updates derive directly from the same Gemini judge state.
  const miniStatus: MiniStatusState = judge.busy
    ? { kind: "auditing" }
    : judgeBefore
      ? { kind: "verdict", verdict: judgeBefore.verdict }
      : { kind: "idle" };

  return (
    <div className="flex flex-col gap-8">
      {/* P0-6 — sticky mini-status. First thing visible inside the
          cockpit so the reviewer can read the current decision in one
          glance. */}
      <CockpitMiniStatus state={miniStatus} />

      {/* V2.2 §3 — Cockpit scoreboard pinned right under the compact
          dashboard header. Hidden in any env via
          `NEXT_PUBLIC_SCOREBOARD=0` (decision §6-G). */}
      {SCOREBOARD_ENABLED ? <CockpitScoreboard /> : null}

      <div id="pick" className="scroll-mt-24">
        <TraceScenarioPicker
          scenarios={TRACE_SCENARIOS}
          selection={selection}
          onSelect={handleSelect}
          showReplayLink={liveAvailable}
        />
      </div>

      <CockpitTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        panels={tabPanels}
        pulse={tabPulse}
      />
    </div>
  );
}

function ctaEmptyHintFor(
  mode: ScenarioPickerSelection["mode"],
  body: JudgeRequestBody | null,
): string | null {
  if (body) return null;
  switch (mode) {
    case "scenario":
      return "Pick a run above to audit it.";
    case "pasted":
      return "Paste a run log (≥ 20 characters) to audit it.";
    case "replay":
    default:
      return "Replay the safe sample first — Gemini needs the streamed run before it can audit.";
  }
}

function remediationSourceFor(
  mode: ScenarioPickerSelection["mode"],
  scenario: TraceScenario | null,
  replaySnapshot: JudgeRunSnapshot | null,
  replayMissionPrompt: string,
  pastedTrace: string,
):
  | { kind: "scenario"; scenarioId: string }
  | {
      kind: "snapshot";
      runSnapshot: JudgeRunSnapshot;
      mission?: string;
    }
  | { kind: "pasted"; traceText: string } {
  if (mode === "scenario" && scenario) {
    return { kind: "scenario", scenarioId: scenario.id };
  }
  if (mode === "replay" && replaySnapshot) {
    return {
      kind: "snapshot",
      runSnapshot: replaySnapshot,
      mission: replayMissionPrompt || undefined,
    };
  }
  return { kind: "pasted", traceText: pastedTrace.trim() };
}
