"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { JudgeRunSnapshot } from "@/lib/control-tower/gemini-types";
import { subscribeToControlTower } from "@/lib/control-tower/sse";
import {
  DEMO_MISSIONS,
  type ControlTowerEvent,
  type ControlTowerMode,
  type ControlTowerObservability,
  type ControlTowerPhase,
  type ControlTowerResult,
  type ControlTowerStatus,
  type MissionCard,
} from "@/lib/control-tower/types";

import { EventTimeline, type TimelineEntry } from "./EventTimeline";
import { ModeBadge } from "./ModeBadge";
import { ObservabilityPanel } from "./ObservabilityPanel";
import { PhasePills } from "./PhasePills";
import { ResultCard } from "./ResultCard";
import { ToolCallCard, type ToolCallView } from "./ToolCallCard";

interface DemoMissionLauncherProps {
  liveAvailable: boolean;
  /**
   * Notified once observability + result are both available for the current
   * run. Used by the parent to feed the Gemini Reliability Judge. Receives
   * `null` whenever the user resets or starts a new run.
   */
  onSnapshotReady?: (snapshot: JudgeRunSnapshot | null, missionPrompt: string) => void;
}

type RunStatus = "idle" | "running" | "completed" | "error";

interface RunState {
  status: RunStatus;
  mode: ControlTowerMode;
  phaseStatuses: Partial<Record<ControlTowerPhase, ControlTowerStatus>>;
  timeline: TimelineEntry[];
  toolCalls: ToolCallView[];
  observability: Omit<ControlTowerObservability, "type"> | null;
  result: Omit<ControlTowerResult, "type"> | null;
  error: string | null;
}

const INITIAL_STATE: RunState = {
  status: "idle",
  mode: "replay",
  phaseStatuses: {},
  timeline: [],
  toolCalls: [],
  observability: null,
  result: null,
  error: null,
};

export function DemoMissionLauncher({
  liveAvailable,
  onSnapshotReady,
}: DemoMissionLauncherProps) {
  const [selectedMissionId, setSelectedMissionId] = useState<string>(
    DEMO_MISSIONS.find((m) => m.default)?.id ?? DEMO_MISSIONS[0].id,
  );
  const [state, setState] = useState<RunState>(INITIAL_STATE);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const toolCallIndexRef = useRef<Map<string, number>>(new Map());
  const lastSnapshotKeyRef = useRef<string | null>(null);

  const selectedMission = useMemo<MissionCard>(
    () =>
      DEMO_MISSIONS.find((m) => m.id === selectedMissionId) ?? DEMO_MISSIONS[0],
    [selectedMissionId],
  );

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  // Build and publish the JudgeRunSnapshot whenever a run reaches a state
  // where observability + result are both populated. We dedupe with a key
  // so we don't fire the callback on every unrelated re-render.
  useEffect(() => {
    if (!onSnapshotReady) return;
    const ready =
      state.observability !== null &&
      state.result !== null &&
      (state.status === "completed" || state.status === "running");
    if (!ready) {
      if (lastSnapshotKeyRef.current !== null) {
        lastSnapshotKeyRef.current = null;
        onSnapshotReady(null, missionPromptFor(selectedMission));
      }
      return;
    }
    const snapshot = buildSnapshot(state, selectedMission);
    const key = JSON.stringify({
      mid: snapshot.mission.id,
      cost: snapshot.observability.costUsd,
      tokens: snapshot.observability.totalTokens,
      tools: snapshot.toolCalls.length,
      title: snapshot.result.title,
    });
    if (key === lastSnapshotKeyRef.current) return;
    lastSnapshotKeyRef.current = key;
    onSnapshotReady(snapshot, missionPromptFor(selectedMission));
  }, [onSnapshotReady, selectedMission, state]);

  const handleEvent = useCallback((event: ControlTowerEvent) => {
    setState((prev) => applyEvent(prev, event, toolCallIndexRef.current));
  }, []);

  const startRun = useCallback(
    (mode: ControlTowerMode) => {
      // Cancel any in-flight run before starting a new one.
      unsubscribeRef.current?.();
      toolCallIndexRef.current = new Map();
      setState({ ...INITIAL_STATE, mode, status: "running" });

      const url = mode === "replay" ? "/api/replay" : "/api/arcadeops/run";
      const method: "GET" | "POST" = mode === "replay" ? "GET" : "POST";
      const body =
        mode === "replay"
          ? undefined
          : { missionId: selectedMission.id, mission: missionPromptFor(selectedMission) };

      unsubscribeRef.current = subscribeToControlTower(url, {
        method,
        body,
        onEvent: handleEvent,
        onError: (err) => {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: err.message || "Unknown error",
          }));
        },
        onClose: () => {
          setState((prev) =>
            prev.status === "running" ? { ...prev, status: "completed" } : prev,
          );
        },
      });
    },
    [handleEvent, selectedMission],
  );

  const handleReset = useCallback(() => {
    unsubscribeRef.current?.();
    toolCallIndexRef.current = new Map();
    setState(INITIAL_STATE);
  }, []);

  const isRunning = state.status === "running";
  const replayDisabled = isRunning;
  const liveDisabled = isRunning || !liveAvailable;

  return (
    <div className="flex flex-col gap-10">
      {/* Mode + mission selector */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <ModeBadge mode={state.mode} available={state.mode === "live" ? liveAvailable : true} />
          {!liveAvailable ? (
            <span className="text-xs text-zinc-500">
              Deterministic replay for reliable judging.
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DEMO_MISSIONS.map((m) => {
            const selected = m.id === selectedMissionId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMissionId(m.id)}
                disabled={isRunning}
                aria-pressed={selected}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-emerald-400/50 bg-emerald-400/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">{m.title}</h3>
                  {m.default ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{m.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => startRun("replay")}
            disabled={replayDisabled}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▶ Replay an agent run
          </button>
          {liveAvailable ? (
            <button
              type="button"
              onClick={() => startRun("live")}
              disabled={liveDisabled}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⚡ Run live with ArcadeOps backend
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-200">
                Dev mode
              </span>
            </button>
          ) : null}
          {state.status !== "idle" && !isRunning ? (
            <button
              type="button"
              onClick={handleReset}
              className="ml-2 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
            >
              Reset
            </button>
          ) : null}
        </div>
      </section>

      {/* Mission summary */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Mission
            </div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">{selectedMission.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {selectedMission.description}
            </p>
          </div>
          <MissionStatusBadge status={state.status} error={state.error} />
        </div>
      </section>

      {/* Plan */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Plan</SectionTitle>
        <PhasePills phaseStatuses={state.phaseStatuses} />
      </section>

      {/* Execution */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionTitle>Execution timeline</SectionTitle>
          <EventTimeline entries={state.timeline} />
        </div>
        <div className="flex flex-col gap-3">
          <SectionTitle>Tool calls</SectionTitle>
          {state.toolCalls.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-500">
              Tool calls will stream here as the agent invokes them.
            </div>
          ) : (
            <ul className="space-y-3">
              {state.toolCalls.map((call, idx) => (
                <li key={`${call.name}-${idx}`}>
                  <ToolCallCard call={call} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Observability */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Observability</SectionTitle>
        <ObservabilityPanel observability={state.observability} />
      </section>

      {/* Result */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Result</SectionTitle>
        <ResultCard
          result={state.result}
          onRunAgain={() => startRun(state.mode)}
          disabled={isRunning}
        />
      </section>

      {state.error ? (
        <p
          role="status"
          className="rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h2>
  );
}

function MissionStatusBadge({ status, error }: { status: RunStatus; error: string | null }) {
  const map: Record<RunStatus, { label: string; classes: string }> = {
    idle: { label: "Waiting", classes: "bg-zinc-500/15 text-zinc-300" },
    running: { label: "Running", classes: "bg-sky-400/15 text-sky-200" },
    completed: { label: "Completed", classes: "bg-emerald-400/15 text-emerald-200" },
    error: {
      label: error ? "Error" : "Error",
      classes: "bg-red-400/15 text-red-200",
    },
  };
  const { label, classes } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${classes}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

function applyEvent(
  state: RunState,
  event: ControlTowerEvent,
  toolCallIndex: Map<string, number>,
): RunState {
  switch (event.type) {
    case "phase_change": {
      const phaseStatuses = { ...state.phaseStatuses };
      // When a new phase starts running, mark previous "running" phases as completed.
      if (event.status === "running") {
        for (const key of Object.keys(phaseStatuses) as ControlTowerPhase[]) {
          if (phaseStatuses[key] === "running") phaseStatuses[key] = "completed";
        }
      }
      phaseStatuses[event.phase] = event.status;
      return {
        ...state,
        phaseStatuses,
        timeline: [
          ...state.timeline,
          {
            id: `phase:${event.phase}:${state.timeline.length}`,
            kind: "phase_change",
            title: `Phase: ${event.phase}`,
            status: event.status,
            timestamp: event.timestamp,
          },
        ],
      };
    }
    case "step":
      return {
        ...state,
        timeline: [
          ...state.timeline,
          {
            id: `step:${state.timeline.length}`,
            kind: "step",
            title: event.title,
            description: event.description,
            status: event.status,
            timestamp: event.timestamp,
          },
        ],
      };
    case "tool_call": {
      // Coalesce consecutive (running → completed) updates for the same tool.
      const key = event.name;
      const idx = toolCallIndex.get(key);
      const next: ToolCallView = {
        name: event.name,
        description: event.description,
        status: event.status,
        durationMs: event.durationMs,
        startedAtIso:
          idx !== undefined && state.toolCalls[idx]
            ? state.toolCalls[idx].startedAtIso
            : event.timestamp,
      };
      let toolCalls = state.toolCalls;
      if (
        idx !== undefined &&
        state.toolCalls[idx] &&
        state.toolCalls[idx].status === "running"
      ) {
        toolCalls = [...state.toolCalls];
        toolCalls[idx] = next;
      } else {
        toolCalls = [...state.toolCalls, next];
        toolCallIndex.set(key, toolCalls.length - 1);
      }
      return {
        ...state,
        toolCalls,
        timeline: [
          ...state.timeline,
          {
            id: `tool:${key}:${state.timeline.length}`,
            kind: "tool_call",
            title: event.name,
            description: event.description,
            status: event.status,
            timestamp: event.timestamp,
          },
        ],
      };
    }
    case "observability":
      return {
        ...state,
        observability: {
          provider: event.provider,
          model: event.model,
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          totalTokens: event.totalTokens,
          costUsd: event.costUsd,
          latencyMs: event.latencyMs,
          toolCallsCount: event.toolCallsCount,
          riskFlags: event.riskFlags,
        },
      };
    case "result":
      return {
        ...state,
        result: {
          title: event.title,
          summary: event.summary,
          recommendations: event.recommendations,
        },
      };
    case "done": {
      const phaseStatuses = { ...state.phaseStatuses };
      for (const key of Object.keys(phaseStatuses) as ControlTowerPhase[]) {
        if (phaseStatuses[key] === "running") phaseStatuses[key] = "completed";
      }
      return { ...state, status: "completed", phaseStatuses };
    }
    case "error":
      return { ...state, status: "error", error: event.message };
    case "token":
    case "heartbeat":
      // These do not mutate the visible store in the V0 UI. We could surface
      // tokens for live LLM streaming later.
      return state;
    default:
      return state;
  }
}

/**
 * Build the JudgeRunSnapshot consumed by the Gemini Reliability Judge.
 * Pure projection of the visible run state — no IDs, no internal handles.
 */
function buildSnapshot(state: RunState, mission: MissionCard): JudgeRunSnapshot {
  return {
    mission: {
      id: mission.id,
      title: mission.title,
      prompt: missionPromptFor(mission),
    },
    observability: state.observability ?? {
      provider: "unknown",
      model: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      toolCallsCount: 0,
      riskFlags: [],
    },
    toolCalls: state.toolCalls.map((call) => ({
      name: call.name,
      description: call.description,
      durationMs: call.durationMs,
      status: call.status,
    })),
    phases: (Object.entries(state.phaseStatuses) as Array<
      [ControlTowerPhase, ControlTowerStatus | undefined]
    >)
      .filter((entry): entry is [ControlTowerPhase, ControlTowerStatus] => Boolean(entry[1]))
      .map(([phase, status]) => ({ phase, status })),
    result: state.result ?? {
      title: "Pending",
      summary: "",
      recommendations: [],
    },
  };
}

function missionPromptFor(mission: MissionCard): string {
  switch (mission.id) {
    case "audit-agent-workflow":
      return "Audit an autonomous AI agent workflow, inspect its plan, tool calls, cost, model, provider, risks, and generate a production-readiness report.";
    case "observability-market-brief":
      return "Generate a concise AI observability market brief covering vendors, pricing tiers, and enterprise readiness signals.";
    case "review-production-run":
      return "Review the most recent production AI agent run, highlight regressions and propose mitigations before the next deploy.";
    default:
      return mission.description;
  }
}
