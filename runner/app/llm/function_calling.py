"""Map tool registry <-> Gemini FunctionDeclaration + defensive call parsing."""

from __future__ import annotations

import json
import logging
from typing import Any

from google.genai import types as genai_types

log = logging.getLogger(__name__)


TOOL_NAME_MAP: dict[str, str] = {
    "kb_search": "kb.search",
    "crm_lookup": "crm.lookup",
    "crm_update_attempt": "crm.update_attempt",
    "email_draft": "email.draft",
    "email_send_attempt": "email.send_attempt",
    "policy_check": "policy.check",
    "approval_request": "approval.request",
    "audit_log": "audit.log",
    "budget_check": "budget.check",
    "risk_scan": "risk.scan",
}

_GEMINI_TO_ORIGINAL_CI: dict[str, str] = {
    k.lower(): v for k, v in TOOL_NAME_MAP.items()
}
_ORIGINAL_TO_GEMINI_CI: dict[str, str] = {
    v.lower(): k for k, v in TOOL_NAME_MAP.items()
}


def original_to_gemini_name(name: str) -> str:
    """
    Map a dotted registry name (`kb.search`) to its Gemini-safe form (`kb_search`).

    Case-insensitive on lookup. Unknown names fall back to dot->underscore swap so
    that the Worker can still route raw Gemini calls to the registry safely.
    """
    if not name:
        return name
    key = name.strip().lower()
    if key in _ORIGINAL_TO_GEMINI_CI:
        return _ORIGINAL_TO_GEMINI_CI[key]
    return name.replace(".", "_")


def gemini_to_original_name(name: str) -> str | None:
    """
    Reverse mapping (`kb_search` -> `kb.search`).

    Returns `None` when the name is unknown (treat as a hallucinated tool).
    Case-insensitive on lookup.
    """
    if not name:
        return None
    return _GEMINI_TO_ORIGINAL_CI.get(name.strip().lower())


def tools_to_function_declarations(registry: list[dict]) -> list[genai_types.FunctionDeclaration]:
    """Build Gemini FunctionDeclarations from `tool_registry.json` entries."""
    declarations: list[genai_types.FunctionDeclaration] = []
    for tool in registry:
        dotted = tool["name"]
        gemini_name = original_to_gemini_name(dotted)
        desc = str(tool.get("description", ""))
        parameters_json_schema = _parameters_schema_for_tool(dotted)
        declarations.append(
            genai_types.FunctionDeclaration(
                name=gemini_name,
                description=desc,
                parameters_json_schema=parameters_json_schema,
            ),
        )
    return declarations


def _parameters_schema_for_tool(dotted_name: str) -> dict[str, Any]:
    """Per-tool JSON schemas aligned with mock implementations and fixture trace."""
    if dotted_name == "kb.search":
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Free-text search query against the internal KB.",
                },
            },
            "required": ["query"],
        }
    if dotted_name == "crm.lookup":
        return {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "CRM account identifier, e.g. acct_vip_88421.",
                },
            },
            "required": ["account_id"],
        }
    if dotted_name == "crm.update_attempt":
        return {
            "type": "object",
            "properties": {
                "account_id": {"type": "string"},
                "patch": {
                    "type": "object",
                    "description": "Fields to update on the CRM record (no PII).",
                },
            },
            "required": ["account_id", "patch"],
        }
    if dotted_name == "email.draft":
        return {
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "tone": {
                    "type": "string",
                    "description": "Tone hint, e.g. apologetic_professional.",
                },
            },
            "required": ["to", "subject", "tone"],
        }
    if dotted_name == "email.send_attempt":
        return {
            "type": "object",
            "properties": {
                "draft_id": {"type": "string"},
                "channel": {
                    "type": "string",
                    "description": "Send channel, e.g. customer_primary.",
                },
            },
            "required": ["draft_id", "channel"],
        }
    if dotted_name == "policy.check":
        return {
            "type": "object",
            "properties": {
                "action": {"type": "string"},
                "amount_usd": {"type": "number"},
            },
            "required": ["action", "amount_usd"],
        }
    if dotted_name == "approval.request":
        return {
            "type": "object",
            "properties": {
                "action": {"type": "string"},
                "reason": {"type": "string"},
                "approver_role": {"type": "string"},
            },
            "required": ["action", "reason", "approver_role"],
        }
    if dotted_name == "audit.log":
        return {
            "type": "object",
            "properties": {
                "event": {"type": "string"},
                "metadata": {"type": "object"},
            },
            "required": ["event", "metadata"],
        }
    if dotted_name == "budget.check":
        return {
            "type": "object",
            "properties": {
                "estimated_cost_usd": {"type": "number"},
                "category": {"type": "string"},
            },
            "required": ["estimated_cost_usd", "category"],
        }
    if dotted_name == "risk.scan":
        return {
            "type": "object",
            "properties": {
                "scope": {"type": "string"},
                "include_crm_notes": {"type": "boolean"},
            },
            "required": ["scope", "include_crm_notes"],
        }
    return {"type": "object", "properties": {}, "additionalProperties": True}


def parse_function_call(call: Any) -> tuple[str, dict[str, Any]]:
    """
    Returns `(dotted_name_or_raw_gemini_name, args_dict)` from a SDK function call object.

    Defensive against `args` being a dict, JSON string, proto Map, None, or anything else.
    Unknown Gemini names are returned verbatim; callers should treat them as hallucinations.
    """
    try:
        gemini_name = str(
            getattr(call, "name", None)
            or getattr(call, "function_name", None)
            or "",
        )
    except Exception:
        gemini_name = ""

    original = gemini_to_original_name(gemini_name)
    dotted = original if original is not None else gemini_name

    args = _coerce_args(getattr(call, "args", None))
    return dotted, args


def _coerce_args(raw: Any) -> dict[str, Any]:
    """Force any SDK args shape (dict / JSON-str / proto Map / None) into a plain dict."""
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, ValueError):
            log.warning("function_call args string was not valid JSON")
            return {}
    try:
        as_dict = dict(raw)
        if isinstance(as_dict, dict):
            return as_dict
    except Exception:
        pass
    log.warning("function_call args had unexpected type %s", type(raw))
    return {}


def iter_function_calls_from_response(response: Any) -> list[Any]:
    """
    Best-effort extraction of function calls from a `generate_content` response.

    Walks `response.candidates[*].content.parts[*].function_call` and tolerates missing
    candidates, content, or parts (returns an empty list rather than raising).
    """
    calls: list[Any] = []
    try:
        candidates = getattr(response, "candidates", None) or []
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content is not None else None
            if not parts:
                continue
            for part in parts:
                fc = getattr(part, "function_call", None)
                if fc is not None:
                    calls.append(fc)
    except Exception as exc:
        log.warning("iter_function_calls_from_response defensive catch: %s", exc)
    return calls


def extract_text_from_response(response: Any) -> str:
    """Best-effort model text extraction (returns "" on missing or malformed response)."""
    chunks: list[str] = []
    try:
        candidates = getattr(response, "candidates", None) or []
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content is not None else None
            if not parts:
                continue
            for part in parts:
                t = getattr(part, "text", None)
                if t:
                    chunks.append(str(t))
    except Exception as exc:
        log.warning("extract_text_from_response defensive catch: %s", exc)
    return "".join(chunks).strip()


extract_function_calls = iter_function_calls_from_response
extract_text = extract_text_from_response


def make_function_response_part(name: str, response: dict[str, Any]) -> genai_types.Part:
    """
    Build a `types.Part` wrapping a function response, robust to SDK variants.

    Tries `Part.from_function_response(name=..., response=...)` first (google-genai 0.3+)
    and falls back to the explicit `Part(function_response=FunctionResponse(...))` form.
    """
    response_dict = response if isinstance(response, dict) else {"output": response}
    factory = getattr(genai_types.Part, "from_function_response", None)
    if callable(factory):
        try:
            return factory(name=name, response=response_dict)
        except Exception as exc:
            log.debug("Part.from_function_response failed, falling back: %s", exc)
    return genai_types.Part(
        function_response=genai_types.FunctionResponse(
            name=name,
            response=response_dict,
        ),
    )
