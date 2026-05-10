# Lablab.ai submission copy — ArcadeOps Control Tower

> Single source of truth for the AI Agent Olympics submission form.
> Copy from the blocks below straight into Lablab. Each block is
> length-budgeted for the form field it targets.

---

## Project name

**ArcadeOps Control Tower**

---

## Tagline / one-liner

> A Gemini-powered production gate for autonomous AI agents.

---

## Short pitch — Twitter-length (≤ 140 characters)

> Gemini-powered production gate for autonomous AI agents. Audits every multi-agent run. Blocks unsafe ones before they touch real systems.

(Char count: 138.)

---

## Short description (≤ 250 characters, used by Lablab cards)

> ArcadeOps Control Tower is the production gate for autonomous AI agents. It audits every multi-agent run with Gemini, applies deterministic policy gates and a verdict-consistency layer, and decides if the run can ship.

(Char count: 226.)

---

## Long description (target ≤ 400 words)

Autonomous AI agents are now deployed in production. They use tools.
They delegate work to sub-agents. They write to CRMs and send emails to
real customers. The hard problem is no longer building agents — it is
deciding when a multi-agent run is actually safe to ship.

**ArcadeOps Control Tower** is the production gate for those runs.
It audits every multi-agent trace with Gemini before it can touch a
real system, and applies a deterministic 3-layer trust stack on top of
the model.

The default scenario in the demo is a **multi-agent customer escalation
run**: a CEO agent delegates to a Support agent, which calls the
knowledge base, then delegates to a CRM agent and an Email agent. The
CRM agent attempts a write without human approval. The Email agent
attempts to send a customer email without review. Control Tower blocks
the run before any real system is touched.

Three layers, one screen:

1. **Gemini Reliability Agent** — server-side Gemini reads the full
   multi-agent trace and produces a strict JSON verdict: readiness
   score (0–100), verdict (`ready` / `needs_review` / `blocked`), typed
   risks with evidence, missing observability evidence, a numbered
   remediation plan, an executive decision, and a business-value
   paragraph.
2. **Deterministic policy gates** — pure-TypeScript rules with no I/O
   and no LLM. They cap the verdict on hard production violations
   (destructive write without approval, outbound message without
   review, write without audit, cost unbounded). The gates only ever
   tighten Gemini's verdict. They never relax it.
3. **Verdict consistency layer** — a pure-TypeScript post-processor.
   It guarantees the final score, verdict and recommended action are
   coherent. A "blocked" verdict can never recommend "ship".

The judge panel carries a live mode pill — **Live Gemini audit** when
`GEMINI_API_KEY` is configured server-side, **Deterministic replay**
otherwise — so a judge always knows which path is in use. A one-click
**Re-run with guardrails** simulation re-scores the same trace as if
the recommended guardrails were already in place, and reveals the
score delta.

**The headline:** Gemini reasons on the trace. ArcadeOps enforces the
production gate.

(Word count: 332.)

---

## Hero image / cover

- Suggested: a screenshot of `/control-tower` with the multi-agent
  scenario selected, the evidence timeline visible, and the decision
  card showing a `Blocked` verdict + `Policy gate: …` badges.
- Captured at 1600 × 900 (or higher) on a desktop viewport.
- See [`docs/RECORDING_CHECKLIST.md`](RECORDING_CHECKLIST.md) for the
  exact shot list.

---

## Demo URL

```
https://arcadeops-control-tower-hackathon.vercel.app/
```

The root page (`/`) is a credible landing — judges arriving on `/`
will land on a hero with a single CTA pointing to `/control-tower`.

---

## Source code URL

```
https://github.com/Damso74/arcadeops-control-tower-hackathon
```

License: **MIT**.

---

## Video URL

(Recorded after the Vercel test pass — see
[`docs/VIDEO_SCRIPT_90S.md`](VIDEO_SCRIPT_90S.md) for the timecoded
script, and [`docs/RECORDING_CHECKLIST.md`](RECORDING_CHECKLIST.md) for
the production checklist.)

---

## Mandatory technologies (AI Agent Olympics rules)

| Requirement | How Control Tower satisfies it |
|---|---|
| Uses **Google Gemini** | The Reliability Agent is Gemini server-side ([`src/app/api/gemini/judge/route.ts`](../src/app/api/gemini/judge/route.ts)), defaults to `gemini-2.5-flash`, returns strict JSON validated by [`src/lib/control-tower/gemini-types.ts`](../src/lib/control-tower/gemini-types.ts). |
| **Autonomous AI agents** | The default scenario is a multi-agent run with delegation: CEO → Support → CRM + Email. The trace captures every agent, tool, sub-agent and risk. |
| **Production-ready** | 3-layer trust stack (Gemini + policy gates + verdict consistency). Server-side rate limiting, sanitization, hard timeouts, no key in browser. Lint + tsc + build green. |
| **Public deployment** | Vercel (link above). Replay path works without any API key — perfect for judges to test without provisioning Gemini credentials. |
| **Open source** | MIT, full repo public on GitHub. |

---

## Tech stack

- **Next.js 16** App Router · **React 19** · **TypeScript strict**
- **Tailwind CSS 4** (zero-config via `@tailwindcss/postcss`)
- Native `fetch` + `ReadableStream` for SSE on both server and client
- **Google Gemini** via REST (`generativelanguage.googleapis.com/v1beta`,
  no SDK dependency)
- **Docker** multi-stage build → Next.js standalone bundle
- No database, no auth, no billing — only state is the SSE stream.

---

## Team

- **Damso74** — solo build for the hackathon.
- Architecture, agents runtime and Control Tower derived from the
  underlying ArcadeOps platform.

---

## Tags / categories suggestions

`autonomous-agents`, `multi-agent`, `gemini`, `production-gate`,
`observability`, `ai-safety`, `policy-gates`, `agent-orchestration`,
`agent-audit`, `nextjs`, `vercel`.
