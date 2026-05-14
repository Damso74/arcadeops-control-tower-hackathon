# Deck outline — 6 slides (PDF)

> Target: AI Agent Olympics jury · **6 slides** · dark theme matching
> the demo · readable in 60 seconds · 16:9, 1920×1080, exported to PDF.
>
> _<sub>Lot 4b — restructured from the legacy 8-slide outline (Title /
> Problem / Why now / Solution / Demo flow / Judge / Architecture /
> Impact) to the master plan §4b 6-slide structure (Problem /
> Solution / Demo flow / Architecture / Why it matters / Impact).
> The cover (`public/cover.png`) carries the title + V2 punchline so
> we don't burn a slide on naming the project.</sub>_

---

## Title page (intro card, before slide 1)

- Use `public/cover.png` (1920×1080, dark zinc-950, V2 punchline +
  sponsor brand chips). No bullet text — one beat of silence in the
  recording, then jump straight to slide 1 / Problem.

---

## Slide 1 — Problem

- **Headline:** _"Autonomous AI agents are now in production. We have
  no flight recorder."_
- **Three bullets (the gap):**
  - Black-box runs across providers — every framework logs differently.
  - No standard for tool-call observability — destructive writes hide.
  - "Is this run safe to ship?" answered on faith, not on evidence.
- **Stake:** _"One unsafe agent run = one customer email, one CRM
  delete, one outbound payment we'll regret."_
- **Visual:** schematic of an agent run as a closed black box, `?`
  inside, tool-call icons leaking out the bottom. Use the actual
  cockpit color palette.

---

## Slide 2 — Solution

- **Headline:** _"A production gate the jury can click."_
- **3-layer diagram** (matches the actual UI sections):
  1. **Replay or paste** — deterministic SSE trace, no key required,
     plus a paste box for any framework's trace.
  2. **Gemini judges** — `/api/gemini/judge` returns a strict JSON
     verdict (score, blocked/needs_review/ready, typed risks,
     remediation plan).
  3. **ArcadeOps gates** — 5 deterministic policy rules cap the
     verdict server-side (no `ready` if a destructive tool fired
     without approval, etc.).
- **Sub-headline (V2 punchline):** **_"Gemini judges. Vultr runs.
  ArcadeOps blocks unsafe autonomous agents before production."_**
- **Visual:** stacked panels matching the cockpit: trace input →
  Gemini ticker → DecisionCard with verdict + ExpectedVsActualBadge
  + 5-policies card.

---

## Slide 3 — Demo flow

- **Headline:** _"From an unsafe agent run to a guarded re-score in
  under two minutes."_
- **3-step sticky stepper** (matches `<CockpitStepper>` in the live
  cockpit): _Pick → Inspect → Decide_.
- **4-step demo path** (matches `RecommendedDemoBanner`):
  1. **Pick the unsafe run** — Blocked CRM write agent (critical risk).
  2. **Watch Gemini block it** — animated ticker (3-4 s) → BLOCKED
     verdict + 4 typed risks + ExpectedVsActualBadge says `Match: yes`.
  3. **Pick the safe run** — Production-ready research agent.
  4. **Watch it ship with monitoring** — READY verdict, scoreboard
     bumps `Shipped`, `Avg cost` updates.
- **Bottom strip:** `<CockpitScoreboard>` after the 4-step demo —
  `Runs audited: 4 · Blocked: 2 · Needs review: 1 · Shipped: 1 ·
  Avg cost: $0.0019 · High-risk calls blocked: 2`.
- **Visual:** small screenshots in sequence — picker → Gemini ticker
  → BLOCKED verdict (with badges) → before/after readiness card.

---

## Slide 4 — Architecture

- **Headline:** _"Boring infrastructure, on purpose."_
- **Diagram:**
  ```
  Browser → /control-tower (Next.js 16, edge SSR)
     ├── /api/replay         (SSE — deterministic, no key)
     ├── /api/gemini/judge   (Node — Gemini key only, JSON contract)
     ├── /api/capabilities   (runtime probe → UI gates)
     ├── /api/health         (liveness + Vultr region report)
     └── /api/arcadeops/run  (proxy → Vultr FastAPI runner, masked
                              in public prod via NEXT_PUBLIC_LIVE_VULTR)
  ```
- **Bullets:**
  - **Vultr Frankfurt VPS** runs the FastAPI agent runner (Docker,
    `x-runner-secret` shared-secret gate).
  - **Vercel** serves the Next.js cockpit + the Gemini judge route.
  - Same Dockerfile runs on Vultr VPS, Vultr Kubernetes, or Vercel.
  - Replay works without any env var. Gemini activates with one key.
- **Visual:** small `<InfrastructureProofCard>` mock showing
  `Backend: Vultr · Region: Frankfurt · Status: Online · Last audit
  latency: 2 187 ms`.

---

## Slide 5 — Why it matters

- **Headline:** _"Logs tell you what happened. ArcadeOps decides
  whether what happened is safe enough to ship."_
- **Three angles:**
  - **For builders** — drop a trace in, get a typed verdict, ship the
    fix _before_ paying the LLM cost again. Re-score with guardrails
    without re-running the agent.
  - **For platform / SRE** — every audit produces a JSON contract you
    can store, diff and replay. Every policy gate is server-enforced
    and visible to the user.
  - **For compliance** — `readinessScore`, `verdict`, `risks`,
    `missingEvidence`, `remediationPlan`, `executiveDecision`,
    `policyGate.rules` are all in the same JSON object. Export as
    file via `<ExportVerdictJsonButton>` → archive forever.
- **Visual:** screenshot of the 5-policies card next to a `BLOCKED`
  DecisionCard with `ExpectedVsActualBadge {Match: yes}` and the
  exported `arcadeops-verdict-blocked-1747269600000.json` filename.

---

## Slide 6 — Impact (closing)

- **Headline:** _"Catch unsafe AI agent runs before they ship."_
- **Three value props:**
  - **Block before deploy** — a model judges the run, ArcadeOps
    enforces the gate. Not a vibe check.
  - **Guardrails as code** — simulate the fix in 5 seconds. Never pay
    twice for the same agent run.
  - **Compliance-friendly** — every run has a JSON verdict + audit
    trail. Replay any decision.
- **Closing line (V2 punchline, must mirror the cockpit hero, the
  README, the cover, and the last sentence in the 90-second video):**
  **_"Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous
  agents before production."_**
- **Sub-closing:** _"Replay, paste, judge, guard, ship."_
- **URLs:** `arcadeops-control-tower-hackathon.vercel.app` ·
  `github.com/Damso74/arcadeops-control-tower-hackathon` ·
  `lablab.ai/event/ai-agent-olympics`.
- **Sponsor logos** in the footer strip: **Google Gemini · Vultr ·
  Vercel**.

---

## Production notes

- 16:9, 1920×1080, exported to PDF (target file: `docs/deck.pdf`,
  rebuilt from this outline via Slidev / Keynote / Figma — out of
  scope of this lot, the markdown stays the source of truth).
- Dark background (`#0a0a0a`) — same hex as the cockpit
  (`bg-zinc-950`).
- Use the same font as the UI (system / Geist) for consistency.
- Avoid stock photos — use real screenshots from the running demo
  captured via the smoke MCP (Lot 4c).
- Every slide must carry the cockpit's emerald accent on at least
  one keyword to keep the pitch chromatic identity coherent across
  cover, deck, video and live demo.
- Keep slide 4 (Architecture) JSON snippet to ~10 lines — a
  low-DPI projector should still resolve every char.
