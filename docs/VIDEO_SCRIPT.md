# Video script — ArcadeOps Control Tower (3 minutes target)

> Format: MP4, 1080p minimum, dark UI, calm voiceover, no devtools, no
> login friction. Goal: convince a hackathon judge that this is a
> **real product idea built around Gemini**, not just an animation.

---

## 0:00 – 0:20 — Hook (problem-first, 1 sentence)

**Voiceover:**

> "Companies are starting to put autonomous AI agents in production.
> The hard problem is no longer building them. It's deciding when a run
> is actually safe to ship."

**Screen:**
- Static landing card with the project title and one-liner:
  _"ArcadeOps Control Tower — the flight recorder and Gemini-powered
  reliability judge for autonomous AI agents."_

---

## 0:20 – 0:45 — Problem (why this matters)

**Voiceover:**

> "Today, every agent run is a black box. Plans, tool calls, costs,
> risks, output — none of it is reviewable in one place. Teams are
> shipping on faith."

**Screen:**
- Cut to the `/control-tower` page **before** clicking replay — empty
  Plan / Execution / Observability / Result panels.
- A short on-screen caption: _"Before: opaque logs scattered across
  providers."_

---

## 0:45 – 1:20 — Replay an agent run (the flight recorder)

**Voiceover:**

> "ArcadeOps Control Tower replays a recorded agent run as a stream of
> typed events. Phases, tool calls, durations, cost, model and provider
> — all of it appears in the same place, in the same order, every time.
> That's what makes it deterministic enough to judge."

**Screen:**
- Click **▶ Replay an agent run**.
- Phases pop in (analyze → plan → execute → evaluate → summarize).
- Tool call cards stream into the right column with statuses and ms.
- Caption: _"Deterministic replay — same trace every time."_

---

## 1:20 – 2:05 — Observability + result (the audit trail)

**Voiceover:**

> "Once the run finishes, you get the audit trail. Provider, model,
> token counts, latency, total cost in dollars, every tool call,
> every risk flag the agent itself raised, and the final report
> with concrete recommendations."

**Screen:**
- Slow pan over the Observability grid: provider, model, tokens,
  cost USD, latency, tool count.
- Pan over the Risk flags chips and the Result panel with its
  recommendations bullets.
- Caption: _"One screen, one trace, one audit."_

---

## 2:05 – 2:40 — Gemini Reliability Judge (the live differentiator)

**Voiceover:**

> "Now the part that turns this into a real reviewer: Google Gemini
> reads the replayed trace and returns a production-readiness verdict
> as strict JSON. A score from zero to one hundred. A verdict —
> ready, needs review, or blocked. A typed list of risks with
> evidence. Cost and tool-safety assessments. Missing evidence the
> agent never collected. A numbered remediation plan. And an
> executive decision in a single sentence."

**Screen:**
- Click **Run Gemini reliability judge**.
- A loader appears for ~5 s.
- The verdict block fills in: score dial, verdict pill, summary,
  risks grid, three assessment columns, remediation plan.
- Caption: _"Powered by Gemini — replaces a manual reviewer pass."_

---

## 2:40 – 3:00 — Closing (vision + call to action)

**Voiceover:**

> "Replay for deterministic judging. Gemini for live reliability
> reasoning. The same image runs on Vercel today and on Vultr
> tomorrow. The full ArcadeOps backend adapter is tested end-to-end
> but disabled publicly for safety. ArcadeOps Control Tower is the
> flight recorder autonomous AI agents have been missing."

**Screen:**
- Final card: project title, GitHub URL, demo URL, sponsor logos
  (Lablab.ai, Google, Vultr) discreet at the bottom.

---

## Production notes

- **No console open**, no DevTools, no flash of "Live backend not
  configured" — record on a build that has no `ARCADEOPS_*` env vars,
  so the Live button is hidden cleanly.
- **Two recordings recommended:** one with `GEMINI_API_KEY` set
  (full demo), one without (replay-only safety net for the cut).
- Cursor visible but no random idle motion.
- A short cross-fade between sections is fine; no fancy transitions.
- Background music: low-volume ambient if any; never overpower the VO.
