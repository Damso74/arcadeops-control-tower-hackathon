# 90-second video script — ArcadeOps Control Tower

> Target: a single take, screen recording at 1920 × 1080, voice-over
> in English, no editing other than trims and a 1-second logo title
> card. Total length: **90 seconds**, hard cap 95 s.
>
> Tagline to land verbally: **"A Gemini-powered production gate for
> autonomous AI agents."**
>
> Punchline to close: **"Gemini reasons on the trace. ArcadeOps
> enforces the production gate."**

---

## Pre-flight (do before clicking record)

- [ ] Browser in **private / incognito** window.
- [ ] Vercel deployment open in a fresh tab — `https://arcadeops-control-tower-hackathon.vercel.app/`.
- [ ] `GEMINI_API_KEY` is configured on the deployment so the **Mode:
      Live Gemini audit** pill shows up.
- [ ] Cleared the URL bar to remove tracking params.
- [ ] Browser zoom at 100%, dev tools closed, only one tab visible.
- [ ] Notifications disabled (Do Not Disturb on macOS / Focus on Win).
- [ ] OBS / ScreenFlow / QuickTime configured at 1920 × 1080 and
      recording **system audio off, mic only**.

---

## Storyboard (timecoded)

### 0:00 – 0:05 — Title card / opening line (5 s)

- **Screen:** title card "ArcadeOps Control Tower — A Gemini-powered
  production gate for autonomous AI agents." Black background, emerald
  accent, no logo motion. Static for 3 s, fade out 2 s.
- **Voice-over:**
  > "ArcadeOps Control Tower — a Gemini-powered production gate for
  > autonomous AI agents."

### 0:05 – 0:15 — Landing page (10 s)

- **Screen:** the home page `/`. The hero, the three pillars, and the
  CTA "Launch Control Tower" are visible. Don't move the mouse for
  the first 3 seconds — let the eye catch the bullets.
- **Action:** at 0:11, click **Launch Control Tower**.
- **Voice-over:**
  > "Autonomous agents now use tools, delegate to sub-agents, and
  > write to real systems. Control Tower is the gate that decides
  > if a multi-agent run is safe to ship."

### 0:15 – 0:30 — Scenario picker (15 s)

- **Screen:** `/control-tower` loads. Hover the **Multi-agent customer
  escalation run** card. Show the **Recommended demo path** badge.
- **Action:** click the **Audit this run** CTA on the hero card.
- **Voice-over:**
  > "The default scenario is a multi-agent customer escalation. A CEO
  > agent delegates to a Support agent, which calls the knowledge
  > base, then delegates to a CRM agent and an Email agent."

### 0:30 – 0:45 — Evidence timeline (15 s)

- **Screen:** scroll slowly through `ScenarioEvidenceTimeline`.
  Stop on the cards that show `agent`, `tool`, `risk: high`,
  `durationMs`. Hover the "Production gate" evidence card.
- **Voice-over:**
  > "ArcadeOps captures every step — agent, tool, risk, latency,
  > cost. This is the structured trace the production gate audits."

### 0:45 – 1:05 — Live Gemini audit (20 s)

- **Screen:** the right-hand `GeminiJudgePanel`. The **Mode: Live
  Gemini audit** pill is visible in green.
- **Action:** at 0:46, click **Run production gate**.
- **Screen during loading:** the spinner and the streaming JSON
  appear. Hold for ~2-3 s. The verdict card unfolds: `Blocked`, score
  in red (e.g. 28), the `Policy gate: …` badges appear.
- **Voice-over:**
  > "Gemini reads the full trace server-side and produces a strict
  > JSON verdict. On top of that, ArcadeOps applies deterministic
  > policy gates and a verdict-consistency layer. The CRM write
  > without approval and the unreviewed customer email each trip a
  > production gate. The run is blocked."

### 1:05 – 1:20 — Re-score with guardrails (15 s)

- **Screen:** scroll to the `GuardrailSimulationPanel`. Tick:
  - "Require human approval for destructive tools"
  - "Require review before outbound email"
- **Action:** at 1:08, click **Re-run production gate**.
- **Screen:** the second verdict comes back. Score jumps (e.g.
  28 → 78), verdict moves to `needs_review` or `ready`. Show the
  delta clearly.
- **Voice-over:**
  > "Pick the recommended guardrails. Re-run the gate. The same trace,
  > re-scored as if those guardrails were already implemented. Score
  > delta: from 28 to 78. The gate now passes the run."

### 1:20 – 1:30 — Punchline + outro (10 s)

- **Screen:** scroll down to **Powered by ArcadeOps Runtime**. Pause
  on the architecture ribbon (Agents → Tools → Sub-agents → Trace →
  Gemini → Decision → Guardrails). Hold 3 s.
- **Voice-over:**
  > "Gemini reasons on the trace. ArcadeOps enforces the production
  > gate. ArcadeOps Control Tower — try it now."
- **Screen ends on:** the `/control-tower` URL visible in the address
  bar.

---

## Voice-over master script (clean, copy-paste)

> "ArcadeOps Control Tower — a Gemini-powered production gate for
> autonomous AI agents.
>
> Autonomous agents now use tools, delegate to sub-agents, and write
> to real systems. Control Tower is the gate that decides if a
> multi-agent run is safe to ship.
>
> The default scenario is a multi-agent customer escalation. A CEO
> agent delegates to a Support agent, which calls the knowledge
> base, then delegates to a CRM agent and an Email agent.
>
> ArcadeOps captures every step — agent, tool, risk, latency, cost.
> This is the structured trace the production gate audits.
>
> Gemini reads the full trace server-side and produces a strict JSON
> verdict. On top of that, ArcadeOps applies deterministic policy
> gates and a verdict-consistency layer. The CRM write without
> approval and the unreviewed customer email each trip a production
> gate. The run is blocked.
>
> Pick the recommended guardrails. Re-run the gate. The same trace,
> re-scored as if those guardrails were already implemented. Score
> delta: from 28 to 78. The gate now passes the run.
>
> Gemini reasons on the trace. ArcadeOps enforces the production
> gate. ArcadeOps Control Tower — try it now."

---

## Notes for the recording

- Speak slowly enough that subtitles auto-generated by YouTube are
  readable without correction. Target ~150 words/min.
- If the live Gemini call exceeds 8 seconds, **cut and re-record**. A
  hackathon judge expects the verdict to feel snappy. The cap is
  10 s of dead air on screen.
- Resist the urge to explain the policy gate code in the video — the
  README does that. The video must show the **outcome**, not the
  mechanism.
- Mention "Gemini" at least 3 times. Mention "production gate" at
  least 2 times. Mention "multi-agent" at least 2 times.
- Do NOT show: the GitHub repo (link goes in the description), the
  source code, the dev tools, the terminal, the API keys panel.
- Do show: the home `/`, the scenario picker, the evidence timeline,
  the Gemini panel verdict, the guardrails re-score, the runtime
  section.

---

## Description (paste under the video on YouTube / Loom)

```
ArcadeOps Control Tower — A Gemini-powered production gate for autonomous AI agents.

Live demo: https://arcadeops-control-tower-hackathon.vercel.app/
Source:    https://github.com/Damso74/arcadeops-control-tower-hackathon
Built for AI Agent Olympics · Lablab.ai · Milan AI Week 2026.

Control Tower audits multi-agent AI runs before production. Gemini reads
the full trace and produces a structured verdict. ArcadeOps then applies
deterministic policy gates and a verdict-consistency layer to guarantee
the final decision is coherent. A "blocked" verdict can never recommend
"ship".

Scenario shown in the video: a CEO agent delegates to a Support agent,
which calls the knowledge base, then delegates to a CRM agent (CRM
write without approval) and an Email agent (customer email without
review). Control Tower blocks the run before any real system is touched.
A second pass re-scores the same trace with the recommended guardrails
applied as a what-if simulation.

Tech stack: Next.js 16 · React 19 · TypeScript strict · Tailwind 4 ·
Google Gemini 2.5 Flash via REST · Vercel · Docker (Vultr-ready).
```
