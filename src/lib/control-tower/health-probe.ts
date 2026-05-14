/**
 * Lot 2a — Tiny client-side health probe used by
 * `InfrastructureProofCard` to render a live "Vultr backend online"
 * status pastille. Polls `GET /api/health` on a fixed interval, with
 * an `AbortController` so the cockpit can stop the polling loop
 * cleanly on unmount.
 *
 * No external dependencies — built-in `fetch` + `setInterval`.
 *
 * Failure model: any HTTP error / network timeout flips the status
 * to `"degraded"` so the pastille turns amber instead of staying
 * stuck on the last-known good value. The probe never throws; the
 * caller only sees `HealthSnapshot | null`.
 */

export type HealthStatus = "online" | "degraded" | "offline";

export interface HealthSnapshot {
  status: HealthStatus;
  /** Round-trip latency of the last health probe, in milliseconds. */
  latencyMs: number;
  /** ISO timestamp of the probe completion. */
  timestamp: string;
  /** Whether the Vultr runner is configured server-side. */
  vultrRunnerConfigured: boolean;
  /** Vultr region currently in use. */
  region: string;
  /** Whether Gemini is configured server-side. */
  geminiConfigured: boolean;
}

interface HealthPayload {
  ok: true;
  vultrRunnerConfigured?: boolean;
  region?: string;
  geminiConfigured?: boolean;
}

export interface PollHealthOptions {
  /** Polling interval in milliseconds. Defaults to 30_000 (30s). */
  intervalMs?: number;
  /**
   * Optional fetch override — accepted so tests can inject a mock
   * without monkey-patching `globalThis.fetch`. Defaults to the
   * built-in `fetch`.
   */
  fetcher?: typeof fetch;
  /** Endpoint to poll. Defaults to `/api/health`. */
  endpoint?: string;
}

/**
 * Start a polling loop that calls `onSnapshot` on every successful or
 * failed probe. Returns a stop function that aborts the in-flight
 * request and cancels the interval.
 *
 * The first probe fires immediately (no `intervalMs` wait) so the UI
 * gets a snapshot under ~500ms instead of after the first interval.
 */
export function pollHealth(
  onSnapshot: (snapshot: HealthSnapshot) => void,
  options: PollHealthOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? 30_000;
  const fetcher = options.fetcher ?? fetch;
  const endpoint = options.endpoint ?? "/api/health";

  let stopped = false;
  let currentController: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const probe = async () => {
    if (stopped) return;
    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;
    const startedAt =
      typeof performance !== "undefined"
        ? performance.now()
        : Date.now();
    let payload: HealthPayload | null = null;
    let status: HealthStatus = "offline";
    try {
      const res = await fetcher(endpoint, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (res.ok) {
        payload = (await res.json().catch(() => null)) as HealthPayload | null;
        status = payload?.ok ? "online" : "degraded";
      } else {
        status = "degraded";
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      status = "offline";
    }
    const endedAt =
      typeof performance !== "undefined"
        ? performance.now()
        : Date.now();
    const latencyMs = Math.max(0, Math.round(endedAt - startedAt));
    if (stopped) return;
    onSnapshot({
      status,
      latencyMs,
      timestamp: new Date().toISOString(),
      vultrRunnerConfigured: Boolean(payload?.vultrRunnerConfigured),
      region: payload?.region ?? "fra",
      geminiConfigured: Boolean(payload?.geminiConfigured),
    });
  };

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(async () => {
      await probe();
      schedule();
    }, intervalMs);
  };

  // Fire immediately, then loop.
  void probe().then(() => schedule());

  return () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    currentController?.abort();
    currentController = null;
  };
}
