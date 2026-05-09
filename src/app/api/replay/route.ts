import demoRun from "@/data/demo-run.json";
import { encodeSseFrame } from "@/lib/control-tower/sse";
import type {
  ControlTowerEvent,
  ControlTowerPhase,
  ControlTowerStatus,
  DemoRunFixture,
} from "@/lib/control-tower/types";

/**
 * GET /api/replay
 *
 * Streams the deterministic demo run fixture as Control Tower SSE events.
 * No external API, no LLM key — this endpoint is the fallback that always
 * works, including in the hackathon video.
 *
 * Wire format:
 *   event: <ControlTowerEventType>
 *   data: <JSON Control Tower event>
 *
 * Termination: a final `done` event is emitted before `controller.close()`.
 * If the client disconnects mid-stream, the abort is detected via
 * `req.signal` and the timer chain stops.
 */

export const runtime = "nodejs";
// Replay is short by design (≤ 30 s of fixture). Bound it so a stuck client
// can never exhaust the function quota in production.
export const maxDuration = 60;

const HEARTBEAT_MS = 5_000;
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const fixture = demoRun as DemoRunFixture;

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const timers: ReturnType<typeof setTimeout>[] = [];

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const send = (event: ControlTowerEvent) => {
        safeEnqueue(encoder.encode(encodeSseFrame(event)));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        for (const t of timers) clearTimeout(t);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup, { once: true });

      // Heartbeat keeps middleboxes from idle-killing the stream and lets the
      // UI show liveness even when no functional event happens.
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        send({ type: "heartbeat", elapsedMs: Date.now() - startedAt });
      }, HEARTBEAT_MS);

      // Schedule each fixture event at its cumulative delay. Using setTimeout
      // (instead of one async loop with await sleep) means the scheduler is
      // resilient to Node event-loop hiccups and trivially cancellable.
      let cumulative = 0;
      for (const item of fixture.events) {
        cumulative += item.delayMs;
        timers.push(
          setTimeout(() => {
            if (closed) return;
            const event = materializeFixtureEvent(item);
            if (event) send(event);
          }, cumulative),
        );
      }

      // Final observability + result + done, after all events.
      const finalDelay = cumulative + 400;
      timers.push(
        setTimeout(() => {
          if (closed) return;
          send({ type: "observability", ...fixture.observability });
        }, finalDelay),
      );

      timers.push(
        setTimeout(() => {
          if (closed) return;
          send({ type: "result", ...fixture.result });
        }, finalDelay + 600),
      );

      timers.push(
        setTimeout(() => {
          if (closed) return;
          clearInterval(heartbeat);
          send({ type: "done", reason: "replay_completed" });
          cleanup();
        }, finalDelay + 1200),
      );
    },
    cancel() {
      // Stream consumer (browser) closed — nothing to do, all timers were
      // already cleared by the abort listener wired in `start()`.
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

function materializeFixtureEvent(
  item: DemoRunFixture["events"][number],
): ControlTowerEvent | null {
  const timestamp = new Date().toISOString();
  switch (item.type) {
    case "phase_change":
      return {
        type: "phase_change",
        phase: item.phase as ControlTowerPhase,
        status: item.status as ControlTowerStatus,
        timestamp,
      };
    case "step":
      return {
        type: "step",
        title: item.title,
        description: item.description,
        status: item.status as ControlTowerStatus,
        timestamp,
      };
    case "tool_call":
      return {
        type: "tool_call",
        name: item.name,
        description: item.description,
        status: item.status as ControlTowerStatus,
        durationMs: item.durationMs,
        timestamp,
      };
    case "token":
      return {
        type: "token",
        text: item.text,
        phase: item.phase as ControlTowerPhase | undefined,
      };
    default:
      return null;
  }
}
