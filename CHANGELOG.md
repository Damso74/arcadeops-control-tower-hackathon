# Changelog

All notable changes to ArcadeOps Control Tower for the **Milan AI
Week 2026** hackathon. Format inspired by
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Times are
build-window-relative; commit hashes link back to `git log`.

The hackathon was structured as **eight Lots** (work batches), each
with its own pass/fail acceptance gate.

## [Lot 4 minimal] · 2026-05-13 · Vercel proxy bridge — LIVE PASS

- Added `/api/runner-proxy` Node.js route that forwards a JSON body to
  `http://140.82.35.52/run-agent` and shapes upstream errors into
  predictable JSON envelopes (`UPSTREAM_RUNNER_ERROR`,
  `UPSTREAM_INVALID_JSON`, `UPSTREAM_FETCH_FAILED`,
  `INVALID_JSON_BODY`, `MISSION_REQUIRED`).
- `RUNNER_URL` is `.trim()`-ed at module load (`d5430ce`) to defend
  against CRLF injection when env vars are pasted with stray newlines.
- `AbortSignal.timeout(85_000)` aligns with Vercel `maxDuration: 90`
  to surface a clean timeout instead of a frozen function.
- Smoke proof on `2026-05-13` (run id `b06cb0f8d64143f8ad52dc780528e74a`):
  - HTTP 200
  - upstream wall-clock 17 222 ms (≈ 17.6 s end-to-end)
  - 11 453 Gemini tokens consumed
  - $0.001001 cost
  - verdict `BLOCKED` (3 policy gates triggered)
  - `is_mocked: false` — LIVE Gemini, no fixture fallback
- Reachability cross-check from check-host: 200 OK from Frankfurt
  (14 ms), Amsterdam (24 ms), San Francisco (275 ms), Tokyo (499 ms).
- **PASS gate** — Vercel can talk to Vultr Frankfurt LIVE end-to-end,
  return a real Gemini-driven trace, and surface a `BLOCKED` verdict.

## [Lot 3b] · 2026-05-13 · Cloud-init zero-SSH provisioning

- Added `scripts/vultr-cloud-init.yaml.template` that installs
  Docker, Caddy, UFW, clones the repo, writes `/opt/arcadeops/.env`
  with `0600` perms, runs `docker compose up`, opens 22/80/443, and
  reloads Caddy.
- Extended `scripts/vultr-provision.ps1` with a `-CloudInitPath` flag
  (`9d24a1e`) that renders the template with the Gemini key, posts
  `user_data` to the Vultr API at instance creation, and waits for
  `/health` to return 200.
- Defeats corporate firewalls (FortiGuard, Zscaler) that block
  outbound SSH — provisioning is HTTPS-only via the Vultr API, then
  cloud-init bootstraps the box autonomously.
- Logs of a successful run live in `.vultr-provision-cloudinit.log`
  and `.vultr-health-wait.log`.

## [Lot 3] · 2026-05-13 · Vultr VM provisioned LIVE

- One Cloud Compute VM created in `fra` (Frankfurt) at IP
  `140.82.35.52`, plan `vc2-1c-2gb`, $5/month.
- Instance id `12c32476-a13f-4f0c-a1d4-e4845643b37e`, persisted to
  `.vultr-state.json` so the provisioning CLI is idempotent.
- Health endpoint reachable from four continents (see
  `.smoke-checkhost-prod.json`).

## [Lot 2b] · 2026-05-13 · Multi-agent hardening

- **Wall-clock deadline** on the orchestrator
  (`AGENT_WALL_CLOCK_S = 60 s`), checked on every Worker turn.
- **Per-Gemini-call timeout** (30 s) implemented via
  `concurrent.futures.ThreadPoolExecutor` because the SDK does not
  expose a uniform timeout knob — see
  `runner/app/llm/gemini_client.py::_generate_with_timeout`.
- **Transient-only retry** classifier (`_is_transient_error`) so 5xx,
  429, network and timeout retry, but 401/403/404 fail fast.
- **20-turn ceiling** on the Worker loop, plus
  `MAX_TOOL_CALLS = 10` cap, plus `cap_hit` step emitted with reason
  (`wallclock`, `tool_calls`, `max_turns`).
- **Anti-injection** explicit in both system prompts; the demo CRM
  mock returns a deliberately injected `customer_note` so the
  behaviour is verifiable on stage.
- **Hallucinated tool name handling** — `gemini_to_original_name`
  rejects unknown function names and the Worker emits a structured
  `unknown_tool` step instead of crashing.
- **Cost tracking** from `usage_metadata` aggregated across the
  Planner and every Worker turn, priced server-side in
  `_compute_cost_usd`.
- **Partial-live preservation** — when a transient error happens
  *after* the first successful tool call, the run ends with an
  `aborted` step and a partial trace, not a full fixture fallback.

## [Lot 2a] · 2026-05-13 · Multi-agent skeleton

- Planner Agent (`runner/app/agents/planner.py`): structured JSON
  output, `temperature=0.2`, default plan fallback when Gemini's
  text is empty or unparseable.
- Worker Agent (`runner/app/agents/worker.py`): function calling
  loop, defensive arg coercion (string / proto Map / None →
  dict), `_make_step` per Worker turn.
- Tool registry: ten mocked tools surfaced as Gemini
  `FunctionDeclaration` with per-tool JSON schemas — `kb.search`,
  `crm.lookup`, `crm.update_attempt`, `email.draft`,
  `email.send_attempt`, `policy.check`, `approval.request`,
  `audit.log`, `budget.check`, `risk.scan`.
- `runner/app/tools/implementations.py` provides deterministic mocked
  results for each tool, including the prompt-injection bait inside
  `crm_lookup`.

## [Lot 1b] · 2026-05-13 · Vultr provisioning scripts

- `scripts/vultr-provision.ps1` (PowerShell, Windows) and
  `scripts/vultr-provision.sh` (Bash, Linux/macOS) — sibling CLIs
  with shared flags: `-DryRun`, `-Force`,
  `-Region`/`--region`, etc.
- Idempotent: state persists to `.vultr-state.json`, `Ctrl+C`
  mid-run is always safe to retry, `-Force` deletes a stale instance
  before re-creating.
- `scripts/vultr-destroy.ps1` + `vultr-destroy.sh` for a confirmed
  teardown that always nukes the right instance id.

## [Lot 1] · 2026-05-13 · FastAPI runner backbone

- `runner/app/main.py` — FastAPI app with CORS, health, run-agent,
  tools and runs routes.
- `runner/Dockerfile` — multi-stage, `python:3.12-slim`, non-root
  `appuser`, baked-in `HEALTHCHECK`.
- `runner/docker-compose.yml` — port-bound to `127.0.0.1:8000`,
  picks up `.env` from the runner directory, restart policy
  `unless-stopped`, healthcheck mirrored at the compose level.
- `runner/app/models/trace.py` — Pydantic models for the trace
  contract (`AgentRunTrace`, `RunVerdict`, `PolicyGate`,
  `RiskFinding`, `ToolCall`, `ToolDefinition`, `AgentStep`).
- `runner/app/fixtures/{vip_churn,safe_research}_trace.json` — two
  sanitized fixture traces used as deterministic fallbacks.

## [Pre-Lot 1 inheritance] · 2026-05-13 · Frontend V0–V5

This hackathon build inherits a frontend that already shipped V0
through V5 in earlier weeks, included here for jury context:

- **V0** — Control Tower replay scaffold + ArcadeOps backend adapter
  (`83fc4fd`).
- **V0+** — public replay-only mode polished (`c4e142f`).
- **V1** — Gemini Reliability Judge + Vultr-ready packaging
  (`5186119`, `3ca6041`).
- **V2** — testable agent production gate with guardrail re-scoring
  (`1313e8a`).
- **V3** — production-gate UX polished, decision-first audit flow
  (`9daa444`).
- **V4** — deterministic policy gates added on top of Gemini
  (`b19149f`).
- **V5** — `feat/production-release-hardening` merged with
  deterministic verdict consistency (`095c793`).

## [Lot 5 FULL] · in flight (parallel worker)

The frontend ↔ runner bridge through Server-Sent Events is being
rebuilt on a parallel branch. This pitch pack ships independently of
that work; the Lot 5 FULL placeholder is documented here so jury
reviewers can pick up the thread post-hackathon.

- *(Tracked separately by the engineering worker — do not touch from
  this docs branch.)*

---

## Hackathon timeline summary

| Date         | Event                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| 2026-05-13   | Lots 1, 1b, 2a, 2b, 3, 3b, 4 minimal landed end-to-end                 |
| 2026-05-13   | First LIVE Gemini run via Vercel proxy — `BLOCKED` in 17.6 s, $0.001  |
| 2026-05-13   | Pitch pack v1 (this changelog) opened on `docs/pitch-pack-v1`          |
| `[TBD]`      | Demo video recorded per `docs/VIDEO_SCRIPT_90S.md`                     |
| `[TBD]`      | Submission published on Lablab.ai                                      |

---

## Conventions

- Each Lot has a binary acceptance gate (PASS / FAIL).
- Commits use Conventional Commits (`feat:`, `fix:`, `docs:`,
  `chore:`).
- The implementation plan files in `docs/implementation/LOT_*_PLAN.md`
  and `TODO_LOT_*.md` are owned by the engineering worker on a parallel
  branch and are intentionally not edited from `docs/pitch-pack-v1`.
