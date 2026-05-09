/**
 * GET /api/health
 *
 * Lightweight health endpoint used by Docker / Vultr / load balancers to
 * verify the service is up. Exposes only public capability flags — no
 * secrets, no env values, no internal IDs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthResponse {
  ok: true;
  service: "arcadeops-control-tower-hackathon";
  mode: "replay";
  geminiConfigured: boolean;
  arcadeopsLiveConfigured: boolean;
  uptimeSeconds: number;
}

const startedAt = Date.now();

export function GET(): Response {
  const body: HealthResponse = {
    ok: true,
    service: "arcadeops-control-tower-hackathon",
    mode: "replay",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    arcadeopsLiveConfigured: Boolean(
      process.env.ARCADEOPS_API_BASE_URL?.trim() &&
        process.env.ARCADEOPS_DEMO_TOKEN?.trim() &&
        process.env.ARCADEOPS_DEMO_AGENT_ID?.trim(),
    ),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
