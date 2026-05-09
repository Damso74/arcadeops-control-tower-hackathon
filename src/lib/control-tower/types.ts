/**
 * Control Tower event model.
 *
 * Every adapter — replay fixture, ArcadeOps backend proxy, future Gemini live
 * mode — converts its source into one of these typed events. The UI only ever
 * reads from this shape.
 *
 * Wire format on top of SSE:
 *   event: <ControlTowerEventType>
 *   data: <JSON payload as defined below>
 */

export type ControlTowerEventType =
  | "phase_change"
  | "step"
  | "tool_call"
  | "token"
  | "observability"
  | "result"
  | "done"
  | "error"
  | "heartbeat";

export type ControlTowerPhase =
  | "analyze"
  | "plan"
  | "execute"
  | "evaluate"
  | "summarize";

export type ControlTowerStatus = "queued" | "running" | "completed" | "error";

export interface ControlTowerPhaseChange {
  type: "phase_change";
  phase: ControlTowerPhase;
  status: ControlTowerStatus;
  timestamp: string;
}

export interface ControlTowerStep {
  type: "step";
  title: string;
  description?: string;
  status: ControlTowerStatus;
  timestamp: string;
}

export interface ControlTowerToolCall {
  type: "tool_call";
  name: string;
  description?: string;
  status: ControlTowerStatus;
  durationMs?: number;
  timestamp: string;
}

export interface ControlTowerToken {
  type: "token";
  text: string;
  phase?: ControlTowerPhase;
}

export interface ControlTowerObservability {
  type: "observability";
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  toolCallsCount: number;
  riskFlags: string[];
}

export interface ControlTowerResult {
  type: "result";
  title: string;
  summary: string;
  recommendations: string[];
}

export interface ControlTowerDone {
  type: "done";
  reason?: string;
}

export interface ControlTowerError {
  type: "error";
  message: string;
}

export interface ControlTowerHeartbeat {
  type: "heartbeat";
  elapsedMs: number;
}

export type ControlTowerEvent =
  | ControlTowerPhaseChange
  | ControlTowerStep
  | ControlTowerToolCall
  | ControlTowerToken
  | ControlTowerObservability
  | ControlTowerResult
  | ControlTowerDone
  | ControlTowerError
  | ControlTowerHeartbeat;

/** Pre-canned mission cards displayed in the UI. */
export interface MissionCard {
  id: string;
  title: string;
  description: string;
  default?: boolean;
}

export const DEMO_MISSIONS: readonly MissionCard[] = [
  {
    id: "audit-agent-workflow",
    title: "Audit an autonomous agent workflow",
    description:
      "Inspect plan, tool calls, cost, model, provider, risks, and generate a production-readiness report.",
    default: true,
  },
  {
    id: "observability-market-brief",
    title: "Generate an AI observability market brief",
    description:
      "Survey the agent observability landscape, pricing tiers, and enterprise readiness signals.",
  },
  {
    id: "review-production-run",
    title: "Review a production AI agent run",
    description:
      "Replay a finished run, surface regressions, and recommend mitigations before the next deploy.",
  },
] as const;

/** Replay fixture shape. */
export interface DemoRunFixture {
  mission: {
    id: string;
    title: string;
    prompt: string;
  };
  observability: Omit<ControlTowerObservability, "type">;
  result: Omit<ControlTowerResult, "type">;
  events: Array<
    | (Omit<ControlTowerPhaseChange, "timestamp"> & { delayMs: number })
    | (Omit<ControlTowerStep, "timestamp"> & { delayMs: number })
    | (Omit<ControlTowerToolCall, "timestamp"> & { delayMs: number })
    | (Omit<ControlTowerToken, "type"> & { type: "token"; delayMs: number })
  >;
}

export type ControlTowerMode = "replay" | "live";

export interface ControlTowerModeAvailability {
  replay: boolean;
  live: boolean;
}
