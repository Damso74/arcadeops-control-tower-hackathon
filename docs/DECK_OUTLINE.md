# Deck outline — 8 slides (PDF)

> Target: AI Agent Olympics jury · 8 slides max · dark theme matching
> the demo · readable in 60 seconds.

---

## Slide 1 — Title

- **ArcadeOps Control Tower**
- One-liner: _The flight recorder and Gemini-powered reliability judge
  for autonomous AI agents._
- Footer: AI Agent Olympics · Lablab.ai · Milan AI Week 2026
- Visual: hero screenshot of `/control-tower` post-replay (Observability
  + Result + Gemini verdict visible).

## Slide 2 — Problem

- Headline: _"Autonomous agents are now in production. We have no flight
  recorder."_
- Three bullets:
  - Black-box runs across providers.
  - No standard for tool-call observability.
  - "Is this run safe to ship?" answered on faith.
- Visual: schematic of an agent run as a closed box with `?` inside.

## Slide 3 — Why now

- Headline: _"Agent frameworks ship faster than the trust they need."_
- Three bullets:
  - Multi-step agents, multi-tool, multi-provider — every week.
  - Compliance + cost teams want a single audit surface.
  - LLMs are now strong enough to **judge other LLM runs**.
- Visual: timeline (2023 → 2026): single LLM call → tool use →
  multi-agent → **judged**.

## Slide 4 — Solution (3 layers)

- Headline: _"Three layers, one screen."_
- Layered diagram:
  1. **Replay** — deterministic SSE trace (no key required).
  2. **Gemini Reliability Judge** — production-readiness verdict.
  3. **Deployment** — Vercel today · Vultr-ready Dockerfile.
- Visual: stacked panels matching the actual UI sections.

## Slide 5 — Demo flow

- Headline: _"From mission to verdict in under two minutes."_
- 5-step flow with arrows:
  1. Replay an agent run
  2. Inspect timeline + tool calls
  3. Read observability metrics
  4. Run Gemini judge
  5. Get verdict + remediation plan
- Visual: tiny screenshots in sequence.

## Slide 6 — Gemini Reliability Judge (what makes us competitive)

- Headline: _"Gemini is the decision engine, not a chatbot."_
- Show the **strict JSON contract**:
  - `readinessScore` (0–100)
  - `verdict` (ready / needs_review / blocked)
  - typed `risks` (severity × category × evidence)
  - cost / tool-safety / observability assessments
  - `missingEvidence`, `remediationPlan`, `executiveDecision`,
    `businessValue`
- Visual: side-by-side — JSON contract on the left, rendered verdict
  card on the right.

## Slide 7 — Architecture & deployment

- Headline: _"Boring infrastructure, on purpose."_
- Diagram:
  ```
  Browser → /control-tower
     ├── /api/replay         (SSE — no key)
     ├── /api/gemini/judge   (Node — Gemini key only)
     ├── /api/capabilities   (runtime probe)
     └── /api/health         (liveness)
  ```
- Bullets:
  - Next.js 16 standalone bundle.
  - Same Dockerfile runs on Vercel, Vultr VPS, Vultr Kubernetes.
  - Replay works without any env var; Gemini activates with one key.
  - Live ArcadeOps backend adapter tested locally — disabled publicly
    for safety.

## Slide 8 — Business value + closing

- Headline: _"Make autonomous agents trustworthy enough to scale."_
- Three value props:
  - **Audit cost** drops: a single screen replaces scattered logs.
  - **Risk-adjusted velocity**: ship sooner, with evidence.
  - **Compliance-friendly**: every run has a JSON verdict + trail.
- Closing line: _"ArcadeOps Control Tower — replay, judge, ship."_
- URLs: GitHub · Demo · Lablab project page.

---

## Production notes

- 16:9, 1920×1080, exported to PDF.
- Dark background (`#0a0a0a` matches the UI).
- Use the same font as the UI (system / Geist) for consistency.
- Avoid stock photos — use real screenshots from the running demo.
- Slide 6 must be readable on a low-DPI projector — keep JSON snippet
  to ~10 lines.
