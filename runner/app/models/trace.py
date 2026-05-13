"""Pydantic models for deterministic agent run traces (Lot 1)."""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class AgentRole(StrEnum):
    PLANNER = "PLANNER"
    WORKER = "WORKER"
    RISK = "RISK"
    CONTROL_TOWER = "CONTROL_TOWER"


class ToolRiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ToolSource(StrEnum):
    BUILTIN = "BUILTIN"
    MOCK_API = "MOCK_API"
    MCP_COMPATIBLE = "MCP_COMPATIBLE"


class Verdict(StrEnum):
    SHIP = "SHIP"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    BLOCKED = "BLOCKED"


class ToolDefinition(BaseModel):
    name: str
    description: str
    risk: ToolRiskLevel
    approval_required: bool
    source: ToolSource


class ToolCall(BaseModel):
    id: str
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] | None = None
    success: bool
    latency_ms: int
    risk: ToolRiskLevel


class AgentStep(BaseModel):
    id: str
    agent: AgentRole
    phase: str
    summary: str
    tool_calls: list[ToolCall] = Field(default_factory=list)
    started_at: str
    duration_ms: int


class RiskFinding(BaseModel):
    id: str
    severity: ToolRiskLevel
    category: str
    description: str
    evidence: str
    recommendation: str


class PolicyGate(BaseModel):
    name: str
    passed: bool
    reason: str


class RunVerdict(BaseModel):
    verdict: Verdict
    reasons: list[str]
    policy_gates: list[PolicyGate]
    risk_findings: list[RiskFinding]


class AgentRunTrace(BaseModel):
    run_id: str
    runner: str = "vultr"
    region: str
    model: str
    mission: str
    agents_involved: list[AgentRole]
    tools_available: list[ToolDefinition]
    steps: list[AgentStep]
    verdict: RunVerdict
    started_at: str
    completed_at: str
    cost_usd: float
    tokens_used: int
    is_mocked: bool
