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

import { DemoMissionLauncher } from "./DemoMissionLauncher";
import { GeminiJudgePanel } from "./GeminiJudgePanel";
import { GuardrailsPanel } from "./GuardrailsPanel";
import { ObservabilityPanel } from "./ObservabilityPanel";
import { PastedTraceInput } from "./PastedTraceInput";
import { ReadinessComparison } from "./ReadinessComparison";
import { ScenarioEvidenceTimeline } from "./ScenarioEvidenceTimeline";
import {
  TraceScenarioPicker,
  type ScenarioPickerSelection,
} from "./TraceScenarioPicker";

const MAX_TRACE_CHARS = 12_000;

interface ControlTowerExperienceProps {
  liveAvailable: boolean;
}

/**
 * Top-level state machine for the production-gate flow.
 *
 * Three input modes feed a single Gemini judge call:
 *   - "scenario" — pre-canned trace (the wow path)
 *   - "replay"   — original V0–V3 deterministic SSE replay
 *   - "pasted"   — user pasted their own trace
 *
 * After the first verdict, the user can pick guardrails and re-score the
 * SAME trace as a what-if simulation. The before/after comparison shows
 * up automatically once both results are available.
 *
 * We deliberately do not "auto-run" Gemini on load — every judge call is
 * triggered by an explicit user action.
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

  // Lot 1a (P0#5) — once the first verdict lands, scroll the judge
  // section into view so the wow moment is never below the fold on
  // 1080p screens. We intentionally fire on every transition to a
  // non-null judgeBefore (re-runs included), since each one is a
  // fresh "first verdict" against the currently audited trace.
  const judgeSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!judgeBefore) return;
    judgeSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [judgeBefore]);

  const activeScenario = useMemo<TraceScenario | null>(
    () =>
      selection.mode === "scenario"
        ? findScenarioById(selection.scenarioId)
        : null,
    [selection],
  );

  const handleSelect = useCallback(
    (next: ScenarioPickerSelection) => {
      // Wipe both verdicts whenever the user changes the audited trace —
      // a stale "before" against a different run would lie to the judge.
      setSelection(next);
      setJudgeBefore(null);
      setJudgeAfter(null);
    },
    [],
  );

  const handleReplaySnapshot = useCallback(
    (snapshot: JudgeRunSnapshot | null, prompt: string) => {
      setReplaySnapshot(snapshot);
      setReplayMissionPrompt(prompt);
      // If the user starts a new replay run while a verdict is already on
      // screen, drop both — the next click will re-judge against the
      // freshly streamed snapshot.
      if (selection.mode === "replay") {
        setJudgeBefore(null);
        setJudgeAfter(null);
      }
    },
    [selection.mode],
  );

  // Build the judge request body for the currently selected mode. Returns
  // `null` while the input is incomplete (no scenario, empty paste, no
  // replay snapshot yet) — the panel uses that to disable its button.
  const judgeRequestBody = useMemo<JudgeRequestBody | null>(() => {
    if (selection.mode === "scenario") {
      if (!activeScenario) return null;
      return {
        mode: "scenario_trace",
        scenarioId: activeScenario.id,
      };
    }
    if (selection.mode === "pasted") {
      const trimmed = pastedTrace.trim();
      if (trimmed.length < 20 || trimmed.length > MAX_TRACE_CHARS) return null;
      return {
        mode: "pasted_trace",
        traceText: trimmed,
      };
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

  // Stable key used to remount the judge panel when the audited trace
  // identity changes. Without this, an in-flight Gemini call from a
  // previous scenario could surface a stale verdict against the new one.
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

  const handleJudgeBefore = useCallback((result: GeminiJudgeResult) => {
    setJudgeBefore(result);
    // Always wipe the after-result when the user re-runs the main judge —
    // the re-score must match the latest verdict, not a stale one.
    setJudgeAfter(null);
  }, []);

  const guardrailsForActiveSource = useMemo<readonly string[]>(() => {
    if (selection.mode === "scenario" && activeScenario) {
      return activeScenario.recommendedGuardrails;
    }
    // For pasted / replay traces we cannot know which guardrails are
    // "recommended" without re-asking Gemini — fall back to the highest-
    // value 5 from the catalogue.
    return [
      "Require human approval for destructive tools",
      "Block outbound messages without review",
      "Set per-tool cost limits",
      "Persist replay IDs for every run",
      "Record audit logs for write actions",
    ];
  }, [selection.mode, activeScenario]);

  return (
    <div className="flex flex-col gap-8">
      <TraceScenarioPicker
        scenarios={TRACE_SCENARIOS}
        selection={selection}
        onSelect={handleSelect}
        showReplayLink={liveAvailable}
      />

      {/* Mode-specific input panel */}
      {selection.mode === "scenario" && activeScenario ? (
        <section className="flex flex-col gap-5">
          <ScenarioEvidenceTimeline scenario={activeScenario} />
          <ObservabilityPanel
            observability={activeScenario.snapshot.observability}
            compact
          />
        </section>
      ) : null}

      {selection.mode === "pasted" ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              2 · Paste your trace
            </h2>
          </header>

          <PastedTraceInput
            value={pastedTrace}
            onChange={setPastedTrace}
            onLoadExample={() => {
              const unsafe = findScenarioById(DEFAULT_SCENARIO_ID);
              if (unsafe) setPastedTrace(unsafe.traceText);
            }}
            onClear={() => setPastedTrace("")}
            maxChars={MAX_TRACE_CHARS}
          />
        </section>
      ) : null}

      {selection.mode === "replay" ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              2 · Replay the safe sample
            </h2>
            <p className="text-sm text-zinc-300">
              Deterministic SSE replay of the bundled trace. Stream phases,
              tool calls and observability metrics — then let Gemini judge
              the run.
            </p>
          </header>

          <DemoMissionLauncher
            liveAvailable={liveAvailable}
            onSnapshotReady={handleReplaySnapshot}
          />
        </section>
      ) : null}

      {/* Reliability judge */}
      <section ref={judgeSectionRef} className="flex flex-col gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          3 · Gemini decides: ship, review or block
        </h2>
        <GeminiJudgePanel
          key={judgeKey}
          requestBody={judgeRequestBody}
          onResult={handleJudgeBefore}
          actionLabel={actionLabelFor(selection.mode)}
          emptyHint={emptyHintFor(selection.mode)}
        />
      </section>

      {/* Guardrails + re-score (only shown after the first verdict) */}
      {judgeBefore ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            4 · Add guardrails &amp; re-score
          </h2>
          <ReadinessComparison before={judgeBefore} after={judgeAfter} />
          <GuardrailsPanel
            // Remount the panel when the audited trace changes so the
            // checkbox state never carries over between runs.
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
        </section>
      ) : null}
    </div>
  );
}

function actionLabelFor(mode: ScenarioPickerSelection["mode"]): string {
  switch (mode) {
    case "scenario":
      return "Run Gemini judge";
    case "pasted":
      return "Judge pasted trace";
    case "replay":
    default:
      return "Run Gemini reliability judge";
  }
}

function emptyHintFor(mode: ScenarioPickerSelection["mode"]): string {
  switch (mode) {
    case "scenario":
      return "Pick a scenario above to enable the judge.";
    case "pasted":
      return "Paste a trace (≥ 20 characters) to enable the judge.";
    case "replay":
    default:
      return "Replay the safe sample first — Gemini needs the streamed snapshot before it can judge.";
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
  // Fall back to pasted text — even if the user has nothing useful in the
  // textarea right now, the panel itself forces a wipe between modes.
  return { kind: "pasted", traceText: pastedTrace.trim() };
}
