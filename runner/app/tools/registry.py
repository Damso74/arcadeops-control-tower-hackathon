"""Load `tool_registry.json` + dispatch mock tool execution."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.llm.function_calling import original_to_gemini_name
from app.tools.implementations import IMPLEMENTATIONS_MAP

log = logging.getLogger(__name__)

_REGISTRY_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "tool_registry.json"


@lru_cache
def _cached_registry_raw() -> str:
    return _REGISTRY_PATH.read_text(encoding="utf-8")


def get_tool_registry() -> list[dict[str, Any]]:
    return json.loads(_cached_registry_raw())


def execute_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """
    Executes a mock tool by registry dotted name (e.g. `kb.search`).

    Unknown tools return a structured error dict (never raises).
    """
    impl_key = original_to_gemini_name(name)
    fn = IMPLEMENTATIONS_MAP.get(impl_key)
    if fn is None:
        log.warning("Unknown tool requested: %s (impl_key=%s)", name, impl_key)
        return {"error": "unknown_tool", "name": name}
    try:
        return fn(args if isinstance(args, dict) else {})
    except Exception as exc:  # noqa: BLE001 — defensive mock boundary
        log.exception("Tool execution failed: %s", name)
        return {"error": "tool_execution_failed", "name": name, "detail": str(exc)}
