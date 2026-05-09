/**
 * Tiny in-memory rate limiter. Suitable for a single-instance hackathon
 * deployment — protects the public Gemini judge endpoint from getting
 * pummelled and burning the upstream key, without pulling in Redis,
 * Upstash or any external dependency.
 *
 * Limitations (intentional, documented):
 *
 * - The store lives in the Node.js process. On Vercel, each serverless
 *   instance has its own counter; bursty traffic hitting different
 *   instances can momentarily exceed the limit. Acceptable for a demo
 *   where the worst-case is a few extra Gemini calls, never customer
 *   data.
 * - On a long-running server (Vultr VPS, Docker host) the counter is
 *   stable until the process restarts.
 * - Counters are bucketed per `key` (typically the requester IP). The
 *   key is treated as opaque and never logged.
 */

interface Bucket {
  /** Number of hits inside the active window. */
  count: number;
  /** Epoch ms when the active window expires. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Hard cap on the in-memory map size. Prevents an attacker from
 * exhausting RAM by cycling through millions of fake `x-forwarded-for`
 * IPs. When the cap is reached we evict the oldest entries first.
 */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining hits inside the current window (0 when blocked). */
  remaining: number;
  /** Window expiry as an epoch ms. */
  resetAt: number;
  /** Seconds until the limit resets — useful for `Retry-After` headers. */
  retryAfterSeconds: number;
}

/**
 * Returns whether `key` is allowed one more hit inside a sliding window
 * of `windowMs` milliseconds with a maximum of `limit` hits.
 *
 * The function is idempotent for blocked checks (a blocked request does
 * NOT consume an extra slot) — this keeps a slow attacker from extending
 * their own ban indefinitely by retrying.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) evictOldest();
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: fresh.resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Pull a stable client identifier out of common reverse-proxy headers.
 * We keep it conservative: we only look at headers Vercel + Vultr will
 * actually populate, and we never parse user-supplied JSON.
 */
export function clientKeyFromRequest(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 100);
  // Vercel sometimes only sets this one in edge regions.
  const cfConnecting = req.headers.get("cf-connecting-ip")?.trim();
  if (cfConnecting) return cfConnecting.slice(0, 100);
  return "unknown";
}

/**
 * Test-only hook to wipe the limiter state between unit tests. Never
 * call from production code paths.
 */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}

function evictOldest(): void {
  // Cheap LRU-ish eviction — drop the first 10 % of insertion-ordered
  // entries. Maps preserve insertion order, so this approximates "oldest
  // first" without tracking timestamps explicitly.
  const toDrop = Math.max(1, Math.floor(buckets.size / 10));
  let dropped = 0;
  for (const key of buckets.keys()) {
    if (dropped >= toDrop) break;
    buckets.delete(key);
    dropped += 1;
  }
}
