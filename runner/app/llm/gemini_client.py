"""Lazy Gemini client + resilient single-call wrapper (Lot 2b)."""

from __future__ import annotations

import concurrent.futures
import logging
import time
from typing import Any

from google import genai

from app.config import get_settings

log = logging.getLogger(__name__)

_client: genai.Client | None = None


class GeminiCallError(Exception):
    """Raised when a Gemini SDK call fails after retries (KeyboardInterrupt is re-raised)."""


def get_gemini_client() -> genai.Client:
    """Lazy singleton `genai.Client` (cached)."""
    global _client
    if _client is None:
        settings = get_settings()
        key = (settings.gemini_api_key or "").strip()
        if not key:
            raise GeminiCallError("GEMINI_API_KEY is empty")
        _client = genai.Client(api_key=key)
    return _client


def is_gemini_available() -> bool:
    settings = get_settings()
    key = settings.gemini_api_key
    return bool(key and str(key).strip())


def _is_transient_error(exc: BaseException) -> bool:
    """
    Heuristic: retry only on transient (network, rate-limit, 5xx) errors.

    Permanent errors (4xx auth, malformed request, missing model) should not retry.
    We rely on best-effort string/code matching because google-genai exception classes
    have moved between versions; this stays conservative.
    """
    msg = str(exc).lower()
    if any(k in msg for k in (
        "timeout",
        "timed out",
        "temporarily unavailable",
        "deadline exceeded",
        "service unavailable",
        "rate limit",
        "rate-limit",
        "ratelimit",
        "resource exhausted",
        "internal server error",
        "internal error",
        "bad gateway",
        "connection reset",
        "connection aborted",
        "remote disconnected",
        " 500",
        " 502",
        " 503",
        " 504",
        " 429",
    )):
        return True
    if any(k in msg for k in (
        "invalid api key",
        "api key not valid",
        "permission denied",
        "unauthorized",
        "authentication",
        "invalid argument",
        "not found",
        "malformed",
        "schema error",
        " 400",
        " 401",
        " 403",
        " 404",
    )):
        return False
    return False


def _generate_with_timeout(
    client: genai.Client,
    model: str,
    contents: Any,
    config: Any,
    timeout_s: float,
) -> Any:
    """
    Run a single `client.models.generate_content` call with a hard wall-clock timeout.

    The google-genai SDK does not expose a native timeout knob on every call path, so we
    delegate to a single-worker `ThreadPoolExecutor` and `future.result(timeout=...)`.
    The underlying HTTP request cannot truly be cancelled, but the caller is unblocked
    and the retry loop above can decide what to do next.
    """
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(
            lambda: client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            ),
        )
        try:
            return future.result(timeout=timeout_s)
        except concurrent.futures.TimeoutError as exc:
            future.cancel()
            raise TimeoutError(f"Gemini call exceeded {timeout_s}s timeout") from exc


def call_gemini_with_retry(
    model: str,
    contents: Any,
    config: Any,
    *,
    max_retries: int = 2,
    timeout_s: float = 30.0,
) -> Any:
    """
    Wraps `client.models.generate_content` with backoff and per-call timeout.

    - Backoff schedule: 1s then 2s (max 2 retries = 3 total attempts).
    - Only retries on transient classes (5xx / 429 / network / timeout).
    - Permanent errors (auth, malformed request) raise immediately.
    - All non-`KeyboardInterrupt` failures end up wrapped in `GeminiCallError`.
    """
    settings = get_settings()
    if not is_gemini_available():
        raise GeminiCallError("Gemini not configured (missing API key)")

    client = get_gemini_client()
    last_exc: BaseException | None = None
    delays = (1.0, 2.0)
    effective_model = model or settings.gemini_model

    for attempt in range(max_retries + 1):
        t0 = time.monotonic()
        try:
            response = _generate_with_timeout(
                client,
                effective_model,
                contents,
                config,
                timeout_s,
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            in_tok, out_tok = _read_usage(response)
            log.info(
                "gemini_call ok model=%s attempt=%s latency_ms=%s tokens_in=%s tokens_out=%s",
                effective_model,
                attempt + 1,
                latency_ms,
                in_tok,
                out_tok,
            )
            return response
        except KeyboardInterrupt:
            raise
        except BaseException as exc:
            last_exc = exc
            latency_ms = int((time.monotonic() - t0) * 1000)
            transient = _is_transient_error(exc) or isinstance(exc, TimeoutError)
            log.warning(
                "gemini_call fail model=%s attempt=%s/%s latency_ms=%s transient=%s err=%s",
                effective_model,
                attempt + 1,
                max_retries + 1,
                latency_ms,
                transient,
                exc,
            )
            if not transient:
                raise GeminiCallError(f"Gemini permanent error: {exc}") from exc
            if attempt < max_retries:
                time.sleep(delays[min(attempt, len(delays) - 1)])

    assert last_exc is not None
    raise GeminiCallError(f"Gemini call failed after retries: {last_exc}") from last_exc


def _read_usage(response: Any) -> tuple[int, int]:
    """Best-effort usage metadata extraction (`prompt_token_count`, `candidates_token_count`)."""
    um = getattr(response, "usage_metadata", None)
    if um is None:
        return 0, 0
    try:
        in_tok = int(getattr(um, "prompt_token_count", 0) or 0)
    except (TypeError, ValueError):
        in_tok = 0
    try:
        out_tok = int(
            getattr(um, "candidates_token_count", 0)
            or getattr(um, "response_token_count", 0)
            or 0,
        )
    except (TypeError, ValueError):
        out_tok = 0
    return in_tok, out_tok


def read_usage(response: Any) -> tuple[int, int]:
    """Public alias kept for orchestrator / agent token accounting."""
    return _read_usage(response)
