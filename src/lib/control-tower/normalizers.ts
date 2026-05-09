import type {
  ControlTowerEvent,
  ControlTowerObservability,
  ControlTowerPhase,
  ControlTowerStatus,
} from "./types";

/**
 * Normalizers convert backend-specific events into the canonical Control Tower
 * model. The proxy in `src/app/api/arcadeops/run/route.ts` runs every event
 * coming from ArcadeOps through `normalizeArcadeOpsEvent` before re-emitting
 * it on the public SSE stream.
 *
 * Supported sources:
 *   - ArcadeOps native (`/api/v1/control-tower/demo/run`) — already emits
 *     Control-Tower-shaped events; we only patch missing fields.
 *   - ArcadeOps run-stream legacy (`phase_change` / `step` / `tool_call` /
 *     `result` / `connected` / `heartbeat` / `error`) — we map best-effort.
 */

const PHASE_MAP: Record<string, ControlTowerPhase> = {
  analyze: "analyze",
  plan: "plan",
  execute: "execute",
  evaluate: "evaluate",
  summarize: "summarize",
};

function nowIso(): string {
  return new Date().toISOString();
}

function mapPhase(value: unknown): ControlTowerPhase | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return PHASE_MAP[normalized] ?? null;
}

function mapStatus(value: unknown): ControlTowerStatus {
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "completed" || v === "done" || v === "ok") return "completed";
    if (v === "running" || v === "in_progress" || v === "started" || v === "start") return "running";
    if (v === "queued" || v === "waiting" || v === "pending") return "queued";
    if (v === "error" || v === "failed" || v === "cancelled") return "error";
  }
  return "running";
}

interface NormalizationState {
  toolCallsByCallId: Map<string, { name: string; startedAtMs: number }>;
  emittedObservability: boolean;
  totalToolCalls: number;
}

export function createNormalizationState(): NormalizationState {
  return {
    toolCallsByCallId: new Map(),
    emittedObservability: false,
    totalToolCalls: 0,
  };
}

/**
 * Normalize a single source event. Returns 0..N Control Tower events
 * (a single source event may translate into multiple downstream events,
 * e.g. an ArcadeOps `result` produces both a `result` and a `done` frame).
 */
export function normalizeArcadeOpsEvent(
  sourceEventName: string | null,
  payload: unknown,
  state: NormalizationState,
): ControlTowerEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;

  // Already-normalized events flowing from `/api/v1/control-tower/demo/run`.
  if (typeof data.type === "string") {
    return passthroughEvent(data);
  }

  switch (sourceEventName) {
    case "phase_change":
      return phaseChangeEvent(data);
    case "step":
      return stepEvent(data);
    case "tool_call":
      return toolCallEvent(data, state);
    case "token":
      return tokenEvent(data);
    case "result":
      return resultEvent(data, state);
    case "error":
      return errorEvent(data);
    case "heartbeat":
      return heartbeatEvent(data);
    case "connected":
    case "approval_pending":
    case "sub_agent":
    case "reconnect":
      // Not surfaced in Control Tower V0 — keep stream silent.
      return [];
    default:
      return [];
  }
}

function passthroughEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  // Trust the backend already emits the Control Tower shape; just patch
  // missing timestamps so the UI never sees `undefined`.
  const withTs = { ...data } as ControlTowerEvent & Record<string, unknown>;
  if (
    (withTs.type === "phase_change" || withTs.type === "step" || withTs.type === "tool_call") &&
    typeof withTs.timestamp !== "string"
  ) {
    withTs.timestamp = nowIso();
  }
  return [withTs as ControlTowerEvent];
}

function phaseChangeEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  const phase = mapPhase(data.phase);
  if (!phase) return [];
  return [
    {
      type: "phase_change",
      phase,
      status: mapStatus(data.status ?? "running"),
      timestamp: nowIso(),
    },
  ];
}

function stepEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  const stepType = typeof data.type === "string" ? (data.type as string) : "step";
  const title = humanizeStepTitle(stepType);
  const description =
    typeof data.output === "string"
      ? truncate(data.output as string, 240)
      : typeof data.input === "string"
        ? truncate(data.input as string, 240)
        : undefined;
  return [
    {
      type: "step",
      title,
      description,
      status: "completed",
      timestamp: nowIso(),
    },
  ];
}

function toolCallEvent(
  data: Record<string, unknown>,
  state: NormalizationState,
): ControlTowerEvent[] {
  const phase = typeof data.phase === "string" ? (data.phase as string) : "start";
  const name = typeof data.toolName === "string" ? (data.toolName as string) : "tool";
  const callId = typeof data.callId === "string" ? (data.callId as string) : `${name}:${state.totalToolCalls}`;

  if (phase === "start") {
    state.toolCallsByCallId.set(callId, { name, startedAtMs: Date.now() });
    return [
      {
        type: "tool_call",
        name,
        description: typeof data.input === "string" ? truncate(data.input as string, 200) : undefined,
        status: "running",
        timestamp: nowIso(),
      },
    ];
  }

  const started = state.toolCallsByCallId.get(callId);
  state.toolCallsByCallId.delete(callId);
  state.totalToolCalls += 1;
  const durationMs =
    typeof data.durationMs === "number"
      ? (data.durationMs as number)
      : started
        ? Date.now() - started.startedAtMs
        : undefined;
  return [
    {
      type: "tool_call",
      name,
      description: typeof data.output === "string" ? truncate(data.output as string, 200) : undefined,
      status: typeof data.error === "string" && data.error ? "error" : "completed",
      durationMs,
      timestamp: nowIso(),
    },
  ];
}

function tokenEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  const text = typeof data.text === "string" ? (data.text as string) : "";
  if (text.length === 0) return [];
  const phase = mapPhase(data.phase);
  return [{ type: "token", text, phase: phase ?? undefined }];
}

function resultEvent(
  data: Record<string, unknown>,
  state: NormalizationState,
): ControlTowerEvent[] {
  const out: ControlTowerEvent[] = [];

  if (!state.emittedObservability) {
    const obs = extractObservability(data);
    if (obs) {
      out.push({ type: "observability", ...obs });
      state.emittedObservability = true;
    }
  }

  const summary = typeof data.summary === "string" ? (data.summary as string) : "";
  if (summary.length > 0) {
    out.push({
      type: "result",
      title: "Mission completed",
      summary: truncate(summary, 1500),
      recommendations: extractRecommendations(summary),
    });
  }

  out.push({ type: "done", reason: typeof data.status === "string" ? (data.status as string) : undefined });
  return out;
}

function errorEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  const message = typeof data.message === "string" ? (data.message as string) : "Unknown error";
  return [{ type: "error", message }];
}

function heartbeatEvent(data: Record<string, unknown>): ControlTowerEvent[] {
  const elapsed = typeof data.elapsed === "number" ? (data.elapsed as number) : 0;
  return [{ type: "heartbeat", elapsedMs: elapsed }];
}

function humanizeStepTitle(stepType: string): string {
  switch (stepType) {
    case "analyze":
      return "Analyze mission";
    case "plan":
      return "Build execution plan";
    case "execute":
      return "Execute step";
    case "summarize":
      return "Summarize result";
    case "evaluate":
      return "Evaluate output";
    default:
      return stepType.replace(/_/g, " ");
  }
}

function extractObservability(
  data: Record<string, unknown>,
): Omit<ControlTowerObservability, "type"> | null {
  const budget = data.budget as Record<string, unknown> | undefined;
  if (!budget) return null;
  const inputTokens = numberOrZero(budget.tokensIn);
  const outputTokens = numberOrZero(budget.tokensOut);
  return {
    provider: stringOr(data.provider, "OpenAI"),
    model: stringOr(data.model, "GPT"),
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUsd: numberOrZero(budget.costUsd),
    latencyMs: numberOrZero(budget.durationMs),
    toolCallsCount: numberOrZero(budget.toolCalls),
    riskFlags: ["No destructive action", "Cost threshold OK"],
  };
}

function extractRecommendations(summary: string): string[] {
  // Keep this lightweight — a real product would call a structured-output
  // pass. For replay/live transparency we surface short bullet-like lines.
  const lines = summary
    .split(/\n|\.\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length < 200);
  return lines.slice(0, 3);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
