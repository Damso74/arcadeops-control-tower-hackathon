# Build-in-public posts — AI Agent Olympics submission

> Five short, specific posts to drop on X / LinkedIn / Mastodon during
> the hackathon week. Tone: direct, technical, no hype, no fake claims.
> Each post links back to the GitHub repo + the live demo. Replace
> `<demo-url>` and `<repo-url>` before posting.

---

## Post 1 — Launch (T-5 days before submission deadline)

> Building for #AIAgentOlympics 🛬
>
> Most agent demos focus on planning. I'm building the missing layer:
> the **flight recorder** for autonomous agent runs.
>
> Replay every run — phases, tools, cost, risks, output — then ask
> Gemini whether it's production-ready.
>
> Repo: <repo-url>
> Demo (replay-only for now): <demo-url>
>
> #AIAgents #Gemini

Hashtags: `#AIAgentOlympics #lablab #AIAgents #Gemini #Observability`

---

## Post 2 — Replay GIF (deterministic trace)

> Two questions every team running AI agents in production has to answer:
>
> 1. What did the agent actually do?
> 2. Was that safe to ship?
>
> Step 1: a deterministic SSE replay of an agent run — phases, tool
> calls with durations, cost in USD, latency, risk flags, final report.
> Same trace every time. Reproducible audit.
>
> [GIF of `/control-tower` post-replay]
>
> Step 2 in the next post 👇

Hashtags: `#AIAgents #Observability #Reliability #Lablab`

---

## Post 3 — Gemini Reliability Judge

> Step 2: let **Gemini** read the recorded trace and return a
> production-readiness verdict.
>
> Strict JSON contract — score 0-100, verdict (ready / needs_review /
> blocked), typed risks with evidence, cost + tool-safety + observability
> assessments, missing evidence the agent never collected, a numbered
> remediation plan, an executive decision in one sentence.
>
> Not a chatbot wrapper. The decision engine.
>
> Powered by `@Google` Gemini 2.5 Flash · Live demo with key:
> <demo-url>

Hashtags: `#Gemini #GoogleAI #AIAgents #AIReliability #Lablab`

---

## Post 4 — Architecture / Vultr-ready

> Boring infrastructure on purpose.
>
> - Next.js 16 standalone bundle
> - Same multi-stage Dockerfile runs on Vercel today, Vultr tomorrow
> - `/api/replay` (SSE, no key) · `/api/gemini/judge` (Node, key only)
> - `/api/capabilities` (runtime probe) · `/api/health` (liveness)
>
> Replay works with zero env vars. Gemini activates with one key.
>
> Repo: <repo-url>
> Vultr deployment guide: <repo-url>/blob/main/docs/VULTR_DEPLOYMENT.md

Hashtags: `#Vultr #DevOps #NextJS #Docker #AIAgents`

---

## Post 5 — Final submission

> Submitted to AI Agent Olympics 🎯
>
> ArcadeOps Control Tower — the flight recorder and Gemini-powered
> reliability judge for autonomous AI agents.
>
> ✅ Public deterministic replay
> ✅ Live Gemini verdict (score, risks, remediation)
> ✅ Vultr-ready Docker deployment
>
> Demo: <demo-url>
> Repo: <repo-url>
> 3-min video: <video-url>
>
> Thanks to `@Lablabai` and the sponsor tracks for the push to ship.

Hashtags: `#AIAgentOlympics #Lablab #Gemini #Vultr #AIAgents #Reliability`

---

## What NOT to claim

- ❌ "Production-grade observability platform" — it's a hackathon demo.
- ❌ "Replaces tools like LangSmith / Helicone / Langfuse" — different
  scope and depth.
- ❌ "Live agent execution in the public demo" — the live ArcadeOps
  backend is **disabled publicly for safety**.
- ❌ "Measures agent quality" — we measure run **reliability**, not
  output quality.
- ❌ Promised features that don't exist yet (multi-tenant cloud,
  exporters to Datadog/Splunk, etc.).
