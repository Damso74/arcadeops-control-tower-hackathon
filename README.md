# ArcadeOps Control Tower

> **The production gate for autonomous AI agents.**
>
> _Can this AI agent run safely ship to production?_ Replay or paste an
> agent trace. Gemini audits the plan, tools, cost, risks and output,
> then returns a production-readiness verdict and recommends guardrails
> you can re-score against.

Built for **AI Agent Olympics** · Lablab.ai · Milan AI Week 2026.

| Link        | URL                                                                |
| ----------- | ------------------------------------------------------------------ |
| Live demo   | _<paste Vercel URL>_                                               |
| Source      | this repository (MIT)                                              |
| Video (MP4) | _<placeholder — see [`docs/VIDEO_SCRIPT.md`](docs/VIDEO_SCRIPT.md)>_ |
| Slides (PDF)| _<placeholder — see [`docs/DECK_OUTLINE.md`](docs/DECK_OUTLINE.md)>_|

---

## 1. Why

Companies are starting to deploy autonomous AI agents in production.
The hard problem is no longer building agents — it's deciding when a
run is actually safe to ship. Today, every run is a black box: plans,
tool calls, costs, risks and outputs are scattered across providers
and dashboards. Teams ship on faith.

**ArcadeOps Control Tower** turns every autonomous agent run into an
auditable trace, then asks **Google Gemini** to act as a reliability
judge over that trace.

## 2. What it does

Three layers, one screen:

1. **Replay layer** — a deterministic SSE stream replays a recorded
   agent trace: phases, tool calls with status and duration, observability
   metrics (tokens, cost USD, latency, provider/model), risk flags and
   the final report. **No API key required.** Identical traces on every
   run, by design — perfect for video and judging.
2. **Gemini Reliability Judge** — when `GEMINI_API_KEY` is configured,
   Gemini reads the trace and returns a strict JSON verdict: a readiness
   score (0–100), a verdict (ready / needs_review / blocked), typed
   risks with evidence, cost / tool-safety / observability assessments,
   missing evidence, a numbered remediation plan, an executive
   decision and a business-value paragraph.
3. **Deployment layer** — public demo on Vercel today; the same
   standalone Next.js bundle ships in a multi-stage Dockerfile that
   runs on Vultr VPS, Vultr Container Registry or Vultr Kubernetes.
   See [`docs/VULTR_DEPLOYMENT.md`](docs/VULTR_DEPLOYMENT.md).

## 3. Demo flow

> From an unsafe agent run to a guarded re-score in under two minutes.

1. Open `/control-tower`.
2. Pick a recorded run — the **Blocked CRM write agent** (critical
   risk) is the wow scenario, but a **needs-review support agent** and
   a **production-ready research agent** are also one click away.
3. Inspect the evidence — tool calls, missing approvals, missing
   audit trail, cost spikes — before any model call.
4. Click **Audit this run**. Gemini reads the trace server-side and
   returns a typed verdict: score, verdict, risks, missing evidence,
   remediation plan.
5. Pick the recommended guardrails and click **Re-score with
   guardrails**. A second pass returns a what-if simulation: same
   trace, same Gemini, but evaluated as if the guardrails were
   already implemented. The before / after comparison shows the
   readiness delta.

You can also **paste your own trace** (logs, JSON, framework outputs,
MCP tool logs) up to 12 000 characters — the server redacts emails,
URLs, secrets and IDs before reaching the model. Or take the **safe
sample replay** path for a quick deterministic walkthrough.

### Interactive judging modes

| Mode                       | What it does                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Replay sample run**      | Streams the bundled deterministic trace via SSE. Perfect for video — same events every time, no API key required.           |
| **Audit unsafe sample**    | One-click audit of the **Blocked CRM write agent** scenario. Gemini blocks the run and explains why.                        |
| **Paste your own trace**   | Drop any agent trace (≤ 12 000 chars). Server-side sanitization scrubs PII / secrets, then Gemini judges the cleaned text.  |
| **Simulate guardrails**    | Pick a checklist of production guardrails and re-score the same run as a what-if simulation. Returns a residual-risk view. |

## 4. Google Gemini Reliability Judge

This is the differentiator versus a generic "agent demo".

- Endpoint: [`src/app/api/gemini/judge/route.ts`](src/app/api/gemini/judge/route.ts)
  (Node.js runtime, `maxDuration: 60`, hard 30-second client timeout).
- Model: defaults to **`gemini-2.5-flash`** (fast, cheap, returns valid
  JSON consistently). Override with `GEMINI_MODEL`.
- Four input modes: `sample_replay` (bundled fixture), `scenario_trace`
  (pre-canned scenarios), `pasted_trace` (free-form user paste, sanitized
  server-side, ≤ 12 000 chars), and `remediation_simulation` (re-score
  the same run with guardrails applied as a what-if).
- Output: a strict JSON object validated by
  [`src/lib/control-tower/gemini-types.ts`](src/lib/control-tower/gemini-types.ts).
  Off-spec responses are normalized; unparseable responses surface a
  clean error to the UI.
- Defensive guards:
  - 5 requests / 10 minutes / IP rate limit
    ([`src/lib/server/rate-limit.ts`](src/lib/server/rate-limit.ts)),
  - 12 000-char hard cap on pasted traces,
  - server-side redaction of emails, URLs, bearer tokens, common API
    key prefixes and UUIDs before the prompt is built,
  - 30-second upstream timeout, propagated client disconnect → cancel,
  - no auto-run anywhere — every Gemini call is an explicit user click.
- Failure modes are explicit:
  - missing key → 503 `GEMINI_NOT_CONFIGURED` (panel hidden in UI),
  - rate-limited → 429 `RATE_LIMITED` (with `Retry-After` header),
  - bad payload → 400 `INVALID_REQUEST`,
  - upstream HTTP error → 502 `GEMINI_REQUEST_FAILED`,
  - unparseable JSON → 502 `GEMINI_INVALID_RESPONSE`.

The Gemini API key never reaches the browser. The
[`/api/capabilities`](src/app/api/capabilities/route.ts) endpoint
returns only booleans + the public model name so the UI can decide
**at runtime** whether to show the judge panel — no rebuild needed
when the key is added or rotated.

## 5. Replay vs live

| Layer                        | Replay mode  | Gemini Judge mode                    |
| ---------------------------- | ------------ | ------------------------------------ |
| Mission selection            | Real         | Real                                 |
| SSE streaming protocol       | Real         | Real                                 |
| Phase / tool call timeline   | Sanitized recorded trace | Same trace, used as evidence |
| LLM execution                | Replayed     | Real Gemini call (live verdict)      |
| Token usage / cost           | From trace   | From trace                           |
| Risk flags / recommendations | From trace   | From trace                           |
| Production-readiness verdict | —            | **Real Gemini reasoning, live**      |

The replay fixture (`src/data/demo-run.json`) can be regenerated from
a sanitized real ArcadeOps agent trace using the private export script
([`scripts/export-control-tower-trace.ts`](https://example.invalid)
in the private repo). The public fixture is safe, deterministic and
contains no secrets, no orgIds, no userIds, no client names.

> The full ArcadeOps platform supports live agent execution, persistent
> tools, multi-provider LLM routing and observability. The hackathon
> demo only exposes a focused, sandboxed subset and **disables the
> live backend adapter publicly for safety**.

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser — /control-tower                                            │
│  ├─ ControlTowerExperience (client)                                  │
│  │   ├─ DemoMissionLauncher (Replay) ─────► /api/replay     (SSE)    │
│  │   └─ GeminiJudgePanel ─────────────────► /api/gemini/judge (POST) │
│  │                          /api/capabilities (GET, runtime probe)   │
│  └─ ResultCard / ObservabilityPanel / ToolCallCard …                 │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┬────────────────────┐
        │                                 │                    │
   Replay mode                       Gemini Judge          Live ArcadeOps
        │                                 │                    │
GET /api/replay (SSE)            POST /api/gemini/judge   POST /api/arcadeops/run
        │                                 │                    │
src/data/demo-run.json           Google Gemini API        ArcadeOps backend
                                 (server-side only)       (server proxy, off in
                                                           public deployment)
```

All adapters emit the same Control Tower event model
(`src/lib/control-tower/types.ts`): `phase_change`, `step`, `tool_call`,
`token`, `observability`, `result`, `done`, `error`, `heartbeat`.

## 7. Vultr-ready deployment

This repo ships a multi-stage Dockerfile and a `/api/health` endpoint so
the same image runs on Vultr in three flavors:

- single-VPS Docker run,
- Vultr Container Registry + plain Docker host,
- Vultr Kubernetes Engine deployment.

Replay works with **zero env vars**. The Gemini Reliability Judge
activates with a single env var. Full guide:
[`docs/VULTR_DEPLOYMENT.md`](docs/VULTR_DEPLOYMENT.md).

## 8. Run locally

Requires Node 20+ and npm.

```bash
npm install
npm run dev
# Open http://localhost:3000/control-tower
```

That's it for replay mode. Click **▶ Replay an agent run** and the SSE
stream populates phases, tool calls, observability and the final report.

## 9. Configure Gemini

Create `.env.local` (never committed) at the repo root:

```env
GEMINI_API_KEY=your-google-ai-studio-key
# Optional — defaults to gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
```

Get a key here: https://aistudio.google.com/app/apikey

Restart `npm run dev`. The **Run Gemini reliability judge** button is
enabled automatically — no rebuild needed (capabilities are detected at
runtime).

For Vercel: add `GEMINI_API_KEY` in Project Settings → Environment
Variables for **Production + Preview + Development**, then redeploy
once. The capabilities endpoint will pick up the change on the next
function invocation.

## 10. Security

- **No secrets in the repo.** The `.gitignore` blocks `.env`, `.env.*`
  and any local override; only `.env.example` is tracked.
- **Server-side keys only.** `GEMINI_API_KEY` is read by
  `/api/gemini/judge` and never serialized into a response or sent to
  the browser. Same for the optional `ARCADEOPS_DEMO_TOKEN` used by the
  live proxy.
- **Sanitized public trace.** `src/data/demo-run.json` contains no
  orgId, userId, taskId, agentId, email, internal URL, client name or
  memory key. The export script in the private ArcadeOps repo enforces
  these guarantees.
- **Defensive judge route.** Unknown JSON fields in client requests are
  dropped, payloads are size-clamped, the upstream call has a hard 30 s
  timeout, and the `/api/gemini/judge` failure modes never leak the
  upstream key or URL fragments.
- **Hidden live backend.** The public deployment leaves the three
  `ARCADEOPS_*` env vars empty, which silently disables the Live
  ArcadeOps button. The adapter has been tested end-to-end locally but
  never points at the production ArcadeOps platform from a public host.

## 11. Limitations

- The Gemini judge is a **second opinion**, not ground truth. Use it
  to surface risks and missing evidence — not as a sign-off mechanism.
- The replay fixture is a single recorded run. The full ArcadeOps
  platform supports live multi-agent orchestration, persistent tools,
  multi-provider routing and governance — none of that ships in the
  public demo.
- No test runner is wired in (V1) — verification is manual:
  - `/control-tower` loads with no console errors.
  - Replay completes on a `done` event.
  - Without `GEMINI_API_KEY` the judge panel is hidden / discreet.
  - With `GEMINI_API_KEY` a verdict returns in < 15 s.

## 12. Hackathon submission

- Submission copy: [`docs/SUBMISSION_COPY.md`](docs/SUBMISSION_COPY.md)
- Video script (3 min): [`docs/VIDEO_SCRIPT.md`](docs/VIDEO_SCRIPT.md)
- Deck outline (8 slides): [`docs/DECK_OUTLINE.md`](docs/DECK_OUTLINE.md)
- Build-in-public posts: [`docs/BUILD_IN_PUBLIC.md`](docs/BUILD_IN_PUBLIC.md)
- Vultr deployment: [`docs/VULTR_DEPLOYMENT.md`](docs/VULTR_DEPLOYMENT.md)
- Original V0 spec: [`docs/DEMO_SPEC.md`](docs/DEMO_SPEC.md)

---

## Tech stack

- **Next.js 16** App Router (`src/app`)
- **React 19**
- **Tailwind CSS 4** (zero-config via `@tailwindcss/postcss`)
- **TypeScript** strict
- Native `fetch` + `ReadableStream` for SSE on both server and client
- **Google Gemini** via REST (`generativelanguage.googleapis.com/v1beta`,
  no SDK dependency)
- **Docker** multi-stage build → Next.js standalone bundle

No database, no auth, no billing. The only state is the SSE stream.

## Quality gates

```bash
npm run lint      # ESLint (eslint-config-next)
npm run build     # Production build (no key required)
```

## License

MIT — see `LICENSE`. Use it, fork it, learn from it.
