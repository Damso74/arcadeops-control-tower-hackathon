import json
from pathlib import Path

from fastapi import APIRouter

from app.models.trace import ToolDefinition

router = APIRouter()

_REGISTRY_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "tool_registry.json"


@router.get("/tools")
def list_tools() -> list[ToolDefinition]:
    data = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    return [ToolDefinition.model_validate(item) for item in data]
