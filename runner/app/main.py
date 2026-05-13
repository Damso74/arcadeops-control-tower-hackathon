from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(run_agent_router)
app.include_router(tools_router)
app.include_router(runs_router)
