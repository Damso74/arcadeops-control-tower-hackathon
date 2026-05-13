import hmac

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes.health import router as health_router
from app.routes.run_agent import router as run_agent_router
from app.routes.runs import router as runs_router
from app.routes.tools import router as tools_router

settings = get_settings()

app = FastAPI(
    title="ArcadeOps Control Tower Runner",
    version=settings.runner_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    # Lot 5 FULL: explicitly allow the shared-secret header so the
    # browser preflight is never the reason a Vercel call gets blocked.
    allow_headers=["*", "x-runner-secret"],
)


# Endpoints that stay public regardless of the kill-switch. /health is the
# Vultr/cloud-init readiness probe; /docs and /openapi.json keep the
# interactive API surface usable for hackathon judges. /_diag is a
# kill-switch-gated debug endpoint that intentionally bypasses the
# secret check (it never returns the secret value itself).
_PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/_diag"}


@app.middleware("http")
async def enforce_runner_secret(request: Request, call_next):
    """Reject requests missing or mismatching ``x-runner-secret``.

    The middleware is a hard-disabled no-op when ``RUNNER_REQUIRE_SECRET``
    is unset/false, which matches the Lot 4 minimal contract. When the
    flag is on but ``RUNNER_SECRET`` is empty, every non-public route is
    blocked — fail-closed by design.
    """
    if not settings.runner_require_secret:
        return await call_next(request)
    if request.method == "OPTIONS":
        # Allow CORS preflight to succeed before secret check, otherwise
        # the browser never gets to send the actual header.
        return await call_next(request)
    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    expected = settings.runner_secret or ""
    received = request.headers.get("x-runner-secret", "")
    if (
        expected
        and received
        and hmac.compare_digest(expected, received)
    ):
        return await call_next(request)

    return JSONResponse(
        status_code=401,
        content={
            "error": "missing_or_invalid_runner_secret",
            "hint": "Send header 'x-runner-secret: <RUNNER_SECRET>'.",
        },
    )


app.include_router(health_router)
app.include_router(run_agent_router)
app.include_router(tools_router)
app.include_router(runs_router)


@app.get("/_diag")
async def diag() -> JSONResponse:
    """Lot 5 FULL kill-switched diagnostics endpoint.

    Returns 404 unless ``RUNNER_DIAG_ENABLED=1`` is set in the .env.
    When enabled, only exposes booleans + length of the loaded
    secret — never the secret value itself.
    """
    if not settings.runner_diag_enabled:
        return JSONResponse(
            status_code=404, content={"error": "not_found"}
        )
    return JSONResponse(
        status_code=200,
        content={
            "runner_require_secret_loaded": bool(settings.runner_require_secret),
            "runner_secret_present": bool(settings.runner_secret),
            "runner_secret_length": len(settings.runner_secret or ""),
            "runner_version": settings.runner_version,
        },
    )
