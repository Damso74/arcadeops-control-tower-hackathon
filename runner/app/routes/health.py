import time

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()

_PROCESS_START = time.time()


@router.get("/health")
def health() -> dict[str, str | float]:
    settings = get_settings()
    uptime_s = round(time.time() - _PROCESS_START, 3)
    return {
        "status": "ok",
        "runner": "vultr",
        "version": settings.runner_version,
        "region": settings.region,
        "uptime_s": uptime_s,
    }
