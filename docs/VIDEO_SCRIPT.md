# Video script — ArcadeOps Control Tower (3 minutes target)

> Format: MP4, 1080p minimum, dark UI, calm voiceover, no devtools, no
> login friction. Goal: convince a hackathon judge that this is a
> **real product gate built around Gemini**, not a replay animation.
>
> Canonical question on screen at all times: _"Can this AI agent run
> safely ship to production?"_

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
- Three scenario cards visible:
  **Blocked CRM write agent** _(Critical risk)_,
  **Needs-review support agent** _(Medium risk)_,
  **Production-ready research agent** _(Low risk)_.
- Hover and click the critical card.
- The evidence timeline lights up: _Accessed customer records_,
  _Drafted outbound emails_, _Attempted CRM deletion_, _No human
  approval gate_, _Missing replay ID_, _Missing audit log_, _Cost
  spike_.

---

## 0:45 – 1:20 — Gemini blocks the run

**Voiceover:**

> "Gemini reads the trace server-side. No API key in the browser.
> No auto-run. One click."

**Screen:**

- Click **Audit this run**.
- Loader for ~5 s.
- The verdict block fills in:
  - score dial — typically **30–45 / 100**,
  - verdict pill: **BLOCKED**,
  - one-paragraph executive summary.
- Caption: _"Powered by Gemini — server-side reliability judge."_

---

## 1:20 – 1:50 — Inspect the evidence

**Voiceover:**

> "Gemini doesn't just give a score. It returns typed risks — severity,
> category and evidence — plus what's missing: replay IDs, audit logs,
> approval gates, per-tool cost limits."

**Screen:**

- Slow pan over the Risks grid (data exposure, governance,
  observability, cost).
- Pan over **Missing evidence** and **Remediation plan**.
- Caption: _"Evidence-based. Not a vibe check."_

---

## 1:50 – 2:20 — Pick guardrails

**Voiceover:**

> "The product turns the verdict into action. Below the risks, Gemini
> recommends production guardrails. The critical ones are pre-checked.
> Approval for destructive tools. Block outbound messages without
> review. Per-tool cost limits. Replay IDs. Audit logs. Observability."

**Screen:**

- Scroll down to the **Recommended production guardrails** panel.
- Show the checkboxes (the wow scenario pre-checks the destructive
  ones).
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
- The **Readiness comparison** card appears:
  - **Before:** BLOCKED · ~38 / 100,
  - **After:** READY WITH MONITORING · ~85 / 100 _(or NEEDS REVIEW —
    keep whatever Gemini actually returns; the point is it changes
    and is honest about residual risk)_.
- Caption: _"What-if simulation — not applied to production."_

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
