import {
  consumeSseChunk,
  encodeSseFrame,
  safeParseEvent,
} from "@/lib/control-tower/sse";
import {
  createNormalizationState,
  normalizeArcadeOpsEvent,
} from "@/lib/control-tower/normalizers";
import type { ControlTowerEvent } from "@/lib/control-tower/types";

/**
 * POST /api/arcadeops/run
 *
 * Server-side proxy to the ArcadeOps Control Tower demo endpoint
 * (`${ARCADEOPS_API_BASE_URL}/api/v1/control-tower/demo/run`). The proxy
 * exists for **two reasons**:
 *
 *   1. Security — the demo bearer token is read from a server env var and
 *      never reaches the browser.
 *   2. Compatibility — the public demo speaks Control Tower events; the
 *      ArcadeOps backend may speak its native run-stream events. The proxy
 *      runs `normalizeArcadeOpsEvent` to bridge the two.
 *
 * If any of `ARCADEOPS_API_BASE_URL` / `ARCADEOPS_DEMO_TOKEN` /
 * `ARCADEOPS_DEMO_AGENT_ID` is missing we degrade gracefully:
 * we open a single-frame SSE stream containing one `error` event so the UI
 * can show "Live backend not configured" without breaking the replay path.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const MISSION_MAX_LENGTH = 1_000;

interface RequestBody {
  mission?: string;
  missionId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const baseUrl = process.env.ARCADEOPS_API_BASE_URL?.replace(/\/$/, "");
  const demoToken = process.env.ARCADEOPS_DEMO_TOKEN;
  const demoAgentId = process.env.ARCADEOPS_DEMO_AGENT_ID;

  if (!baseUrl || !demoToken || !demoAgentId) {
    return singleFrameErrorResponse(
      "Live backend not configured. Set ARCADEOPS_API_BASE_URL, ARCADEOPS_DEMO_TOKEN and ARCADEOPS_DEMO_AGENT_ID to enable Live mode.",
    );
  }

  let body: RequestBody = {};
  try {
    const raw = (await req.json()) as unknown;
    if (raw && typeof raw === "object") {
      body = raw as RequestBody;
    }
  } catch {
    // Empty body is allowed — the backend has a default mission.
  }

  const mission =
    typeof body.mission === "string" && body.mission.trim().length > 0
      ? body.mission.trim().slice(0, MISSION_MAX_LENGTH)
      : undefined;
  const missionId =
    typeof body.missionId === "string" && body.missionId.trim().length > 0
      ? body.missionId.trim().slice(0, 200)
      : undefined;

  const upstreamUrl = `${baseUrl}/api/v1/control-tower/demo/run`;
  const proxyAbort = new AbortController();
  // Abort upstream as soon as the public client disconnects so we never keep
  // a paid backend run alive past the user's session.
  req.signal.addEventListener("abort", () => proxyAbort.abort(), { once: true });

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoToken}`,
      },
      body: JSON.stringify({
        mission,
        missionId,
      }),
      signal: proxyAbort.signal,
      cache: "no-store",
    });
  } catch (err) {
    return singleFrameErrorResponse(
      `Failed to reach ArcadeOps backend (${(err as Error).message}).`,
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = `HTTP ${upstream.status}`;
    try {
      const text = await upstream.text();
      if (text) detail = text.slice(0, 500);
    } catch {
      /* ignore */
    }
    return singleFrameErrorResponse(`ArcadeOps backend rejected the demo request: ${detail}`);
  }

  const encoder = new TextEncoder();
  const state = createNormalizationState();

  const stream = new ReadableStream<Uint8Array>({
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
      const emit = (event: ControlTowerEvent) => safeEnqueue(encoder.encode(encodeSseFrame(event)));

      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const result = consumeSseChunk(buffer, text);
          buffer = result.rest;

          for (const frame of result.frames) {
            // First try the strict Control Tower contract — most ArcadeOps
            // demo events should already match it.
            const direct = safeParseEvent(frame);
            if (direct) {
              emit(direct);
              if (direct.type === "done") {
                closed = true;
                break;
              }
              continue;
            }

            // Fallback: source event — try to normalize it into one or more
            // Control Tower frames.
            let payload: unknown;
            try {
              payload = JSON.parse(frame.data);
            } catch {
              continue;
            }
            const normalized = normalizeArcadeOpsEvent(frame.event, payload, state);
            for (const event of normalized) {
              emit(event);
              if (event.type === "done") closed = true;
            }
            if (closed) break;
          }
        }

        // Always close the stream with a `done` so the UI can finalize state
        // even when the backend forgot to emit one.
        emit({ type: "done", reason: "upstream_closed" });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          emit({
            type: "error",
            message: `ArcadeOps stream interrupted: ${(err as Error).message}`,
          });
        }
      } finally {
        if (!closed) closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      proxyAbort.abort();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

function singleFrameErrorResponse(message: string): Response {
  const event: ControlTowerEvent = { type: "error", message };
  const body = encodeSseFrame(event) + encodeSseFrame({ type: "done", reason: "live_unavailable" });
  return new Response(body, { headers: SSE_HEADERS });
}
