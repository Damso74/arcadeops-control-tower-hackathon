import { encodeSseFrame } from "@/lib/control-tower/sse";
import { runnerHeaders, runnerUrl } from "@/lib/runner/auth";
import type {
  ControlTowerEvent,
  ControlTowerObservability,
  ControlTowerPhase,
} from "@/lib/control-tower/types";

/**
 * POST /api/arcadeops/run — Lot 5 SSE compat layer.
 *
 * The route forwards a mission to the **Vultr FastAPI runner**
 * (`POST ${RUNNER_URL}/run-agent`), receives a single JSON `AgentRunTrace`
 * payload, and chunks it into the Control Tower SSE events the existing
 * `<DemoMissionLauncher>` already consumes — no UI change required.
 *
 * Why this design:
 *   - The Vultr runner is the source of truth for every live run; we
 *     never bypass it from the browser, so the secret stays server-side.
 *   - The frontend speaks Control Tower SSE since Lot 2; we synthesise
 *     that stream from the static JSON instead of re-architecting the UI.
 *   - We deliberately add small `setTimeout` gaps between frames so the
 *     timeline feels live; the wallclock total stays close to the
 *     upstream `wall_time_seconds` (the runner blocks for ~17 s anyway).
 *
 * Kill switches:
 *   - `RUNNER_URL` missing  → graceful single-frame error stream.
 *   - `RUNNER_SECRET` missing on Vercel → headers omitted, runner
 *     middleware decides (passes through if `RUNNER_REQUIRE_SECRET=0`).
 *
 * Compatibility:
 *   - Falls back to a single-frame `error` + `done` SSE response when
 *     the upstream rejects the request, matching the V0 contract used
 *     by `subscribeToControlTower`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const MISSION_MAX_LENGTH = 1_000;
const FRAME_DELAY_MS = 80;
const UPSTREAM_TIMEOUT_MS = 90_000;

type Scenario = "vip_churn" | "safe_research";

interface RequestBody {
  mission?: string;
  missionId?: string;
  scenario?: Scenario;
}

interface ToolCallTrace {
  id?: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  success?: boolean;
  latency_ms?: number;
  risk?: string;
}

interface StepTrace {
  id?: string;
  agent?: string;
  phase?: string;
  summary?: string;
  tool_calls?: ToolCallTrace[];
  started_at?: string;
  duration_ms?: number;
}

interface PolicyGateTrace {
  name?: string;
  passed?: boolean;
  reason?: string;
}

interface RiskFindingTrace {
  id?: string;
  severity?: string;
  category?: string;
  description?: string;
  evidence?: string;
  recommendation?: string;
}

interface RunVerdictTrace {
  verdict?: string;
  reasons?: string[];
  policy_gates?: PolicyGateTrace[];
  risk_findings?: RiskFindingTrace[];
}

interface AgentRunTrace {
  run_id?: string;
  runner?: string;
  region?: string;
  model?: string;
  mission?: string;
  steps?: StepTrace[];
  verdict?: RunVerdictTrace;
  started_at?: string;
  completed_at?: string;
  cost_usd?: number;
  tokens_used?: number;
  is_mocked?: boolean;
}

export async function POST(req: Request): Promise<Response> {
  let baseUrl: string;
  try {
    baseUrl = runnerUrl();
  } catch {
    return singleFrameErrorResponse(
      "Live runner not configured. Set RUNNER_URL on the deployment to enable Live mode.",
    );
  }

  let body: RequestBody = {};
  try {
    const raw = (await req.json()) as unknown;
    if (raw && typeof raw === "object") body = raw as RequestBody;
  } catch {
    // Empty body is allowed — the runner has a default mission shape.
  }

  const mission = pickMission(body);
  const scenario: Scenario = body.scenario === "safe_research" ? "safe_research" : "vip_churn";

  const upstreamUrl = `${baseUrl}/run-agent`;
  const proxyAbort = new AbortController();
  // Cancel the upstream as soon as the public client disconnects so we
  // never keep a paid Gemini run alive past the user's session.
  req.signal.addEventListener("abort", () => proxyAbort.abort(), { once: true });
  const upstreamTimeout = setTimeout(() => proxyAbort.abort(), UPSTREAM_TIMEOUT_MS);

  const t0 = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...runnerHeaders(),
      },
      body: JSON.stringify({ mission, scenario }),
      signal: proxyAbort.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(upstreamTimeout);
    return singleFrameErrorResponse(
      `Failed to reach Vultr runner (${(err as Error).message}).`,
    );
  }
  clearTimeout(upstreamTimeout);

  if (!upstream.ok) {
    let detail = `HTTP ${upstream.status}`;
    try {
      const text = await upstream.text();
      if (text) detail = text.slice(0, 500);
    } catch {
      /* ignore */
    }
    return singleFrameErrorResponse(`Vultr runner rejected the run: ${detail}`);
  }

  let trace: AgentRunTrace;
  try {
    const raw = (await upstream.json()) as unknown;
    if (!raw || typeof raw !== "object") throw new Error("trace is not an object");
    trace = raw as AgentRunTrace;
  } catch (err) {
    return singleFrameErrorResponse(
      `Vultr runner returned invalid JSON (${(err as Error).message}).`,
    );
  }

  const upstreamElapsedMs = Date.now() - t0;
  const stream = traceToSseStream(trace, upstreamElapsedMs);
  return new Response(stream, { headers: SSE_HEADERS });
}

function pickMission(body: RequestBody): string {
  const candidate =
    typeof body.mission === "string" && body.mission.trim().length > 0
      ? body.mission.trim()
      : typeof body.missionId === "string" && body.missionId.trim().length > 0
        ? `Audit ArcadeOps mission "${body.missionId.trim()}"`
        : "Audit an autonomous AI agent run end-to-end.";
  return candidate.slice(0, MISSION_MAX_LENGTH);
}

/**
 * Convert a single static `AgentRunTrace` into a Control Tower SSE stream.
 * Frames are emitted with a small delay so the UI feels live, but the
 * total wallclock added by the proxy stays under a couple of seconds.
 */
function traceToSseStream(
  trace: AgentRunTrace,
  upstreamElapsedMs: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };
      const emit = (event: ControlTowerEvent) =>
        safeEnqueue(encoder.encode(encodeSseFrame(event)));
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        const steps = Array.isArray(trace.steps) ? trace.steps : [];
        const seenPhases = new Set<ControlTowerPhase>();

        // Always open with the planning phase so the UI shows progress
        // immediately, even before the first synthetic step arrives.
        emit({
          type: "phase_change",
          phase: "plan",
          status: "running",
          timestamp: nowIso(),
        });
        seenPhases.add("plan");
        await sleep(FRAME_DELAY_MS);

        for (const step of steps) {
          const phase = mapStepPhase(step.phase);

          if (!seenPhases.has(phase)) {
            // Flag the previous "running" phases as completed by emitting a
            // running event for the new one — the UI normaliser handles the
            // transition.
            emit({
              type: "phase_change",
              phase,
              status: "running",
              timestamp: nowIso(),
            });
            seenPhases.add(phase);
            await sleep(FRAME_DELAY_MS / 2);
          }

          emit({
            type: "step",
            title: humanizeStep(step),
            description: trimSummary(step.summary),
            status: "completed",
            timestamp: step.started_at ?? nowIso(),
          });
          await sleep(FRAME_DELAY_MS / 2);

          for (const call of step.tool_calls ?? []) {
            const name = typeof call.tool === "string" ? call.tool : "tool";
            const description = describeToolCall(call);
            const status = call.success === false ? "error" : "completed";
            emit({
              type: "tool_call",
              name,
              description,
              status,
              durationMs:
                typeof call.latency_ms === "number" && Number.isFinite(call.latency_ms)
                  ? Math.max(0, Math.round(call.latency_ms))
                  : undefined,
              timestamp: step.started_at ?? nowIso(),
            });
            await sleep(FRAME_DELAY_MS);
          }
        }

        emit({
          type: "phase_change",
          phase: "summarize",
          status: "completed",
          timestamp: nowIso(),
        });
        await sleep(FRAME_DELAY_MS);

        emit(buildObservability(trace, upstreamElapsedMs));
        await sleep(FRAME_DELAY_MS);

        emit(buildResult(trace));
        await sleep(FRAME_DELAY_MS);

        emit({
          type: "done",
          reason: trace.verdict?.verdict ?? "completed",
        });
      } catch (err) {
        const message =
          (err as Error)?.name === "AbortError"
            ? "Stream aborted by client."
            : `Stream interrupted: ${(err as Error).message}`;
        emit({ type: "error", message });
        emit({ type: "done", reason: "stream_error" });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
}

function mapStepPhase(raw: unknown): ControlTowerPhase {
  if (typeof raw !== "string") return "execute";
  const v = raw.toLowerCase();
  if (v === "planning" || v === "plan") return "plan";
  if (v === "tool_call" || v === "execute" || v === "execution") return "execute";
  if (v === "risk_scan" || v === "evaluate" || v === "evaluation") return "evaluate";
  if (v === "conclusion" || v === "summary" || v === "summarize") return "summarize";
  if (v === "analyze" || v === "analysis") return "analyze";
  return "execute";
}

function humanizeStep(step: StepTrace): string {
  const agent = typeof step.agent === "string" && step.agent.length > 0 ? step.agent : "AGENT";
  const phase = typeof step.phase === "string" && step.phase.length > 0 ? step.phase : "step";
  return `${agent} · ${phase.replace(/_/g, " ")}`;
}

function trimSummary(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (cleaned.length === 0) return undefined;
  return cleaned.length > 240 ? `${cleaned.slice(0, 239)}…` : cleaned;
}

function describeToolCall(call: ToolCallTrace): string | undefined {
  const args = call.args && typeof call.args === "object" ? call.args : undefined;
  if (!args) return undefined;
  try {
    const json = JSON.stringify(args);
    return json.length > 200 ? `${json.slice(0, 199)}…` : json;
  } catch {
    return undefined;
  }
}

function buildObservability(
  trace: AgentRunTrace,
  proxyElapsedMs: number,
): ControlTowerObservability {
  const inputTokens = approxInputTokens(trace.tokens_used);
  const outputTokens = (trace.tokens_used ?? 0) - inputTokens;
  const latencyMs = computeLatencyMs(trace, proxyElapsedMs);
  const toolCallsCount = (trace.steps ?? []).reduce(
    (acc, step) => acc + (step.tool_calls?.length ?? 0),
    0,
  );
  const riskFlags = (trace.verdict?.risk_findings ?? [])
    .map((finding) => {
      const sev = (finding.severity ?? "INFO").toString();
      const cat = finding.category ?? "risk";
      return `${sev}: ${cat}`;
    })
    .slice(0, 5);

  return {
    type: "observability",
    provider: trace.runner === "vultr" ? "Gemini · Vultr" : "Gemini",
    model: trace.model ?? "gemini-2.5-flash",
    inputTokens,
    outputTokens: Math.max(0, outputTokens),
    totalTokens: trace.tokens_used ?? 0,
    costUsd: typeof trace.cost_usd === "number" ? trace.cost_usd : 0,
    latencyMs,
    toolCallsCount,
    riskFlags: riskFlags.length > 0 ? riskFlags : ["No risk findings reported"],
  };
}

function approxInputTokens(total: number | undefined): number {
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) return 0;
  // The Vultr runner currently only reports a flat `tokens_used`. Until we
  // surface input/output split end-to-end, attribute ~70 % to input prompts
  // (planner + worker context) which matches what we observe in practice.
  return Math.round(total * 0.7);
}

function computeLatencyMs(trace: AgentRunTrace, proxyElapsedMs: number): number {
  const start = parseIsoMs(trace.started_at);
  const end = parseIsoMs(trace.completed_at);
  if (start !== null && end !== null && end > start) return end - start;
  return Math.max(0, proxyElapsedMs);
}

function parseIsoMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function buildResult(trace: AgentRunTrace): ControlTowerEvent {
  const verdict = trace.verdict?.verdict ?? "COMPLETED";
  const mission =
    typeof trace.mission === "string" && trace.mission.trim().length > 0
      ? trace.mission.trim()
      : "Mission";
  const reasons = (trace.verdict?.reasons ?? []).filter(
    (r): r is string => typeof r === "string" && r.length > 0,
  );
  const failedGates = (trace.verdict?.policy_gates ?? [])
    .filter((g) => g && g.passed === false)
    .map((g) => g.reason ?? g.name ?? "Failed policy gate")
    .filter((r): r is string => typeof r === "string" && r.length > 0)
    .slice(0, 3);

  const summaryParts: string[] = [];
  summaryParts.push(`Verdict: ${verdict}`);
  if (reasons.length > 0) {
    summaryParts.push(reasons.slice(0, 3).join(" · "));
  } else {
    summaryParts.push("Run completed without explicit reasons.");
  }

  return {
    type: "result",
    title: `${verdict} — ${mission}`,
    summary: summaryParts.join("\n").slice(0, 1500),
    recommendations: failedGates.length > 0
      ? failedGates
      : [
          "Run produced no failed policy gate.",
          "Add Gemini judge for second-opinion before shipping.",
        ],
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function singleFrameErrorResponse(message: string): Response {
  const body =
    encodeSseFrame({ type: "error", message }) +
    encodeSseFrame({ type: "done", reason: "live_unavailable" });
  return new Response(body, { headers: SSE_HEADERS });
}
