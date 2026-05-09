# ArcadeOps Control Tower — Hackathon Demo Spec

## 1. Goal

Build a public, reproducible hackathon demo for **AI Agent Olympics** showing **ArcadeOps Control Tower** as a cockpit to deploy, observe and audit autonomous AI agents.

The goal is not to open-source the full ArcadeOps platform.

The goal is to ship a focused, understandable, video-ready demo that proves the core idea:

> Autonomous AI agents need a control tower.

---

## 2. One-liner

**ArcadeOps Control Tower is mission control for autonomous AI agents: from mission to execution trace, cost, risks, tool calls and final report.**

Short version:

> The cockpit to deploy, observe and audit autonomous AI agents in production.

---

## 3. Official hackathon context

### Event

- Hackathon: **AI Agent Olympics**
- Organizer: **Lablab.ai**
- Context: Official hackathon at **Milan AI Week 2026**
- Dates: **May 13–20, 2026**
- Online build phase: **May 13–19, 2026**
- On-site build day for selected participants: **May 19, 2026**
- Demo showcase and awards: **May 20, 2026**
- Venue for on-site finale: **Fiera Milano, Rho, Milan, Italy**
- Participation: solo or team

### Main tracks relevant to ArcadeOps

Primary tracks to target:

1. **Agentic Workflows**
2. **Enterprise Utility**
3. **Collaborative Systems**

Secondary tracks:

4. **Intelligent Reasoning**
5. **Multimodal Intelligence**

ArcadeOps should not be positioned as “just another agent”.  
It should be positioned as the control layer above autonomous agents.

---

## 4. Official submission requirements

The submission must include:

- Project title
- Short description
- Long description
- Technology and category tags
- Cover image
- Video presentation
- Slide presentation
- Public GitHub repository
- Demo application platform
- Application URL

Additional Lablab rulebook expectations:

- Public GitHub repository is mandatory.
- Video presentation in MP4 format is mandatory.
- Slide presentation in PDF format is mandatory.
- Demo application URL is expected.
- The project must be original.
- The submission must be MIT-compliant or use a permissive open-source approach.

---

## 5. Judging criteria

The official judging criteria are:

1. **Application of Technology**
2. **Presentation**
3. **Business Value**
4. **Originality**

### Target scoring strategy

| Criterion | Target score | Strategy |
|---|---:|---|
| Application of Technology | 21/25 | Show replay + optional live Gemini mode, SSE, agent phases, tool calls, observability model |
| Presentation | 23/25 | Single `/control-tower` page, clean video, clear deck, no product sprawl |
| Business Value | 22/25 | Enterprise control, auditability, reliability, cost visibility, risk management |
| Originality | 21/25 | Position as cockpit/control plane, not as a chatbot or basic research agent |
| **Target total** | **87/100** | Strong podium-level submission if executed cleanly |

Minimum acceptable target before submission: **80/100**.

---

## 6. Prize strategy

Total announced prize pool: **$28,000+**.

### Primary target: Google — Best use of Gemini

Prizes:

- 1st place: **$5,000**
- 2nd place: **$3,000**
- 3rd place: **$2,000**

Why this is the best target:

- Strong fit with AI agent reasoning.
- Easier to integrate than infra-heavy sponsor requirements.
- A small live Gemini mode can support the claim.
- Complements the replay demo without making the whole demo fragile.

Required strategy:

- Add a minimal **Live Gemini Analysis** mode if possible.
- Use Gemini to generate:
  - agent execution plan,
  - risk analysis,
  - final production-readiness summary.
- Keep replay mode as default for stable judging/video.

### Secondary target: Vultr — Best use of Vultr

Prizes:

- 1st place: **$5,000 cash + $1,000 API credits**
- 2nd place: **$3,000 cash + $1,000 API credits**
- 3rd place: **$1,000 cash + $1,000 API credits**

Why it is interesting:

- Good fit with production/enterprise positioning.
- Cash prize is strong.
- ArcadeOps can be framed as production infrastructure for agents.

Risk:

- Requires real deployment/infrastructure work.
- May distract from the core demo if done too early.

Strategy:

- Deploy to Vercel first.
- Only pursue Vultr after the Vercel demo is stable.
- If time allows, deploy the same Next.js app or a small backend to Vultr.
- Do not start with Vultr.

### Low-priority target: Featherless

Useful only if the project leans into open-source/local models.

Current fit: medium.

Strategy:

- Mention permissive license and reproducibility.
- Do not optimize primarily for this prize.

### Ignore: Kraken trading prizes

Not aligned with ArcadeOps Control Tower.

Reasons:

- Requires trading/PnL logic.
- Distracts from the enterprise control tower story.
- Adds regulatory/financial complexity.
- Weak fit with current product direction.

### Optional: Kraken Social Engagement

Could be pursued lightly through build-in-public posts, but should not drive product decisions.

---

## 7. Strategic decision

We will not submit the full private ArcadeOps monolith.

We will submit a separate public repository:

```txt
arcadeops-control-tower-hackathon


This repository will contain:

- standalone Next.js demo,
- `/control-tower` page,
- replay fixture,
- SSE replay endpoint,
- optional live Gemini mode,
- README,
- MIT license,
- architecture explanation,
- demo video and deck links.

The full ArcadeOps platform remains separate.

---

## 8. Demo strategy

The public hackathon demo has two modes:

### Mode 1 — Replay mode

Default mode.

Purpose:

- deterministic,
- stable,
- no API cost,
- no LLM failure,
- perfect for video and judging.

What it shows:

- mission input,
- agent phases,
- plan,
- tool calls,
- execution trace,
- cost/tokens/model/provider,
- risk flags,
- final report.

### Mode 2 — Live Gemini mode

Optional if time allows.

Purpose:

- strengthen Application of Technology,
- target Google Gemini prize,
- prove the demo is not only an animation.

What Gemini should generate:

- execution plan,
- risk analysis,
- final audit summary.

What should stay replayed:

- tool call timeline,
- cost/token metrics,
- generated report artifact.

This is acceptable if clearly explained in the README.

---

## 9. Chosen demo mission

Main mission:

> **Audit an autonomous AI agent workflow, inspect its plan, tool calls, cost, model, provider, risks, and generate a production-readiness report.**

Why this mission:

- It directly demonstrates the Control Tower value.
- It is more differentiated than a generic research agent.
- It maps cleanly to the judging criteria.
- It creates strong business value: governance, auditability, reliability, cost control.

Alternative mission cards:

1. **Audit an autonomous agent workflow**
2. **Generate an AI observability market brief**
3. **Review a production AI agent run**

The first card is the default.

---

## 10. Demo flow

The demo must be understandable in 30 seconds and complete in 90 seconds.

### Flow

1. User opens `/control-tower`.
2. User sees the promise: “Mission control for autonomous AI agents.”
3. User clicks **Replay demo mission**.
4. The agent receives the mission.
5. The plan appears.
6. Execution starts.
7. Tool calls stream progressively.
8. Observability metrics appear:
  - provider,
  - model,
  - input tokens,
  - output tokens,
  - total cost,
  - latency,
  - tool call count,
  - risk flags.
9. Final report appears.
10. User sees the full audit trail.

### Sections on page

- Hero
- Mission
- Plan
- Execution
- Observability
- Result

---

## 11. What is real

In the public hackathon repo:

- Next.js application
- `/control-tower` page
- SSE replay endpoint
- streaming UI
- agent timeline model
- tool call visualization
- observability model
- risk flag model
- final report UI
- README and reproducible setup
- MIT license

If implemented:

- Gemini live analysis endpoint
- real Gemini-generated plan/risk/final summary

---

## 12. What is replayed or mocked

In replay mode:

- LLM execution
- web search
- browse URL
- tool calls
- PDF/report generation
- token counts
- cost data
- provider/model data
- final report artifact

This must be clearly disclosed in README.

Suggested wording:

> This hackathon demo uses a deterministic replay fixture to demonstrate the Control Tower experience reliably. The full ArcadeOps platform supports live agent execution, tool calls, persistence, multi-provider LLM routing and observability.

---

## 13. What is explicitly out of scope

Do not add:

- full ArcadeOps monolith,
- Prisma,
- Supabase,
- Redis,
- authentication,
- billing,
- CRM,
- admin pages,
- mail integrations,
- scheduler,
- secrets vault,
- production RBAC,
- complex database models,
- real PDF storage,
- full multi-agent orchestration.

Do not copy:

- `.env`
- `.env.local`
- API keys
- tokens
- private credentials
- internal configs
- full private ArcadeOps source

---

## 14. Repo structure target

Expected files:

```txt
src/app/page.tsx
src/app/control-tower/page.tsx
src/app/api/replay/route.ts
src/components/control-tower/DemoMissionLauncher.tsx
src/components/control-tower/PhasePills.tsx
src/components/control-tower/ToolCallCard.tsx
src/components/control-tower/ObservabilityPanel.tsx
src/components/control-tower/ResultCard.tsx
src/data/demo-run.json
docs/DEMO_SPEC.md
README.md
LICENSE

```

Optional if Gemini mode is added:

```txt
src/app/api/gemini/analyze/route.ts
src/components/control-tower/LiveGeminiPanel.tsx
.env.example

```

Never commit real `.env`.

---

## 15. Acceptance criteria for V0

The V0 is ready when:

- `/control-tower` loads locally.
- User can click **Replay demo mission**.
- SSE replay streams successfully.
- Phases are visible.
- Tool calls are visible.
- Observability panel is visible.
- Final result is visible.
- UI is clean enough for a screen recording.
- `npm run lint` passes.
- `npm run build` passes.
- Repo contains no `.env` or secrets.
- README explains replay vs real.

---

## 16. Acceptance criteria for V1

The V1 is ready when:

- V0 criteria are complete.
- Public Vercel demo URL works.
- README is hackathon-grade.
- MIT license is present.
- Optional live Gemini mode works or is documented as optional.
- Demo can be recorded in under 3 minutes.
- Deck outline is ready.
- Cover image is ready.
- Submission checklist is complete.

---

## 17. Submission checklist

### Lablab platform

- Complete Lablab profile
- Register for AI Agent Olympics
- Connect Discord
- Create or join team, even if solo
- Confirm latest deadline on event page
- Confirm any sponsor-specific requirements

### Repository

- Public GitHub repository
- MIT license
- README with demo URL
- Setup instructions
- No `.env`
- No secrets in history
- Clear replay/live explanation
- Screenshots or GIF

### Demo

- Deployed app URL
- `/control-tower` page works
- Replay works
- Tested in incognito
- Tested after fresh deploy
- Mobile not required, desktop must be clean

### Video

- MP4 format
- 3 minutes maximum target
- Clear voiceover
- Shows problem, solution, demo, observability, result
- No devtools
- No broken pages
- No login friction

### Slides

- PDF format
- 8 slides maximum preferred
- Problem
- Why now
- Solution
- Demo
- Architecture
- Business value
- Differentiation
- Closing

### Submission assets

- Project title
- Short description
- Long description
- Technology tags
- Category tags
- Cover image
- Video URL or upload
- Slide PDF
- GitHub URL
- Demo URL

---

## 18. Recommended title and descriptions

### Title

**ArcadeOps Control Tower**

### Short description

Mission control for autonomous AI agents: deploy, observe and audit every plan, tool call, cost, risk and final result.

### Long description

ArcadeOps Control Tower is a cockpit for autonomous AI agents in production. Instead of treating agents as black boxes, it turns each mission into an observable execution trace: planning, tool calls, costs, tokens, model/provider usage, risk flags and final deliverables.

The hackathon demo shows a production-readiness audit of an autonomous agent workflow. A replayable agent run streams through phases, tool calls and observability metrics, ending with a clear audit report. The demo is deterministic for reliable judging, while the architecture is designed to connect to live multi-provider agent execution.

The goal is simple: help teams trust, debug and scale autonomous agents safely.

### Tags

Suggested tags:

- AI Agents
- Agentic Workflows
- Enterprise AI
- Observability
- Governance
- Gemini
- Next.js
- SSE
- Developer Tools
- Automation

---

## 19. Video script outline

### 0:00–0:20 — Hook

Companies are starting to deploy autonomous AI agents. The problem is not building agents anymore. The problem is trusting them.

### 0:20–0:45 — Problem

Agents plan, call tools, spend tokens, make decisions and generate outputs. But most of this happens inside a black box.

### 0:45–1:20 — Solution

ArcadeOps Control Tower gives teams a cockpit to observe the full agent lifecycle: mission, plan, execution, tools, cost, risks and result.

### 1:20–2:15 — Demo

Show the replay mission:

- phase changes,
- execution plan,
- tool calls,
- streamed progress,
- observability panel.

### 2:15–2:45 — Business value

Teams can audit what happened, understand cost and risk, debug failures, and prepare agents for production.

### 2:45–3:00 — Closing

ArcadeOps Control Tower brings mission control to autonomous AI agents.

---

## 20. Deck outline

Recommended 8-slide deck:

1. **Title**  
ArcadeOps Control Tower — Mission control for autonomous AI agents
2. **Problem**  
Autonomous agents are becoming powerful but hard to trust, audit and control.
3. **Why now**  
Agent frameworks are exploding, but production observability is lagging behind.
4. **Solution**  
A cockpit showing mission, plan, tools, costs, risks and final output.
5. **Demo flow**  
Mission → Plan → Execution → Observability → Result
6. **Architecture**  
Next.js + SSE replay + optional Gemini analysis + agent timeline model
7. **Business value**  
Reduce debugging time, manage cost, improve trust, prepare for compliance.
8. **Closing**  
The future of agents needs a control tower.

---

## 21. Risks

### Risk 1 — Demo looks too mocked

Mitigation:

- Be transparent.
- Add optional Gemini mode if possible.
- Make the replay realistic and useful.
- Explain that replay exists for deterministic judging.

### Risk 2 — Project looks too small compared to full ArcadeOps

Mitigation:

- Position it as the public hackathon version.
- Mention full ArcadeOps supports live execution.
- Do not overclaim.

### Risk 3 — Sponsor criteria missed

Mitigation:

- Target Google first.
- Add live Gemini only after V0 works.
- Consider Vultr only after Vercel demo is stable.

### Risk 4 — Too much product sprawl

Mitigation:

- Only show `/control-tower`.
- Do not mention CRM, billing, admin, HR, mail, scheduler.
- One story. One demo. One promise.

---

## 22. Budget and effort limits

Maximum recommended budget:

- AI coding/API/dev tokens: **$150–250**
- Demo API calls: **$20–50**
- Infra: **$0–30**

Hard stop:

- Do not spend **$500–1000** on tokens for this hackathon.
- Do not refactor ArcadeOps.
- Do not rebuild the full platform.
- Do not pursue Vultr before Vercel works.
- Do not change the concept after V0 starts.

---

## 23. Execution roadmap

### Step 1 — Cadrage

Status: in progress.

Deliverable:

- `docs/DEMO_SPEC.md`

### Step 2 — V0 replay demo

Build:

- `/control-tower`
- fixture JSON
- SSE replay endpoint
- UI components
- README update

Goal:

- demo works locally and is filmable.

### Step 3 — Public deploy

Build:

- Vercel deployment
- public demo URL
- incognito test

Goal:

- stable demo URL.

### Step 4 — V1 credibility

Build if time allows:

- optional Gemini live analysis
- better README
- screenshots/GIF
- architecture diagram

Goal:

- stronger Application of Technology and Google prize fit.

### Step 5 — Submission assets

Create:

- video MP4
- slides PDF
- cover image
- short/long descriptions
- tags

Goal:

- complete Lablab submission.

### Step 6 — Submit

Submit before the official deadline.

Do not wait until the last hour.

---

## 24. Current status

Completed:

- Public GitHub repo created
- Next.js scaffold created
- Build passes
- Lint passes
- No secrets copied
- No ArcadeOps source copied
- Demo spec created

Next action:

> Build `/control-tower` V0 with replay fixture and SSE endpoint.

---

## 25. Decision

Proceed.

This is worth doing if treated as a focused 48-hour product/marketing sprint, not as a full rebuild.

Primary goal:

> Produce a reusable ArcadeOps demo asset.

Secondary goal:

> Compete for Google Gemini and general hackathon prizes.

Do not chase every sponsor prize.  
Do not overbuild.  
Ship the Control Tower.

```

Ensuite commit simple :

```bash
git add docs/DEMO_SPEC.md
git commit -m "Update hackathon demo spec"
git push

```

