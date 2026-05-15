"use client";

/**
 * Reusable hook that owns the Gemini judge call lifecycle so the
 * V2.2 cockpit can drive the audit from the Selected Run Summary
 * card while keeping the visual ticker, the verdict reveal and the
 * minimum-duration window consistent with the historical panel.
 *
 * Exported state machine:
 *   idle    → no audit ran yet
 *   loading → fetch in flight (or minimum-duration ticker holding)
 *   ready   → result ready, also pushed to `onResult`
 *   error   → friendly message ready to render
 *
 * The hook also reports `lastAuditLatencyMs` (real round-trip,
 * independent of the artificial ticker floor) so the
 * InfrastructureProofCard surfaces honest numbers.
 *
 * `keyDeps` lets the parent reset the state machine when the audited
 * trace identity changes — a stale verdict against a different run
 * would lie to the judge. We reset *imperatively* (no set-state in
 * effect) by tracking the last seen key.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  GeminiJudgeResult,
  JudgeRequestBody,
} from "./gemini-types";

const TICKER_MIN_DURATION_MS = 2000;

export type GeminiJudgeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: GeminiJudgeResult }
  | { status: "error"; message: string };

interface UseGeminiJudgeOptions {
  /** Body posted to /api/gemini/judge. Null disables `runJudge`. */
  requestBody: JudgeRequestBody | null;
  /** Stable key — when it changes, the hook clears `state` and `latency`. */
  judgeKey: string;
  /** Fired once a fresh result lands (after the ticker floor). */
  onResult?: (result: GeminiJudgeResult) => void;
}

interface UseGeminiJudgeResult {
  state: GeminiJudgeState;
  /** Triggers the audit. Resolves once the state has been pushed. */
  runJudge: () => Promise<void>;
  /** Real network round-trip of the most recent audit (ms). */
  lastAuditLatencyMs: number | null;
  /**
   * True while `runJudge` is in flight OR the minimum-duration ticker
   * is still showing. Use this for buttons / banners.
   */
  busy: boolean;
}

export function useGeminiJudge({
  requestBody,
  judgeKey,
  onResult,
}: UseGeminiJudgeOptions): UseGeminiJudgeResult {
  const [state, setState] = useState<GeminiJudgeState>({ status: "idle" });
  const [lastAuditLatencyMs, setLastAuditLatencyMs] = useState<number | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef<UseGeminiJudgeOptions["onResult"]>(onResult);
  const isInitialMountRef = useRef(true);

  // Keep the latest `onResult` reachable from the async callback
  // without re-creating `runJudge` every render — same trick as the
  // historical panel.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Reset the state machine when the audited trace identity flips.
  // We skip the first run so a freshly mounted hook stays at `idle`
  // without triggering an extra render.
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
    setState({ status: "idle" });
    setLastAuditLatencyMs(null);
  }, [judgeKey]);

  // Cancel any in-flight call when the consumer unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };
  }, []);

  const runJudge = useCallback(async () => {
    if (!requestBody) return;
    abortRef.current?.abort();
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();
    setState({ status: "loading" });

    const finalize = (next: GeminiJudgeState) => {
      const elapsed = Date.now() - startedAt;
      if (next.status === "ready" || next.status === "error") {
        setLastAuditLatencyMs(elapsed);
      }
      const remaining = Math.max(0, TICKER_MIN_DURATION_MS - elapsed);
      if (remaining === 0) {
        setState(next);
        if (next.status === "ready") {
          onResultRef.current?.(next.result);
        }
        return;
      }
      minDurationTimerRef.current = setTimeout(() => {
        minDurationTimerRef.current = null;
        if (controller.signal.aborted) return;
        setState(next);
        if (next.status === "ready") {
          onResultRef.current?.(next.result);
        }
      }, remaining);
    };

    try {
      const res = await fetch("/api/gemini/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok: true; result: GeminiJudgeResult }
        | { ok: false; code: string; message?: string }
        | null;

      if (!res.ok || !payload || payload.ok === false) {
        const message =
          payload && payload.ok === false
            ? payload.message || friendlyCodeMessage(payload.code)
            : `Gemini API error (HTTP ${res.status}).`;
        finalize({ status: "error", message });
        return;
      }
      finalize({ status: "ready", result: payload.result });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      finalize({
        status: "error",
        message: (err as Error).message || "Failed to call Gemini.",
      });
    }
  }, [requestBody]);

  return {
    state,
    runJudge,
    lastAuditLatencyMs,
    busy: state.status === "loading",
  };
}

function friendlyCodeMessage(code: string): string {
  switch (code) {
    case "GEMINI_NOT_CONFIGURED":
      return "Gemini is not configured on this deployment.";
    case "GEMINI_REQUEST_FAILED":
      return "The request to Gemini failed. Try again in a moment.";
    case "GEMINI_INVALID_RESPONSE":
      return "Gemini returned an unparseable response. Try re-running the judge.";
    case "RATE_LIMITED":
      return "Too many judge requests. Please try again in a few minutes.";
    case "INVALID_REQUEST":
      return "The judge could not understand the request payload.";
    default:
      return "Gemini judge failed unexpectedly.";
  }
}
