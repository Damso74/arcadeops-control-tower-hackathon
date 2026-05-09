import type { ControlTowerEvent, ControlTowerEventType } from "./types";

/**
 * Minimal SSE parser tuned for Control Tower streams.
 *
 * Implementation notes:
 * - Matches the official `text/event-stream` framing: blocks are separated by
 *   a blank line, every block can carry `event:` and one or more `data:` lines.
 * - We never trust the raw payload — `safeParseEvent` validates the discriminant
 *   `type` field and silently drops malformed frames so the UI never crashes
 *   on a bad backend chunk.
 * - The parser tolerates `\r\n` and `\n` line breaks because Next.js, Vercel
 *   and Node serve them inconsistently across runtimes.
 */

const KNOWN_EVENT_TYPES = new Set<ControlTowerEventType>([
  "phase_change",
  "step",
  "tool_call",
  "token",
  "observability",
  "result",
  "done",
  "error",
  "heartbeat",
]);

export interface ParsedSseFrame {
  event: string | null;
  data: string;
}

/**
 * Pure parser: takes the running buffer + a new chunk, returns frames + the
 * remaining buffer (incomplete tail). No I/O, easy to unit test.
 */
export function consumeSseChunk(
  buffer: string,
  chunk: string,
): { frames: ParsedSseFrame[]; rest: string } {
  const combined = (buffer + chunk).replace(/\r\n/g, "\n");
  const blocks = combined.split("\n\n");
  const rest = blocks.pop() ?? "";
  const frames: ParsedSseFrame[] = [];

  for (const block of blocks) {
    if (block.trim().length === 0) continue;
    let event: string | null = null;
    const dataLines: string[] = [];

    for (const rawLine of block.split("\n")) {
      const line = rawLine.replace(/\r$/, "");
      if (line.length === 0 || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
    }

    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join("\n") });
    }
  }

  return { frames, rest };
}

/**
 * Validate a frame and return a typed Control Tower event, or null when the
 * frame is structurally unusable. The validator is intentionally lenient:
 * extra fields are kept untouched on the wire, but the discriminant `type`
 * must always be a known value.
 */
export function safeParseEvent(frame: ParsedSseFrame): ControlTowerEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame.data);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as { type?: unknown };
  const type =
    typeof candidate.type === "string" && KNOWN_EVENT_TYPES.has(candidate.type as ControlTowerEventType)
      ? (candidate.type as ControlTowerEventType)
      : frame.event && KNOWN_EVENT_TYPES.has(frame.event as ControlTowerEventType)
        ? (frame.event as ControlTowerEventType)
        : null;
  if (!type) return null;

  return { ...(parsed as object), type } as ControlTowerEvent;
}

/**
 * Subscribe to a Control Tower SSE endpoint. Returns an unsubscribe handle
 * that aborts the underlying fetch when called.
 */
export function subscribeToControlTower(
  url: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    onEvent: (event: ControlTowerEvent) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    signal?: AbortSignal;
  },
): () => void {
  const controller = new AbortController();
  const signal = options.signal
    ? linkSignals(options.signal, controller.signal)
    : controller.signal;

  const init: RequestInit = {
    method: options.method ?? "POST",
    headers: {
      Accept: "text/event-stream",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal,
    cache: "no-store",
  };

  void (async () => {
    try {
      const res = await fetch(url, init);
      if (!res.ok || !res.body) {
        // Try to extract a JSON error from the response (proxy may surface
        // a structured `{"type":"error","message":"…"}` payload before
        // tearing down the stream).
        let message = `HTTP ${res.status}`;
        try {
          const text = await res.text();
          if (text) message = text.slice(0, 500);
        } catch {
          /* ignore */
        }
        options.onError?.(new Error(message));
        options.onClose?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const result = consumeSseChunk(buffer, text);
        buffer = result.rest;
        for (const frame of result.frames) {
          const event = safeParseEvent(frame);
          if (event) options.onEvent(event);
        }
      }

      // Flush remaining buffer (rare: backend closed without trailing `\n\n`).
      if (buffer.trim().length > 0) {
        const final = consumeSseChunk(buffer, "\n\n");
        for (const frame of final.frames) {
          const event = safeParseEvent(frame);
          if (event) options.onEvent(event);
        }
      }

      options.onClose?.();
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        options.onClose?.();
        return;
      }
      options.onError?.(err as Error);
      options.onClose?.();
    }
  })();

  return () => controller.abort();
}

function linkSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;
  if (b.aborted) return b;
  const merged = new AbortController();
  const onAbort = () => merged.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return merged.signal;
}

/** Server-side helper to encode a Control Tower event as an SSE frame. */
export function encodeSseFrame(event: ControlTowerEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
