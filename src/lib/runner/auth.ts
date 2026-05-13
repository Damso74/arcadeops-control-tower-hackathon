/**
 * Vercel ↔ Vultr runner authentication.
 *
 * The Vultr FastAPI runner ships an optional middleware (kill-switch
 * `RUNNER_REQUIRE_SECRET=1`) that rejects every request whose
 * `x-runner-secret` header does not match `RUNNER_SECRET`. This helper
 * builds the headers Next.js routes must send.
 *
 * Why a helper:
 *   - Single source of truth (runner-proxy + arcadeops/run share it).
 *   - Trim() defends against CRLF poisoning when the env was set via
 *     `vercel env add` from a Windows shell.
 *   - Returns an empty object when the secret is absent, which is the
 *     intended pass-through behaviour during Lot 4 → Lot 5 cut-over.
 */
export function runnerHeaders(): Record<string, string> {
  const secret = process.env.RUNNER_SECRET?.trim();
  if (!secret || secret.length === 0) return {};
  return { "x-runner-secret": secret };
}

/**
 * The runner URL (env-driven, trimmed). Throws if missing because every
 * call site treats it as a hard requirement.
 */
export function runnerUrl(): string {
  const raw = process.env.RUNNER_URL?.trim();
  if (!raw || raw.length === 0) {
    throw new Error("RUNNER_URL is not configured.");
  }
  return raw.replace(/\/$/, "");
}
