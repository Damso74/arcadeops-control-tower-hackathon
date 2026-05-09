# ArcadeOps Control Tower

> **Mission control for autonomous AI agents.**
> The cockpit to deploy, observe and audit autonomous AI agents in production.

Built for **AI Agent Olympics** · Lablab.ai · Milan AI Week 2026.

This repository is the **public hackathon demo** of ArcadeOps Control Tower.
It is intentionally focused, reproducible, MIT-licensed, and contains no
secrets or private platform code. The full ArcadeOps platform — live agent
execution, persistence, multi-provider routing, governance, billing — is
maintained separately.

---

## What this demo shows

A single page, `/control-tower`, that turns an autonomous agent run into a
live audit trail. From mission to verdict in **90 seconds**:

1. **Mission** — pick one of three pre-canned audit missions.
2. **Plan** — analyze → plan → execute → evaluate → summarize phases stream
   in with status pills.
3. **Execution** — every tool call appears as a card with status, duration
   and description. The full execution timeline streams via SSE.
4. **Observability** — provider, model, token usage, cost, latency, tool
   calls and risk flags.
5. **Result** — production-readiness report with concrete recommendations.

---

## Two modes

The demo ships with two adapters that share the same Control Tower event
model (`src/lib/control-tower/types.ts`):

### 1. Replay mode — _default, deterministic, no API key_

Path: `/api/replay`

A baked-in fixture (`src/data/demo-run.json`) is streamed back as Control
Tower SSE events. This mode is reliable for video recordings, jury demos,
and incognito tests — no LLM, no network, no quota.

### 2. Live ArcadeOps backend mode — _optional, real execution_

Path: `/api/arcadeops/run` (server-side proxy)

When configured, the proxy calls the ArcadeOps demo endpoint
`/api/v1/control-tower/demo/run` with a server-side bearer token, normalizes
the upstream events into the Control Tower model, and streams them to the
client. The token never reaches the browser.

If any of the three env vars below is missing, the UI shows
**"Live backend not configured in this deployment"** and silently disables
the Live button — the Replay button keeps working.

---

## Running locally

Requires Node 20+ and npm.

```bash
npm install
npm run dev
# Open http://localhost:3000/control-tower
```

That's it for replay mode. Click **▶ Replay demo mission** and the SSE
stream populates phases, tool calls, observability and the final report.

### Enabling Live ArcadeOps mode

Create `.env.local` (never committed) at the repo root:

```env
ARCADEOPS_API_BASE_URL=https://your-arcadeops-deployment.example.com
ARCADEOPS_DEMO_TOKEN=replace-with-the-server-side-demo-token
ARCADEOPS_DEMO_AGENT_ID=replace-with-the-demo-agent-id
```

Then restart `npm run dev`. The **⚡ Run live with ArcadeOps backend**
button activates and routes through the server-side proxy.

The token is read by `src/app/api/arcadeops/run/route.ts` on the server.
The browser only sees the proxy URL.

---

## What is real, what is replay

| Layer                        | Replay mode  | Live mode          |
| ---------------------------- | ------------ | ------------------ |
| Mission selection            | Real         | Real               |
| SSE streaming protocol       | Real         | Real               |
| Phase / tool call timeline   | Fixture      | Real (normalized)  |
| LLM execution                | Fixture      | Real ArcadeOps run |
| Token usage / cost           | Fixture      | Real (from run)    |
| Risk flags / report          | Fixture      | Real (from run)    |

The full ArcadeOps platform supports live agent execution, tools,
persistence, multi-provider LLM routing and observability. The hackathon
demo only exposes a focused, sandboxed subset of that platform.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser — /control-tower                                            │
│  └─ DemoMissionLauncher  (subscribeToControlTower → ControlTowerEvent)│
└────────────────────────┬─────────────────────────────────────────────┘
                         │
        ┌────────────────┴───────────────────┐
        │                                    │
   Replay mode                          Live mode
        │                                    │
GET /api/replay (SSE)             POST /api/arcadeops/run (SSE proxy)
        │                                    │
src/data/demo-run.json            ┌──────────┴──────────┐
                                  │ ArcadeOps backend   │
                                  │ POST /api/v1/       │
                                  │   control-tower/    │
                                  │   demo/run          │
                                  └─────────────────────┘
```

All adapters emit the same `ControlTowerEvent` shape:
`phase_change`, `step`, `tool_call`, `token`, `observability`, `result`,
`done`, `error`, `heartbeat`.

---

## Tech stack

- **Next.js 16** App Router (`src/app`)
- **React 19**
- **Tailwind CSS 4** (zero-config via `@tailwindcss/postcss`)
- **TypeScript** strict
- Native `fetch` + `ReadableStream` for SSE on both server and client

No database, no auth, no billing, no secrets.

---

## Repo layout

```
src/
├─ app/
│  ├─ page.tsx                      # Landing — links into /control-tower
│  ├─ control-tower/page.tsx        # Main demo page
│  └─ api/
│     ├─ replay/route.ts            # Replay SSE endpoint
│     └─ arcadeops/run/route.ts     # Live ArcadeOps backend proxy (SSE)
├─ components/control-tower/        # UI primitives
├─ lib/control-tower/
│  ├─ types.ts                      # Canonical event model
│  ├─ sse.ts                        # SSE parse + subscribe helper
│  └─ normalizers.ts                # ArcadeOps → Control Tower mapping
└─ data/demo-run.json               # Replay fixture
```

---

## Quality gates

```bash
npm run lint      # ESLint (eslint-config-next)
npm run build     # Production build
```

The repo has no test runner wired in for V0 — verification is manual:

- `/control-tower` loads with no console errors.
- Clicking **Replay demo mission** streams events and ends on a `done`.
- Without env vars, the **Run live** button is visibly disabled.
- `npm run build` produces no warnings.

---

## License

MIT — see `LICENSE`. Use it, fork it, learn from it.

---

## Links

- ArcadeOps platform overview: _coming soon_
- Hackathon submission: _to be filled in once Lablab submission is live_
- Demo video: _to be filled in_
