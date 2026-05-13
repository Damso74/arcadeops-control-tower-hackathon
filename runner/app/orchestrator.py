"""Planner -> Worker orchestration + trace normalization (Lot 2b)."""

from __future__ import annotations

import json
import logging
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.agents.planner import PlannerResult, run_planner
from app.agents.worker import run_worker
from app.config import get_settings
from app.llm.gemini_client import GeminiCallError, is_gemini_available
from app.models.trace import AgentRole, AgentRunTrace, AgentStep, RunVerdict, ToolDefinition
from app.tools.registry import get_tool_registry

log = logging.getLogger(__name__)

_FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# Pricing for gemini-2.5-flash (USD per 1M tokens). Tracked in code so we can adjust
# without touching the trace schema. These are reasonable defaults; verify against
# Google AI pricing page before publishing the demo.
_PRICE_INPUT_PER_M_USD = 0.075
_PRICE_OUTPUT_PER_M_USD = 0.30


def _fixture_filename(scenario: str) -> str:
    return "safe_research_trace.json" if scenario == "safe_research" else "vip_churn_trace.json"


def _now_iso_z() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _load_fixture_trace(scenario: str, mission: str, *, mocked: bool) -> AgentRunTrace:
    settings = get_settings()
    path = _FIXTURES_DIR / _fixture_filename(scenario)
    raw = json.loads(path.read_text(encoding="utf-8"))
    trace = AgentRunTrace.model_validate(raw)
    now = _now_iso_z()
    return trace.model_copy(
        update={
            "run_id": uuid.uuid4().hex,
            "mission": mission,
            "region": settings.region,
            "started_at": now,
            "completed_at": now,
            "is_mocked": mocked,
        },
    )


def _load_fixture_verdict(scenario: str) -> RunVerdict:
    path = _FIXTURES_DIR / _fixture_filename(scenario)
    raw = json.loads(path.read_text(encoding="utf-8"))
    return RunVerdict.model_validate(raw["verdict"])


def fallback_fixture_trace(mission: str, scenario: str = "vip_churn") -> AgentRunTrace:
    """Defense-in-depth helper for API routes (always returns a valid trace)."""
    return _load_fixture_trace(scenario, mission, mocked=True)


def _planner_step(plan_result: PlannerResult) -> AgentStep:
    plan = plan_result.plan
    parts: list[str] = []
    objective = (plan.objective or "Plan").strip()
    if objective:
        parts.append(objective[:200])
    if plan.steps:
        arrow = " -> ".join(s.strip() for s in plan.steps[:5] if isinstance(s, str) and s.strip())
        if arrow:
            parts.append(arrow)
    if plan.constraints:
        constraints = "; ".join(
            c.strip() for c in plan.constraints[:3] if isinstance(c, str) and c.strip()
        )
        if constraints:
            parts.append(f"constraints: {constraints}")
    summary = " | ".join(parts)[:500] or "Planner produced an empty plan"
    return AgentStep(
        id=f"step-{uuid.uuid4().hex[:10]}",
        agent=AgentRole.PLANNER,
        phase="planning",
        summary=summary,
        tool_calls=[],
        started_at=plan_result.started_at,
        duration_ms=max(0, plan_result.duration_ms),
    )


def _compute_completed_at(steps: list[AgentStep]) -> str:
    if not steps:
        return _now_iso_z()
    last = steps[-1]
    try:
        ts = last.started_at.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts)
        end = dt + timedelta(milliseconds=max(0, last.duration_ms or 0))
        return end.astimezone(UTC).isoformat().replace("+00:00", "Z")
    except (ValueError, TypeError):
        return _now_iso_z()


def _compute_cost_usd(input_tokens: int, output_tokens: int) -> float:
    if input_tokens <= 0 and output_tokens <= 0:
        return 0.0
    cost = (
        (input_tokens * _PRICE_INPUT_PER_M_USD)
        + (output_tokens * _PRICE_OUTPUT_PER_M_USD)
    ) / 1_000_000
    return round(cost, 6)


def run_agent_orchestration(mission: str, scenario: str = "vip_churn") -> AgentRunTrace:
    """
    Coordinates Planner -> Worker -> `AgentRunTrace`.

    Never raises: any uncaught failure degrades to a deterministic fixture trace.
    """
    settings = get_settings()
    try:
        if not is_gemini_available():
            log.info("orchestrator: GEMINI_API_KEY missing -> fixture fallback")
            return _load_fixture_trace(scenario, mission, mocked=True)

        deadline_ts = time.monotonic() + float(settings.agent_wall_clock_s)

        try:
            planner_result = run_planner(mission)
        except GeminiCallError as exc:
            log.warning("Planner GeminiCallError -> fixture fallback: %s", exc)
            return _load_fixture_trace(scenario, mission, mocked=True)

        try:
            worker_result = run_worker(
                planner_result.plan,
                mission,
                int(settings.max_tool_calls),
                deadline_ts,
            )
        except GeminiCallError as exc:
            log.warning(
                "Worker GeminiCallError before any successful tool call -> fixture fallback: %s",
                exc,
            )
            return _load_fixture_trace(scenario, mission, mocked=True)

        planner_step = _planner_step(planner_result)
        steps: list[AgentStep] = [planner_step, *worker_result.steps]

        verdict = _load_fixture_verdict(scenario)
        tools_available = [ToolDefinition.model_validate(t) for t in get_tool_registry()]

        started_at = steps[0].started_at if steps else _now_iso_z()
        completed_at = _compute_completed_at(steps)

        input_tokens = planner_result.input_tokens + worker_result.input_tokens
        output_tokens = planner_result.output_tokens + worker_result.output_tokens
        tokens_used = input_tokens + output_tokens
        cost_usd = _compute_cost_usd(input_tokens, output_tokens)

        is_mocked = bool(worker_result.aborted or planner_result.is_fallback)

        return AgentRunTrace(
            run_id=uuid.uuid4().hex,
            runner="vultr",
            region=settings.region,
            model=settings.gemini_model,
            mission=mission,
            agents_involved=[AgentRole.PLANNER, AgentRole.WORKER],
            tools_available=tools_available,
            steps=steps,
            verdict=verdict,
            started_at=started_at,
            completed_at=completed_at,
            cost_usd=cost_usd,
            tokens_used=tokens_used,
            is_mocked=is_mocked,
        )
    except Exception:
        log.exception("run_agent_orchestration unexpected failure -> fixture fallback")
        return _load_fixture_trace(scenario, mission, mocked=True)
