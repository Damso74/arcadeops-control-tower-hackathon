import { NextRequest, NextResponse } from "next/server";

import { runnerHeaders } from "@/lib/runner/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const RUNNER_URL = (process.env.RUNNER_URL ?? "http://140.82.35.52").trim();

interface RunAgentRequest {
  mission: string;
  scenario?: "vip_churn" | "safe_research";
}

export async function GET() {
  return NextResponse.json({
    proxy: "ok",
    runner_url: RUNNER_URL,
    description:
      "POST { mission: string, scenario?: \"vip_churn\" | \"safe_research\" } to forward to the Vultr runner.",
  });
}

export async function POST(req: NextRequest) {
  let body: RunAgentRequest;
  try {
    body = (await req.json()) as RunAgentRequest;
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_JSON_BODY",
        hint: "Send JSON body { mission: string, scenario?: ... }",
      },
      { status: 400 },
    );
  }

  if (!body?.mission || typeof body.mission !== "string") {
    return NextResponse.json(
      {
        error: "MISSION_REQUIRED",
        hint: "Field 'mission' must be a non-empty string.",
      },
      { status: 400 },
    );
  }

  const upstreamUrl = `${RUNNER_URL.replace(/\/$/, "")}/run-agent`;
  const startedAt = Date.now();

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...runnerHeaders() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(85_000),
    });

    const elapsedMs = Date.now() - startedAt;
    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "UPSTREAM_RUNNER_ERROR",
          upstream_status: upstream.status,
          upstream_body: text.slice(0, 2000),
          upstream_elapsed_ms: elapsedMs,
          runner_url: upstreamUrl,
        },
        { status: 502 },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "UPSTREAM_INVALID_JSON",
          upstream_body: text.slice(0, 2000),
          upstream_elapsed_ms: elapsedMs,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        proxy: {
          runner_url: upstreamUrl,
          upstream_elapsed_ms: elapsedMs,
        },
        ...(payload as Record<string, unknown>),
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "UPSTREAM_FETCH_FAILED",
        message: (err as Error).message,
        runner_url: upstreamUrl,
      },
      { status: 502 },
    );
  }
}
