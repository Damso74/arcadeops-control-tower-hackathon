/**
 * GET /api/capabilities
 *
 * Tells the browser, at runtime, which optional adapters are configured on
 * the current deployment. The UI uses this to decide whether to render the
 * Gemini Reliability Judge panel and the Live ArcadeOps button.
 *
 * Why a runtime endpoint and not a build-time constant:
 * - Vercel deploys are immutable. If we baked Gemini availability into the
 *   build, adding `GEMINI_API_KEY` later would not enable the panel until
 *   a redeploy.
 * - This is a capability check, not a secret. We only return booleans and
 *   the public model name — never the key, never any URL fragment.
 */

export const runtime = "nodejs";
// Capability checks are cheap and never depend on the request body. We pin
// `dynamic = "force-dynamic"` so the response always reflects the current
// env, even on revalidated routes.
export const dynamic = "force-dynamic";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export interface CapabilitiesResponse {
  gemini: {
    available: boolean;
    model: string | null;
  };
  arcadeopsLive: {
    available: boolean;
  };
}

export function GET(): Response {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiAvailable = Boolean(geminiKey);
  const geminiModel = geminiAvailable
    ? sanitizeModelName(process.env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL
    : null;

  const baseUrl = process.env.ARCADEOPS_API_BASE_URL?.trim();
  const token = process.env.ARCADEOPS_DEMO_TOKEN?.trim();
  const agentId = process.env.ARCADEOPS_DEMO_AGENT_ID?.trim();
  const arcadeopsLive = Boolean(baseUrl && token && agentId);

  const body: CapabilitiesResponse = {
    gemini: { available: geminiAvailable, model: geminiModel },
    arcadeopsLive: { available: arcadeopsLive },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Browsers sometimes cache GETs aggressively — be explicit.
      "Cache-Control": "no-store",
    },
  });
}

function sanitizeModelName(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(trimmed)) return null;
  return trimmed;
}
