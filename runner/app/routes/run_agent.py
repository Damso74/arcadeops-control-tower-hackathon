import logging
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models.trace import AgentRunTrace
from app.orchestrator import fallback_fixture_trace, run_agent_orchestration

router = APIRouter()
log = logging.getLogger(__name__)


class RunAgentBody(BaseModel):
    mission: str
    scenario: Literal["vip_churn", "safe_research"] = Field(
        default="vip_churn",
        description="Demo scenario key",
    )


@router.post("/run-agent")
async def run_agent(body: RunAgentBody) -> AgentRunTrace:
    try:
        return run_agent_orchestration(mission=body.mission, scenario=body.scenario)
    except Exception:
        log.exception("run_agent route failed; returning deterministic fixture")
        return fallback_fixture_trace(mission=body.mission, scenario=body.scenario)
