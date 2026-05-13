import { NextRequest, NextResponse } from "next/server";

import { runnerUrl } from "@/lib/runner/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/smoke-secret-check?mode=none|wrong|good
 *
 * Lot 5 FULL temporary smoke endpoint that probes the Vultr runner
 * `x-runner-secret` middleware end-to-end from the public Internet.
 *
 * The route is **never linked** from the UI; it exists so the verifying
 * agent can prove the kill-switch enforces what the spec promises:
 *   - mode=none  → runner returns 401 (no header sent)
 *   - mode=wrong → runner returns 401 (wrong header sent)
 *   - mode=good  → runner returns 200 (real header sent)
 *
 * Token paranoia: even with `mode=good`, the response body never echoes
 * `RUNNER_SECRET` back to the client. Should be removed once the
 * judging window closes (TODO_LOT_5_FULL.md).
 */
export async function GET(req: NextRequest) {
  const mode = (req.nextUrl.searchParams.get("mode") ?? "good").toLowerCase();
  const secret = process.env.RUNNER_SECRET?.trim() ?? "";

  let baseUrl: string;
  try {
    baseUrl = runnerUrl();
  } catch (err) {
    return NextResponse.json(
      { error: "RUNNER_URL_NOT_CONFIGURED", message: (err as Error).message },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (mode === "good" && secret) {
    headers["x-runner-secret"] = secret;
  } else if (mode === "wrong") {
    headers["x-runner-secret"] = "this-is-not-the-secret";
  }
  // mode=none → no x-runner-secret at all.

  const startedAt = Date.now();
  let upstreamStatus = 0;
  let upstreamBody = "";
  try {
    const upstream = await fetch(`${baseUrl}/run-agent`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mission: "secret middleware smoke", scenario: "safe_research" }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    upstreamStatus = upstream.status;
    upstreamBody = (await upstream.text()).slice(0, 500);
  } catch (err) {
    return NextResponse.json(
      {
        mode,
        runner_secret_present: secret.length > 0,
        runner_url: baseUrl,
        error: "UPSTREAM_FAILED",
        message: (err as Error).message,
        elapsed_ms: Date.now() - startedAt,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode,
    runner_secret_present: secret.length > 0,
    runner_url: baseUrl,
    sent_header: mode === "good" || mode === "wrong",
    upstream_status: upstreamStatus,
    upstream_body_preview: upstreamBody,
    elapsed_ms: Date.now() - startedAt,
  });
}
