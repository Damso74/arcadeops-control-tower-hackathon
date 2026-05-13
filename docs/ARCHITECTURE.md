# ArcadeOps Control Tower — Architecture

> Real, deployed, end-to-end. Every diagram below corresponds to running
> code in this repository — not a future-state aspiration.

This document is the canonical architectural reference for the
hackathon submission. It covers six perspectives:

1. [Sequence diagram — request lifecycle](#1-sequence-diagram--request-lifecycle)
2. [Component diagram — modules and contracts](#2-component-diagram--modules-and-contracts)
3. [Deployment diagram — where each piece runs](#3-deployment-diagram--where-each-piece-runs)
4. [Data flow — trace event lifecycle](#4-data-flow--trace-event-lifecycle)
5. [Security model — secrets and trust boundaries](#5-security-model--secrets-and-trust-boundaries)
6. [Reliability model — fallback chain and cost caps](#6-reliability-model--fallback-chain-and-cost-caps)

---

## 1. Sequence diagram — request lifecycle

The diagram below traces a `POST /api/runner-proxy` (or the SSE
`/api/arcadeops/run`) request from the jury's browser all the way to
Gemini and back, including every retry, deadline and gate. Times in
parentheses are wall-clock numbers from the post Lot 5 FULL
`2026-05-13` smoke run (`run_id 1f97ad20ab8f47949d77913e57817d0f`,
new VM `136.244.89.159`).

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Jury
    participant Front as Next.js UI<br/>(Vercel)
    participant Proxy as /api/runner-proxy<br/>(Node.js, Vercel)
    participant Runner as FastAPI runner<br/>(Vultr · fra)
    participant Orch as orchestrator.py
    participant Planner as Planner Agent
    participant Worker as Worker Agent
    participant Tools as Tool registry<br/>(10 mocked tools)
    participant Gemini as Gemini API<br/>(gemini-2.5-flash)

    User->>Front: Click "Run live with ArcadeOps backend"
    Front->>Proxy: POST { mission, scenario }
    Note over Proxy: AbortSignal.timeout(85_000)<br/>runnerHeaders() injects x-runner-secret
    Proxy->>Runner: POST /run-agent (x-runner-secret)
    Note over Runner: enforce_runner_secret middleware<br/>hmac.compare_digest · 401 if missing/wrong
    Runner->>Orch: run_agent_orchestration(mission, scenario)
    Orch->>Orch: deadline_ts = now + AGENT_WALL_CLOCK_S (60s)

    Orch->>Planner: run_planner(mission)
    Planner->>Gemini: GenerateContent (JSON mode)
    Gemini-->>Planner: { objective, steps[], target_tools[], constraints[] }
    Note over Planner: anti-injection in system prompt<br/>JSON-fence stripper · default plan fallback
    Planner-->>Orch: PlannerResult (planning step · ~Gemini JSON output)

    Orch->>Worker: run_worker(plan, mission, max_tool_calls=10)
    loop until conclusion / cap / deadline (≤ 20 turns)
        Worker->>Gemini: GenerateContent (tools=...)
        Gemini-->>Worker: function_call(name, args) | text
        alt unknown tool
            Worker->>Worker: log + emit "unknown_tool" step (no exception)
        else known tool
            Worker->>Tools: execute_tool(name, args)
            Tools-->>Worker: structured dict result
        end
        Worker->>Worker: append AgentStep (phase=tool_call, risk=LOW|MEDIUM|HIGH)
    end
    Worker-->>Orch: WorkerResult (steps, tokens, aborted?)

    Orch->>Orch: load policy_gates from fixture verdict (3 gates)
    Orch-->>Runner: AgentRunTrace (run_id, steps, verdict, cost_usd, tokens_used)
    Runner-->>Proxy: 200 application/json
    Proxy-->>Front: { proxy: { upstream_elapsed_ms }, ...trace }
    Front-->>User: render evidence timeline + verdict (BLOCKED · 23.44 s · $0.001424)
```

Key timeouts and caps written in code:

- **Vercel proxy** — `AbortSignal.timeout(85_000)` — see
  [`src/app/api/runner-proxy/route.ts`](../src/app/api/runner-proxy/route.ts).
- **Orchestrator wall-clock** — `AGENT_WALL_CLOCK_S = 60 s` — see
  [`runner/app/config.py`](../runner/app/config.py).
- **Worker turn cap** — 20 turns — see
  [`runner/app/agents/worker.py`](../runner/app/agents/worker.py).
- **Worker tool-call cap** — `MAX_TOOL_CALLS = 10` — see config.
- **Per-Gemini-call timeout** — 30 s with backoff `[1 s, 2 s]` retry on
  transient errors only — see
  [`runner/app/llm/gemini_client.py`](../runner/app/llm/gemini_client.py).

---

## 2. Component diagram — modules and contracts

```mermaid
flowchart TB
    subgraph Frontend["Frontend · Next.js 16 / Vercel"]
        Page[/app/page.tsx<br/>landing/]
        ControlPage[/app/control-tower/page.tsx/]
        ExperienceUI[ControlTowerExperience.tsx]
        Launcher[DemoMissionLauncher.tsx]
        Timeline[EventTimeline.tsx]
        ToolCard[ToolCallCard.tsx]
        Judge[GeminiJudgePanel.tsx]
        ProxyRoute[/api/runner-proxy/route.ts/]
        ArcadeRoute[/api/arcadeops/run/route.ts/]
        ReplayRoute[/api/replay/]
        JudgeRoute[/api/gemini/judge/]
        Capabilities[/api/capabilities/]
        Health[/api/health/]
        Norm[lib/control-tower/normalizers.ts]
        Types[lib/control-tower/types.ts]
        Gates[lib/control-tower/policy-gates.ts]
        VerdictCons[lib/control-tower/verdict-consistency.ts]
        Scenarios[lib/control-tower/scenarios.ts]
        Fixture[(data/demo-run.json)]
    end

    subgraph Runner["Runner · FastAPI / Vultr"]
        Main[app/main.py]
        Health2[app/routes/health.py]
        RunAgent[app/routes/run_agent.py]
        ToolsRoute[app/routes/tools.py]
        RunsRoute[app/routes/runs.py]
        Orchestrator[app/orchestrator.py]
        PlannerMod[app/agents/planner.py]
        WorkerMod[app/agents/worker.py]
        GeminiClient[app/llm/gemini_client.py]
        FuncCalling[app/llm/function_calling.py]
        Registry[app/tools/registry.py]
        Implementations[app/tools/implementations.py]
        TraceModel[app/models/trace.py]
        Fixtures[(app/fixtures/*.json)]
        Config[app/config.py]
    end

    subgraph External["External"]
        GoogleAI[Google Gemini API]
    end

    Page --> ControlPage --> ExperienceUI
    ExperienceUI --> Launcher --> ProxyRoute
    ExperienceUI --> Timeline --> ToolCard
    ExperienceUI --> Judge --> JudgeRoute
    ExperienceUI --> Capabilities
    Launcher -.fallback.-> Fixture
    ArcadeRoute --> Norm --> Types
    JudgeRoute --> Gates --> VerdictCons
    Scenarios --> ExperienceUI

    ProxyRoute -->|HTTP JSON| RunAgent
    ReplayRoute --> Fixture

    Main --> Health2
    Main --> RunAgent --> Orchestrator
    Main --> ToolsRoute --> Registry
    Main --> RunsRoute
    Orchestrator --> PlannerMod --> GeminiClient
    Orchestrator --> WorkerMod
    WorkerMod --> FuncCalling
    WorkerMod --> Registry --> Implementations
    Orchestrator --> Fixtures
    Orchestrator --> TraceModel
    GeminiClient --> Config
    GeminiClient --> GoogleAI
    PlannerMod --> GoogleAI
    WorkerMod --> GoogleAI
```

Key contracts:

- The **Control Tower event model** in
  [`src/lib/control-tower/types.ts`](../src/lib/control-tower/types.ts)
  defines `phase_change | step | tool_call | token | observability |
  result | done | error | heartbeat`.
- The **trace contract** in
  [`runner/app/models/trace.py`](../runner/app/models/trace.py) defines
  `AgentRunTrace { run_id, runner, region, model, mission,
  agents_involved, tools_available, steps[], verdict, started_at,
  completed_at, cost_usd, tokens_used, is_mocked }`.
- The **tool registry** is JSON-first
  ([`runner/app/fixtures/tool_registry.json`](../runner/app/fixtures/tool_registry.json))
  with one Python implementation per tool in
  [`runner/app/tools/implementations.py`](../runner/app/tools/implementations.py).

---

## 3. Deployment diagram — where each piece runs

```mermaid
flowchart LR
    subgraph DevLaptop["Developer laptop (Windows / PowerShell)"]
        Repo[Local repo · Damso74/arcadeops-control-tower-hackathon]
        VercelCLI[vercel CLI]
        VultrPS1[scripts/vultr-provision.ps1]
    end

    subgraph GitHub["GitHub"]
        Origin[origin · main / docs/pitch-pack-v1 / Lot* branches]
    end

    subgraph VercelProd["Vercel · Production deployment"]
        Edge[USA edge]
        FrontApp[Next.js app · /control-tower]
        ProxyFn[Node.js function · /api/runner-proxy]
        ArcadeFn[Node.js function · /api/arcadeops/run]
        VercelEnv[(Env vars · RUNNER_URL, ARCADEOPS_*<br/>NO Gemini key)]
    end

    subgraph VultrFra["Vultr · Frankfurt (fra) · vc2-1c-2gb · 136.244.89.159"]
        OS[Ubuntu LTS]
        Caddy[Caddy :80 -> 127.0.0.1:8000]
        Docker[Docker Engine]
        RunnerSvc[runner container · uvicorn :8000<br/>non-root appuser · HEALTHCHECK]
        EnvFile[(/opt/arcadeops/.env · 0600<br/>GEMINI_API_KEY)]
        UFW[UFW · 22/tcp · 80/tcp · 443/tcp]
    end

    subgraph GoogleCloud["Google AI Studio"]
        GeminiAPI[Gemini API · gemini-2.5-flash]
    end

    Repo --> Origin --> VercelProd
    Origin --> VultrPS1
    VercelCLI --> VercelProd
    VultrPS1 -->|cloud-init.yaml| VultrFra
    FrontApp --> ProxyFn --> VultrFra
    Edge --> FrontApp
    Edge --> ProxyFn
    Edge --> ArcadeFn
    RunnerSvc --> EnvFile
    RunnerSvc --> GeminiAPI
    Caddy --> RunnerSvc
    UFW --> Caddy
```

Real values in this deployment:

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| Vercel project         | `arcadeops-control-tower-hackathon`                    |
| Frontend URL           | https://arcadeops-control-tower-hackathon.vercel.app   |
| Primary demo path      | `/control-tower` (SSE via `/api/arcadeops/run`)        |
| `RUNNER_URL` (Vercel)  | `http://136.244.89.159`                                |
| Runner auth (Vercel)   | `RUNNER_SECRET` env var → `x-runner-secret` header     |
| Runner auth (Vultr)    | `RUNNER_REQUIRE_SECRET=1` middleware kill-switch       |
| Vultr region           | `fra` · Frankfurt                                      |
| Vultr plan             | `vc2-1c-2gb` · $5/month                                |
| Public IP              | `136.244.89.159` (re-provisioned via cloud-init, Lot 5 FULL B-deploy-1) |
| Open ports             | `22/tcp`, `80/tcp`, `443/tcp` (UFW)                    |
| Reverse proxy          | Caddy on `:80` -> `127.0.0.1:8000`                     |
| Container user         | `appuser` (non-root)                                   |
| Gemini model           | `gemini-2.5-flash`                                     |

Reachability cross-check (from `.smoke-checkhost-prod.json`,
`2026-05-13`):

- `de1.node.check-host.net` — 200 OK in 14 ms
- `nl1.node.check-host.net` — 200 OK in 24 ms
- `us1.node.check-host.net` — 200 OK in 275 ms
- `jp1.node.check-host.net` — 200 OK in 499 ms

---

## 4. Data flow — trace event lifecycle

The runner returns a single `AgentRunTrace` JSON object. The diagram
below shows how each field is constructed during a run.

```mermaid
flowchart LR
    Mission[mission · scenario] --> Planner
    Planner -->|Plan + tokens| OrchPS["orchestrator<br/>_planner_step()"]
    OrchPS --> Step0["AgentStep<br/>agent=PLANNER<br/>phase=planning"]

    Planner --> Worker
    Worker --> ToolLoop{tool_call?}
    ToolLoop -- yes --> ExecTool[execute_tool]
    ExecTool --> StepN["AgentStep<br/>agent=WORKER<br/>phase=tool_call<br/>tool_calls[1] · risk"]
    ToolLoop -- no / final --> Conclusion["AgentStep<br/>phase=conclusion<br/>tool_calls[]"]
    ToolLoop -- cap_hit --> CapStep["AgentStep<br/>phase=cap_exceeded"]
    ToolLoop -- aborted --> AbortStep["AgentStep<br/>phase=aborted"]

    Step0 --> Steps[steps[]]
    StepN --> Steps
    Conclusion --> Steps
    CapStep --> Steps
    AbortStep --> Steps

    Steps --> CostCalc["_compute_cost_usd<br/>input·$0.075/M + output·$0.30/M"]
    Steps --> TokenSum[tokens_used = sum]
    Verdict[fixture verdict<br/>3 policy_gates · 3 risk_findings] --> Trace
    Steps --> Trace
    CostCalc --> Trace
    TokenSum --> Trace
    Trace[(AgentRunTrace<br/>run_id · started_at · completed_at<br/>is_mocked · model=gemini-2.5-flash)]
```

Real numbers from the post Lot 5 FULL smoke (run id
`1f97ad20ab8f47949d77913e57817d0f`):

- 8 `steps`
  - 1 `PLANNER` planning step
  - 6 `WORKER` `tool_call` steps containing 7 tool calls in total:
    `kb.search`, `crm.lookup`, `policy.check`, `email.draft` (×2),
    `approval.request`, `audit.log`
  - 1 `WORKER` `conclusion` step
- `tokens_used`: 16 322
- `cost_usd`: 0.001424 (computed deterministically from
  `usage_metadata`)
- `is_mocked`: `false` (LIVE Gemini, no fallback)
- `model`: `gemini-2.5-flash`
- `runner`: `vultr` · `region`: `fra` (set via cloud-init)
- `verdict.verdict`: `BLOCKED`
- `verdict.policy_gates`:
  - `crm_writes_require_approval` (passed=false)
  - `external_email_requires_approval` (passed=false)
  - `prompt_injection_must_be_blocked` (passed=false)
- `verdict.risk_findings`: 1 `CRITICAL` (`prompt_injection`), 2 `HIGH`
  (`missing_approval`, `external_communication`)

---

## 5. Security model — secrets and trust boundaries

```mermaid
flowchart LR
    subgraph Public["Public network"]
        Browser[(User browser)]
    end

    subgraph Vercel["Vercel Production"]
        FrontJS["Frontend JS<br/>(no secrets)"]
        ProxyFn[/api/runner-proxy/]
        ArcadeFn[/api/arcadeops/run/]
        JudgeFn[/api/gemini/judge/]
        VercelEnv[(RUNNER_URL · ARCADEOPS_*<br/>GEMINI_API_KEY for /api/gemini/judge)]
    end

    subgraph VultrVM["Vultr VM (136.244.89.159)"]
        UFWGate{UFW · 22/80/443 only}
        CaddyHop[Caddy :80]
        SecretGate{enforce_runner_secret<br/>x-runner-secret · hmac.compare_digest}
        RunnerSvc[FastAPI runner :8000<br/>appuser · non-root]
        VMEnv[(/opt/arcadeops/.env · 0600<br/>GEMINI_API_KEY · RUNNER_SECRET<br/>RUNNER_REQUIRE_SECRET=1)]
    end

    subgraph Google
        GeminiAPI[Gemini API]
    end

    Browser --> FrontJS
    Browser --> ProxyFn
    ProxyFn -->|x-runner-secret| UFWGate --> CaddyHop --> SecretGate --> RunnerSvc
    ArcadeFn -->|x-runner-secret · SSE| SecretGate
    JudgeFn --> GoogleViaJudge[Gemini API · second-opinion judge]
    RunnerSvc --> VMEnv
    RunnerSvc --> GeminiAPI
    ProxyFn -. never reads .-> VMEnv
    FrontJS -. never reads .-> VercelEnv
    SecretGate -. 401 missing/invalid .-> Browser
```

Hard rules enforced by the codebase:

- **Mutual auth on the Vultr runner.** The FastAPI middleware
  `enforce_runner_secret` validates an `x-runner-secret` header with
  `hmac.compare_digest` (constant time, no shape leak). It is gated by
  the env kill-switch `RUNNER_REQUIRE_SECRET=1`; with the switch off,
  the runner runs in pass-through mode for local dev. Public paths
  (`/health`, `/docs`, `/openapi.json`, `/redoc`, optionally `/_diag`
  when `RUNNER_DIAG_ENABLED=1`) bypass the gate so cloud probes still
  work. Smoke triple from the production runner (Lot 5 FULL
  B-deploy-1): missing header → `401 missing_runner_secret`, wrong
  header → `401 invalid_runner_secret`, correct header → `200`.
- **Vercel injects the secret, never the caller.** Both
  `/api/runner-proxy` (plain JSON) and `/api/arcadeops/run` (SSE) go
  through `src/lib/runner/auth.ts::runnerHeaders()` which reads
  `process.env.RUNNER_SECRET` server-side. The browser never sees the
  secret; the secret never appears in DOM, in any `NEXT_PUBLIC_*` env
  var, or in a network response body.
- **`GEMINI_API_KEY` lives only on the Vultr VM** for the multi-agent
  runner. It is read by `runner/app/llm/gemini_client.py` and never
  serialized into a response. The Vercel `/api/runner-proxy` proxies
  raw JSON; it does not see, read, or relay the key.
- The Vercel `/api/gemini/judge` route uses an *independent* Gemini
  key (the existing frontend "reliability judge" path inherited from
  earlier Lots). Both keys are server-only — `next.config.ts` has no
  `NEXT_PUBLIC_*` exposure of either.
- **CORS allowlist** on the runner: `ALLOWED_ORIGINS` is a
  comma-separated list including the Vercel production URL. CORS is
  strict — no wildcard.
- **Defensive proxy**: `RUNNER_URL.trim()` (commit `d5430ce`) defends
  against CRLF injection if env vars are pasted with stray newlines.
- **Sanitized fixtures**: `src/data/demo-run.json` and
  `runner/app/fixtures/*_trace.json` contain no real PII, no real
  client name, no real ticket id.
- **No secrets in git**: `.gitignore` blocks `.env*`, `.vultr-state.json`
  is committed only with non-sensitive metadata, `runner/.env.example`
  ships an empty `GEMINI_API_KEY` and an empty `RUNNER_SECRET`.

Failure modes that never leak:

- Wrong key → `GeminiCallError("Gemini permanent error: ...")` — string
  is logged but not embedded in the JSON response field by the
  orchestrator (it falls back to a fixture and returns
  `is_mocked=true`).
- Upstream Vultr 5xx → Vercel proxy returns
  `{ error: "UPSTREAM_RUNNER_ERROR", upstream_status, upstream_body
  (truncated 2000 chars) }`.
- Upstream invalid JSON → Vercel proxy returns
  `{ error: "UPSTREAM_INVALID_JSON" }`.
- Network failure to Vultr → Vercel proxy returns
  `{ error: "UPSTREAM_FETCH_FAILED" }`.

---

## 6. Reliability model — fallback chain and cost caps

```mermaid
flowchart TD
    Start([POST mission]) --> CheckProxy{Vercel proxy reachable?}
    CheckProxy -- no --> ClientFixture[Frontend loads<br/>src/data/demo-run.json<br/>is_mocked=true badge]
    CheckProxy -- yes --> Forward[Forward to Vultr]
    Forward --> CheckVultr{Vultr runner up?}
    CheckVultr -- no --> Vercel502[Proxy returns 502<br/>UPSTREAM_FETCH_FAILED]
    Vercel502 --> ClientFixture
    CheckVultr -- yes --> Orchestrate[run_agent_orchestration]
    Orchestrate --> CheckGemini{GEMINI_API_KEY set?}
    CheckGemini -- no --> RunnerFixture[Runner returns vip_churn fixture<br/>is_mocked=true]
    CheckGemini -- yes --> RunPlanner[Run Planner]
    RunPlanner --> PlannerOK{Planner Gemini ok?}
    PlannerOK -- transient --> RetryP["call_gemini_with_retry<br/>1s · 2s · max 3 attempts"]
    RetryP --> PlannerOK
    PlannerOK -- permanent --> RunnerFixture
    PlannerOK -- success --> RunWorker[Run Worker]
    RunWorker --> WorkerLoop{Each turn}
    WorkerLoop -- deadline_ts hit --> CapStep[Append cap_exceeded step<br/>cap_hit=wallclock]
    WorkerLoop -- max_tool_calls hit --> CapStep2[cap_hit=tool_calls]
    WorkerLoop -- 20 turns --> CapStep3[cap_hit=max_turns]
    WorkerLoop -- transient err post-progress --> AbortedStep[aborted step · partial trace]
    WorkerLoop -- transient err pre-progress --> RunnerFixture
    WorkerLoop -- success --> Conclude[Conclusion step]
    CapStep --> Trace[Return AgentRunTrace]
    CapStep2 --> Trace
    CapStep3 --> Trace
    AbortedStep --> Trace
    Conclude --> Trace
    RunnerFixture --> Trace
    Trace --> ClientRender[Frontend renders trace]
```

Belt-and-suspenders fallback chain (top to bottom is the order of
preference):

1. **LIVE Gemini multi-agent run** — `is_mocked=false`, real cost,
   real tokens.
2. **Worker partial-live** — first tool call succeeded, then a
   transient Gemini error → trace ends with an `aborted` step but the
   real prefix is preserved.
3. **Runner fixture fallback** — Gemini key missing or permanent error
   → runner returns `runner/app/fixtures/vip_churn_trace.json` with
   `is_mocked=true`.
4. **Frontend deterministic fallback** — Vercel→Vultr round trip fails
   → frontend renders `src/data/demo-run.json`.

Cost caps (no run can spend more than its budget):

- `MAX_TOOL_CALLS = 10` (configurable via env).
- `AGENT_WALL_CLOCK_S = 60 s`.
- 20-turn ceiling on the Worker loop (defense against tool-call ping
  pong).
- Per-Gemini-call timeout = 30 s.
- Backoff retry only on **transient** errors (5xx, 429, network,
  timeout); permanent 4xx classes never retry.
- Token budget is *observed* via `usage_metadata`, not enforced today.
  Roadmap item: hard `MAX_INPUT_TOKENS` cap with early abort.

---

## Appendix — files referenced

- Frontend pipeline: [`src/app/api/runner-proxy/route.ts`](../src/app/api/runner-proxy/route.ts), [`src/app/api/arcadeops/run/route.ts`](../src/app/api/arcadeops/run/route.ts), [`src/components/control-tower/`](../src/components/control-tower/), [`src/lib/control-tower/`](../src/lib/control-tower/), [`src/data/demo-run.json`](../src/data/demo-run.json).
- Runner pipeline: [`runner/app/main.py`](../runner/app/main.py), [`runner/app/orchestrator.py`](../runner/app/orchestrator.py), [`runner/app/agents/planner.py`](../runner/app/agents/planner.py), [`runner/app/agents/worker.py`](../runner/app/agents/worker.py), [`runner/app/llm/gemini_client.py`](../runner/app/llm/gemini_client.py), [`runner/app/llm/function_calling.py`](../runner/app/llm/function_calling.py), [`runner/app/tools/registry.py`](../runner/app/tools/registry.py), [`runner/app/tools/implementations.py`](../runner/app/tools/implementations.py), [`runner/app/models/trace.py`](../runner/app/models/trace.py).
- Infra: [`runner/Dockerfile`](../runner/Dockerfile), [`runner/docker-compose.yml`](../runner/docker-compose.yml), [`scripts/vultr-provision.ps1`](../scripts/vultr-provision.ps1), [`scripts/vultr-provision.sh`](../scripts/vultr-provision.sh), [`scripts/vultr-cloud-init.yaml.template`](../scripts/vultr-cloud-init.yaml.template).
- Last smoke proof: [`.smoke-response-vercel.json`](../.smoke-response-vercel.json), [`.smoke-checkhost-prod.json`](../.smoke-checkhost-prod.json).
