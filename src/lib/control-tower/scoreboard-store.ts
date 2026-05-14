/**
 * Lot 3a — Cockpit scoreboard store.
 *
 * Tiny localStorage-backed counter ledger that powers the
 * `<CockpitScoreboard>` panel at the top of the cockpit.
 *
 * Why a separate module:
 *   - The store has zero React deps so it can be unit-smoke-tested
 *     standalone (`npx tsx scripts/...`) without spinning up Next.js.
 *   - All access goes through `getCounters()` / `incrementCounter()` /
 *     `resetCounters()`, so the storage shape can evolve (versioned
 *     key `arcadeops-scoreboard-v1`) without leaking JSON literals
 *     into the UI.
 *
 * Safety contract:
 *   - SSR-safe: every helper short-circuits to a zeroed snapshot when
 *     `window` is undefined. Components must guard their first read in
 *     a `useEffect` (the `<CockpitScoreboard>` already does this).
 *   - Crash-safe: a corrupted blob is silently overwritten with zeros.
 *     We never throw out of these helpers — the scoreboard is a "nice
 *     to have" panel, not load-bearing for the demo.
 *   - Kill-switch: the *caller* is responsible for honoring
 *     `process.env.NEXT_PUBLIC_SCOREBOARD === "0"` (decision §6-G in
 *     the master plan). The store itself is always callable.
 */

import type { GeminiVerdict } from "@/lib/control-tower/gemini-types";

const STORAGE_KEY = "arcadeops-scoreboard-v1";

export interface ScoreboardCounters {
  /** Total Gemini judge runs that produced a verdict. */
  runsAudited: number;
  /** Verdict breakdown — must always sum to `runsAudited`. */
  blocked: number;
  needsReview: number;
  shipped: number;
  /** Cumulative cost in USD across audited runs that reported a cost. */
  totalCostUsd: number;
  /** How many of `runsAudited` actually carried a cost number. */
  costSamples: number;
  /**
   * Runs where ArcadeOps' deterministic policy gate fired *at least*
   * one rule (any severity). This is the "high-risk autonomous calls
   * we caught regardless of what Gemini thought" metric — it makes the
   * defensive value of the platform visible even when Gemini already
   * blocked the run.
   */
  policyGateTriggered: number;
}

const ZERO_COUNTERS: ScoreboardCounters = {
  runsAudited: 0,
  blocked: 0,
  needsReview: 0,
  shipped: 0,
  totalCostUsd: 0,
  costSamples: 0,
  policyGateTriggered: 0,
};

/** Returns a fresh zeroed snapshot. Useful as initial state in React. */
export function emptyCounters(): ScoreboardCounters {
  return { ...ZERO_COUNTERS };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRaw(): ScoreboardCounters {
  if (!isBrowser()) return emptyCounters();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCounters();
    const parsed = JSON.parse(raw) as Partial<ScoreboardCounters> | null;
    if (!parsed || typeof parsed !== "object") return emptyCounters();
    return {
      runsAudited: coerceFiniteNonNegative(parsed.runsAudited),
      blocked: coerceFiniteNonNegative(parsed.blocked),
      needsReview: coerceFiniteNonNegative(parsed.needsReview),
      shipped: coerceFiniteNonNegative(parsed.shipped),
      totalCostUsd: Math.max(0, coerceFiniteNumber(parsed.totalCostUsd)),
      costSamples: coerceFiniteNonNegative(parsed.costSamples),
      policyGateTriggered: coerceFiniteNonNegative(parsed.policyGateTriggered),
    };
  } catch {
    return emptyCounters();
  }
}

function writeRaw(next: ScoreboardCounters): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded / private mode — silently swallow, the scoreboard
    // is non-essential.
  }
}

function coerceFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function coerceFiniteNonNegative(value: unknown): number {
  const n = coerceFiniteNumber(value);
  return n < 0 ? 0 : Math.floor(n);
}

/** Snapshot read for UI rendering. Always SSR-safe. */
export function getCounters(): ScoreboardCounters {
  return readRaw();
}

export interface IncrementCounterInput {
  verdict: GeminiVerdict;
  /**
   * Cost of the audited run in USD. Pass `undefined` for inputs that
   * don't have a real cost (e.g. user-pasted traces) — the store will
   * skip the average accordingly.
   */
  costUsd?: number;
  /**
   * `true` when ArcadeOps' deterministic policy gate fired at least
   * one rule on this run (regardless of severity / verdict).
   */
  policyGateTriggered?: boolean;
}

/**
 * Increment the scoreboard for a single audited run. Returns the new
 * snapshot so callers can immediately reflect the bump in their state
 * without round-tripping through `getCounters()` again.
 */
export function incrementCounter(input: IncrementCounterInput): ScoreboardCounters {
  const current = readRaw();
  const next: ScoreboardCounters = {
    ...current,
    runsAudited: current.runsAudited + 1,
  };

  switch (input.verdict) {
    case "blocked":
      next.blocked += 1;
      break;
    case "needs_review":
      next.needsReview += 1;
      break;
    case "ready":
      next.shipped += 1;
      break;
  }

  if (typeof input.costUsd === "number" && Number.isFinite(input.costUsd) && input.costUsd >= 0) {
    next.totalCostUsd = current.totalCostUsd + input.costUsd;
    next.costSamples = current.costSamples + 1;
  }

  if (input.policyGateTriggered) {
    next.policyGateTriggered += 1;
  }

  writeRaw(next);
  return next;
}

export function resetCounters(): ScoreboardCounters {
  const zero = emptyCounters();
  writeRaw(zero);
  return zero;
}

/**
 * Average cost per audited run that reported a cost. Returns `null`
 * when no run has a recorded cost yet (avoids displaying `$NaN`).
 */
export function averageCostUsd(counters: ScoreboardCounters): number | null {
  if (counters.costSamples <= 0) return null;
  return counters.totalCostUsd / counters.costSamples;
}
