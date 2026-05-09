# Video script — ArcadeOps Control Tower (3 minutes target)

> Format: MP4, 1080p minimum, dark UI, calm voiceover, no devtools, no
> login friction. Goal: convince a hackathon judge that this is a
> **real product gate built around Gemini**, not a replay animation.
>
> Canonical question on screen at all times: _"Can this AI agent run
> safely ship to production?"_
>
> **UX direction (V5 polish):** decision-first. The judge sees the
> verdict (BLOCKED) immediately after the Gemini call, then expands
> the full audit details only when needed. Filmable in 1440×900 or
> 1920×1080 with at most 2 scrolls.

---

## 0:00 – 0:20 — Hook (problem first)

**Voiceover:**

> "Autonomous AI agents are now being deployed in production. The hard
> question is no longer how to build them — it's how to decide whether
> a given run is actually safe to ship. Today, every run is a black box."

**Screen:**

- Static landing card with the canonical question:
  _"Can this AI agent run safely ship to production?"_
- Below it the three modes badge row: **Powered by Gemini · Deterministic
  replay · Production gate**.

---

## 0:20 – 0:45 — Choose the unsafe run

**Voiceover:**

> "Pick a run. Today I'm going to pick the worst one I have: a CRM
> cleanup agent that reads customer records, drafts outbound emails,
> and tries to delete records — without a human approval gate."

**Screen:**

- Cut to the `/control-tower` page.
- Hero is one fold: title, sub-title, three badges, single-line flow
  (`Pick a trace → inspect evidence → Gemini decides: ship, review or
  block`).
- One large hero card visible: **Blocked CRM write agent**, plus three
  compact secondaries: **Needs-review support agent**,
  **Production-ready research agent**, **Paste your own trace**. A
  discreet text link below offers the deterministic safe-sample replay.
- Click the hero card.
- Four key evidence items appear: **Destructive action**, **Outbound
  action**, **Cost issue**, **Audit gap** — each with a coloured icon.
  The full evidence list lives behind a single _View full evidence_
  disclosure.
- Compact observability strip below the evidence: **Cost · Tokens ·
  Tools · Flags**, with _View technical metrics_ disclosure.

---

## 0:45 – 1:20 — Gemini blocks the run

**Voiceover:**

> "Gemini reads the trace server-side. No API key in the browser.
> No auto-run. One click."

**Screen:**

- Click **Run Gemini judge**.
- Loader for ~5 s.
- The **decision card** fills in immediately, decision-first:
  - score dial — typically **5–20 / 100**,
  - verdict pill: **BLOCKED — DO NOT SHIP**,
  - small red **Policy gate: destructive action without approval** badge
    next to the verdict pill,
  - one-line **Reason** (destructive CRM deletion + outbound emails
    without approval),
  - one-line **Next action** (add approval gates, replay IDs, audit
    logs and cost limits before re-scoring).
- Caption: _"Powered by Gemini — server-side reliability judge.
  ArcadeOps enforces non-negotiable production gates."_

**Voiceover detail:**

> "Even if the model summarizes the run, ArcadeOps enforces hard
> production gates: destructive actions without approval cannot ship.
> Gemini provided the audit. ArcadeOps applied non-negotiable
> production rules on top."

---

## 1:20 – 1:50 — Inspect the evidence

**Voiceover:**

> "Gemini doesn't just give a score. It returns typed risks — severity,
> category and evidence — plus what's missing: replay IDs, audit logs,
> approval gates, per-tool cost limits."

**Screen:**

- Below the decision card, only the **top 3 risks** are visible
  (sorted high → low) with a `Top 3 of N risks` counter and a
  _View all risks_ disclosure.
- Three short audit assessment cards: **Cost**, **Tool safety**,
  **Observability** — each one sentence. The full Gemini paragraphs
  (cost / tool safety / observability / business value) are folded
  behind _View full audit details_.
- **Missing evidence** shows top 3, **Remediation plan** shows top 4,
  each with their own disclosure for the rest.
- Caption: _"Evidence-based. Not a vibe check."_

---

## 1:50 – 2:20 — Pick guardrails

**Voiceover:**

> "The product turns the verdict into action. Below the risks, Gemini
> recommends production guardrails. The critical ones are pre-checked.
> Approval for destructive tools. Block outbound messages without
> review. Per-tool cost limits. Replay IDs. Audit logs. Observability."

**Screen:**

- Scroll once to the **Guardrails** panel.
- Five recommended guardrails are visible (approval for destructive
  tools, block outbound without review, per-tool cost limits, replay
  IDs, audit logs). The remaining policies live behind _Advanced
  guardrails_.
- Sub-text reads _"What-if simulation only. No backend is modified."_
- Cursor lingers on **Require human approval for destructive tools**.

---

## 2:20 – 2:50 — Re-score with guardrails

**Voiceover:**

> "Click re-score. Same trace. Same Gemini. But now evaluated as a
> what-if simulation: assume those guardrails are implemented in
> production. Watch the readiness score move."

**Screen:**

- Click **Re-score with guardrails**.
- Loader for ~5 s.
- The **Readiness comparison** strip appears at the top of the
  guardrails section — visually loud, with an arrow and a delta:
  - **Before guardrails:** BLOCKED · ~10 / 100,
  - arrow + `+50` (or whatever Gemini returns),
  - **After guardrails:** NEEDS REVIEW · ~60 / 100 _(or READY WITH
    MONITORING — keep whatever Gemini actually returns; the point is
    it changes and is honest about residual risk)_.
- A one-sentence interpretation under the comparison (e.g. _"Guardrails
  reduced the immediate blocker, but the run still needs review before
  production."_).
- The full _After guardrails_ audit stays collapsed by default behind
  _View after-guardrails audit_ — only the score, verdict, summary and
  top 3 residual risks are shown.
- Caption: _"What-if simulation only — not applied to production."_

---

## 2:50 – 3:00 — Closing

**Voiceover:**

> "Replay or paste any agent trace. Block unsafe runs. Recommend
> guardrails. Re-score. ArcadeOps Control Tower is the production
> gate autonomous AI agents have been missing."

**Screen:**

- Final card: canonical question, GitHub URL, demo URL, sponsor logos
  (Lablab.ai, Google, Vultr) discreet at the bottom.

---

## Production notes

- **No console open**, no DevTools, no flash of "Live backend not
  configured" — record on a build that has no `ARCADEOPS_*` env vars,
  so the Live button is hidden cleanly.
- **Two recordings recommended:** one with `GEMINI_API_KEY` set
  (full demo), one without (replay-only safety net for the cut).
- The wow moment is the **before / after** card. Linger on it for a
  full beat — that single visual sells the product.
- Cursor visible but no random idle motion.
- A short cross-fade between sections is fine; no fancy transitions.
- Background music: low-volume ambient if any; never overpower the VO.
- If the unsafe scenario ever returns `ready` from Gemini in a take,
  re-record — that's not the story.
