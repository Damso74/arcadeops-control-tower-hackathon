# ArcadeOps Control Tower

> **A Gemini-powered production gate for autonomous AI agents.**
>
> ArcadeOps lets autonomous agents use tools, delegate to sub-agents, and
> execute business workflows. Control Tower audits every multi-agent run
> with Gemini before it can safely ship to production.

Built for **AI Agent Olympics** · Lablab.ai · Milan AI Week 2026.

| Link         | URL                                                                  |
| ------------ | -------------------------------------------------------------------- |
| Live demo    | https://arcadeops-control-tower-hackathon.vercel.app/control-tower   |
| Source       | this repository (MIT)                                                |
| Submission   | [`docs/SUBMISSION_LABLAB.md`](docs/SUBMISSION_LABLAB.md)             |
| Video script | [`docs/VIDEO_SCRIPT_90S.md`](docs/VIDEO_SCRIPT_90S.md)               |
| Recording QA | [`docs/RECORDING_CHECKLIST.md`](docs/RECORDING_CHECKLIST.md)         |

---

## 1. The 60-second pitch

Companies are starting to deploy autonomous AI agents — agents that
delegate work to sub-agents, call real tools, write to CRMs, send emails
to customers. **The hard problem is no longer building agents — it is
deciding when a multi-agent run is actually safe to ship.**

Today, every run is a black box. Plans, tool calls, sub-agent
delegations, costs, risks and outputs are scattered across logs and
dashboards. Teams ship on faith.

**ArcadeOps Control Tower** turns every autonomous agent run into an
auditable trace, then ships a **three-layer trust stack** on top:

1. **Gemini Reliability Agent** reads the full multi-agent trace and
   produces a structured judgment (verdict, score, typed risks,
   remediation plan).
2. **Deterministic policy gates** apply non-negotiable production rules
   on top of Gemini's reasoning (no destructive write without approval,
   no outbound email without review, no write without audit, no
   unbounded cost).
3. **Verdict consistency layer** guarantees that the final score,
   verdict and recommended action are mathematically coherent — a
   "blocked" verdict can never recommend "ship".

The headline: **Gemini reasons on the trace. ArcadeOps enforces the
production gate.**

## 2. What you'll see in 90 seconds

Open `/control-tower`. The default scenario is **Multi-agent customer
escalation run**:

```
CEO Agent
 └─ delegates to Support Agent
     ├─ Support Agent calls Knowledge Base
     ├─ Support Agent delegates to CRM Agent
     │   └─ CRM Agent attempts CRM update (write, no approval)
     └─ Support Agent delegates to Email Agent
         └─ Email Agent attempts to send customer email (no review)

→ Control Tower BLOCKS the run before any real system is touched.
```

The right-hand panel shows the Gemini Reliability Agent producing a
strict JSON verdict, the policy gates that fired, and a one-click
**Re-run with guardrails** simulation that re-scores the same trace as
if the recommended guardrails were already implemented.

You can also pick:

- **Production-ready research agent** — score ≥ 80, verdict `ready`,
  no policy gate triggered.
- **Needs-review support agent** — verdict `needs_review`, score in the
  middle band, missing observability evidence.
- **Paste your own trace** (≤ 12 000 chars) — server-side sanitization
  scrubs emails, URLs, secrets, UUIDs before the prompt is built.

## 3. The differentiator — a 3-layer trust stack

This is what separates Control Tower from a generic "ask the LLM if the
run looks fine" demo.

| # | Layer | What it does | Where in code |
|---|---|---|---|
| 1 | **Gemini Reliability Agent** | Reads the trace, produces a strict JSON verdict (score, verdict, risks, missing evidence, remediation, executive decision) | [`src/app/api/gemini/judge/route.ts`](src/app/api/gemini/judge/route.ts) |
| 2 | **Deterministic policy gates** | Pure-TS rules, no I/O, no LLM. Cap the verdict on hard production violations (destructive without approval, outbound without review, write without audit, cost unbounded) | [`src/lib/control-tower/policy-gates.ts`](src/lib/control-tower/policy-gates.ts) |
| 3 | **Verdict consistency** | Pure-TS post-processor. Guarantees `score`, `verdict` and `executiveDecision` are coherent. A "blocked" verdict can never recommend "ship". | [`src/lib/control-tower/verdict-consistency.ts`](src/lib/control-tower/verdict-consistency.ts) |

The pipeline is strictly ordered: **Gemini → policy gates → verdict
consistency → UI**. Gates and the consistency layer can only **tighten**
the verdict — they never relax it. The decision card surfaces a short
`Policy gate: …` badge whenever a rule fires, plus a disclosure listing
every triggered rule.

The judge panel header carries a live mode pill so judges always know
where they stand: **Mode: Live Gemini audit** when `GEMINI_API_KEY` is
configured server-side, **Mode: Deterministic replay** otherwise.

## 4. Demo flow (the 90-second script)

> See [`docs/VIDEO_SCRIPT_90S.md`](docs/VIDEO_SCRIPT_90S.md) for the
> timecoded version with B-roll cues.

1. **0–10 s** — open `/`. Read the tagline aloud: *"A Gemini-powered
   production gate for autonomous AI agents."* Click **Launch Control
   Tower**.
2. **10–25 s** — scenario picker: highlight the **Multi-agent customer
   escalation run** "Recommended demo path" badge. Mention the agent
   chain (CEO → Support → CRM + Email).
3. **25–40 s** — evidence timeline: point at the per-step `agent`,
   `tool`, `risk` and `durationMs` fields. *"This is the structured
   trace ArcadeOps captures for every run."*
4. **40–65 s** — click **Run production gate**. Show the live Gemini
   audit pill, the JSON verdict (`blocked`, score ≤ 45), the typed
   risks with evidence, and the `Policy gate: …` badges.
5. **65–80 s** — pick 2 recommended guardrails ("Require human approval
   for destructive tools", "Require review before outbound email"),
   click **Re-run production gate**. Show the score delta (e.g. 28 →
   78) and the verdict moving to `needs_review` or `ready`.
6. **80–90 s** — punchline: *"Gemini reasons on the trace. ArcadeOps
   enforces the production gate."* Cut to the **Powered by ArcadeOps
   Runtime** section to hint at the broader platform.

## 5. Live vs Replay

| Layer                          | Replay mode  | Live Gemini mode                |
| ------------------------------ | ------------ | ------------------------------- |
| Mission selection              | Real         | Real                            |
| SSE streaming protocol         | Real         | Real                            |
| Multi-agent timeline           | Sanitized recorded trace | Same trace, used as evidence |
| Phase / tool call timeline     | Real         | Real                            |
| Risk flags / evidence          | From trace   | From trace                      |
| **Production-readiness verdict** | —          | **Real Gemini reasoning, live** |
| **Policy gates**               | —            | **Live, deterministic**         |
| **Verdict consistency**        | —            | **Live, deterministic**         |

Replay works with **zero env vars** (perfect for video reproducibility).
The Gemini Reliability Agent activates with a single env var
(`GEMINI_API_KEY`) — no rebuild required, the panel detects it at
runtime via [`/api/capabilities`](src/app/api/capabilities/route.ts).

The replay fixture (`src/data/demo-run.json`) was generated from a
sanitized real ArcadeOps trace. It contains no orgId, no userId, no
client name, no internal URL, no secret.

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser — /control-tower                                            │
│  ├─ ControlTowerExperience (client)                                  │
│  │   ├─ TraceScenarioPicker  ─────► picks a multi-agent scenario     │
│  │   ├─ ScenarioEvidenceTimeline ► shows per-step agent/tool/risk    │
│  │   ├─ DemoMissionLauncher ──────► /api/replay        (SSE)         │
│  │   └─ GeminiJudgePanel ─────────► /api/gemini/judge  (POST)        │
│  │                                  /api/capabilities  (GET)         │
│  └─ ResultCard / DecisionCard / PolicyGateBadges …                   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┬────────────────────┐
        │                                 │                    │
   Replay mode                       Gemini Judge          Live ArcadeOps
        │                                 │                    │
GET /api/replay (SSE)            POST /api/gemini/judge   POST /api/arcadeops/run
        │                                 │                    │
src/data/demo-run.json           Google Gemini API        ArcadeOps backend
                                 (server-side only)       (off in public deployment)
                                 + policy-gates.ts
                                 + verdict-consistency.ts
```

All adapters emit the same Control Tower event model
([`src/lib/control-tower/types.ts`](src/lib/control-tower/types.ts)):
`phase_change`, `step`, `tool_call`, `token`, `observability`, `result`,
`done`, `error`, `heartbeat`.

The judge route enforces:

- 5 requests / 10 minutes / IP rate limit,
- 12 000-char hard cap on pasted traces,
- server-side redaction of emails, URLs, bearer tokens, common API key
  prefixes, UUIDs,
- 30-second hard upstream timeout, propagated client disconnect →
  cancel,
- no auto-run anywhere — every Gemini call is an explicit user click.

Failure modes are explicit and never leak the upstream key:

- missing key → 503 `GEMINI_NOT_CONFIGURED` (panel discreet in UI),
- rate-limited → 429 `RATE_LIMITED` (with `Retry-After` header),
- bad payload → 400 `INVALID_REQUEST`,
- upstream HTTP error → 502 `GEMINI_REQUEST_FAILED`,
- unparseable JSON → 502 `GEMINI_INVALID_RESPONSE`.

## 7. Run locally

Requires Node 20+ and npm.

```bash
npm install
npm run dev
# Open http://localhost:3000/
```

That's it for replay mode. The default scenario streams without any
key. The Gemini judge panel will show a discreet aside until you
configure a key.

## 8. Configure Gemini (live audit mode)

Create `.env.local` at the repo root (never committed):

```env
GEMINI_API_KEY=your-google-ai-studio-key
# Optional — defaults to gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
```

Get a key here: https://aistudio.google.com/app/apikey

Restart `npm run dev`. The **Run production gate** button is enabled
automatically — no rebuild needed (capabilities are detected at
runtime). The mode pill switches to **Mode: Live Gemini audit**.

For Vercel: add `GEMINI_API_KEY` in Project Settings → Environment
Variables for **Production + Preview + Development**, then redeploy
once.

## 9. Deploy

### Vercel (current public demo)

```bash
vercel link
vercel env add GEMINI_API_KEY
vercel --prod
```

The `/api/health` endpoint returns 200 once the function is warm.

### Vultr (Docker / VCR / VKE)

This repo ships a multi-stage Dockerfile and a `/api/health` endpoint
so the same image runs on Vultr in three flavors:

- single-VPS Docker run,
- Vultr Container Registry + plain Docker host,
- Vultr Kubernetes Engine deployment.

Replay works with **zero env vars**. The Gemini Reliability Agent
activates with a single env var. Full guide:
[`docs/VULTR_DEPLOYMENT.md`](docs/VULTR_DEPLOYMENT.md).

## 10. Security

- **No secrets in the repo.** `.gitignore` blocks `.env`, `.env.*` and
  any local override; only `.env.example` is tracked.
- **Server-side keys only.** `GEMINI_API_KEY` is read by
  `/api/gemini/judge` and never serialized into a response or sent to
  the browser. Same for the optional `ARCADEOPS_DEMO_TOKEN` used by the
  live proxy.
- **Sanitized public trace.** `src/data/demo-run.json` contains no
  orgId, userId, taskId, agentId, email, internal URL, client name or
  memory key.
- **Defensive judge route.** Unknown JSON fields in client requests are
  dropped, payloads are size-clamped, the upstream call has a hard 30 s
  timeout, and the `/api/gemini/judge` failure modes never leak the
  upstream key or URL fragments.
- **Hidden live backend.** The public deployment leaves the three
  `ARCADEOPS_*` env vars empty, which silently disables the Live
  ArcadeOps button. The adapter has been tested end-to-end locally but
  never points at the production ArcadeOps platform from a public host.

## 11. Limitations

- The Gemini judge is a **second opinion**, not ground truth. The
  policy gates and consistency layer are the actual production gate.
  Use the judge to surface risks and missing evidence — not as a
  sign-off mechanism.
- The replay fixtures are recorded sanitized runs. The full ArcadeOps
  platform supports live multi-agent orchestration, persistent tools,
  multi-provider routing and governance — none of that ships in the
  public demo.
- No automated test runner is wired in for V1 — verification is manual,
  scripted in [`docs/RECORDING_CHECKLIST.md`](docs/RECORDING_CHECKLIST.md).

## 12. Hackathon submission

- Lablab submission copy: [`docs/SUBMISSION_LABLAB.md`](docs/SUBMISSION_LABLAB.md)
- 90-second video script: [`docs/VIDEO_SCRIPT_90S.md`](docs/VIDEO_SCRIPT_90S.md)
- Pre-recording checklist: [`docs/RECORDING_CHECKLIST.md`](docs/RECORDING_CHECKLIST.md)
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
npx tsc --noEmit  # TypeScript strict
npm run build     # Production build (no key required)
```

All three are green on `main` and run on every push.

## License

MIT — see `LICENSE`. Use it, fork it, learn from it.
