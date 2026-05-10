# Pre-recording & submission checklist — ArcadeOps Control Tower

> Run this checklist **once on the deployed Vercel URL** before
> recording the video and before clicking submit on Lablab. Every
> section ends with a binary outcome — **PASS** or **FAIL**. If any
> section fails, fix it and re-run the section. Do not record the
> video while any section is **FAIL**.

---

## 0. Pre-flight environment

- [ ] Browser: Chrome or Firefox in **private / incognito** mode.
- [ ] Window size: 1920 × 1080 minimum (the recording target).
- [ ] No browser extensions enabled in the private window.
- [ ] Notifications disabled at the OS level (Do Not Disturb / Focus).
- [ ] Vercel deployment is on the latest commit
      (`vercel ls` shows the expected Git SHA on Production).
- [ ] `GEMINI_API_KEY` is configured in Vercel Project Settings →
      Environment Variables for **Production + Preview + Development**,
      and the deployment has been redeployed at least once **after**
      the key was added (otherwise the function still runs without it).
- [ ] `GEMINI_MODEL` is either unset (defaults to `gemini-2.5-flash`)
      or set to `gemini-2.5-flash`. Avoid `gemini-2.5-pro` for the
      video — latency too variable.

---

## 1. Deployment health (Vercel)

| # | Step | Expected | Actual | Pass? |
|---|---|---|---|---|
| 1.1 | `curl https://<deploy>/api/health` | `200 OK`, JSON `{ "status": "ok", … }` | | ☐ |
| 1.2 | `curl https://<deploy>/api/capabilities` (with key configured) | `200 OK`, JSON with `geminiAvailable: true` and a public `geminiModel` | | ☐ |
| 1.3 | `curl https://<deploy>/api/replay` (Accept: text/event-stream) | `200 OK`, headers include `content-type: text/event-stream`, body streams events | | ☐ |
| 1.4 | Open `https://<deploy>/` in the private window | Hero loads with tagline, no console errors | | ☐ |
| 1.5 | Click **Launch Control Tower** | Navigates to `/control-tower`, no console errors | | ☐ |

---

## 2. Mode badge — without `GEMINI_API_KEY`

> Temporarily remove the key (or use a Preview deployment with no
> key) to verify the **deterministic replay** path. Don't skip this —
> some judges will hit the deployment without configuring a key.

- [ ] **2.1** — Open `/control-tower` in a deployment with **no
      `GEMINI_API_KEY`** configured.
- [ ] **2.2** — The judge panel displays the **Mode: Deterministic
      replay** pill (white/zinc).
- [ ] **2.3** — The judge panel does NOT show a "Run production gate"
      button. Instead it shows the discreet aside explaining that
      `GEMINI_API_KEY` enables the live audit.
- [ ] **2.4** — The scenario picker, evidence timeline, "Powered by
      ArcadeOps Runtime" section and the "Business impact / Prevents"
      block all render correctly.
- [ ] **2.5** — Clicking **Replay sample run** in
      `DemoMissionLauncher` streams the deterministic SSE trace to
      completion (a `done` event arrives in < 30 s).

**Outcome:** ☐ PASS · ☐ FAIL

---

## 3. Mode badge — with `GEMINI_API_KEY`

- [ ] **3.1** — Re-add the key (or switch to the deployment that has
      the key configured), redeploy, then reload `/control-tower` in a
      fresh private window.
- [ ] **3.2** — The judge panel displays the **Mode: Live Gemini
      audit** pill (emerald) AND the `Powered by Gemini` pill AND the
      model name (e.g. `gemini-2.5-flash`) on the same row.
- [ ] **3.3** — The CTA in the judge panel reads **Run production
      gate** (not "Run Gemini judge").

**Outcome:** ☐ PASS · ☐ FAIL

---

## 4. Scenario coverage — three scenarios, no contradictions

> The whole point of `verdict-consistency.ts` is that every verdict +
> score + executive decision combo must be coherent. **Score this
> matrix for all three scenarios.**

For each scenario below, click the scenario, click **Run production
gate**, then verify the contract.

### 4.1 — Multi-agent customer escalation run (default, recommended demo path)

- [ ] Scenario card displays the **Recommended demo path** badge.
- [ ] Verdict returned: `blocked`.
- [ ] Score returned: ≤ 45.
- [ ] Executive decision **does not contain** any of: `ship`, `safe to
      ship`, `proceed`, `green-light`. (If it does, `verdict-consistency`
      is not aligning text — file an issue.)
- [ ] At least one `Policy gate: …` badge is visible
      (`destructive_without_approval`, `outbound_without_review`, or
      `write_without_audit_or_replay`).
- [ ] The risks list contains at least one risk of severity `high`.
- [ ] Missing evidence list is non-empty.
- [ ] Remediation plan is numbered and ≥ 2 items.

**Outcome:** ☐ PASS · ☐ FAIL

### 4.2 — Needs-review support agent

- [ ] Verdict returned: `needs_review` (NOT `ready`, NOT `blocked`).
- [ ] Score returned: 50–79 inclusive.
- [ ] Executive decision is consistent with `needs_review` — does NOT
      assert "ready to ship" and does NOT assert "must be blocked".
- [ ] At most one (or zero) policy gate badges visible.

**Outcome:** ☐ PASS · ☐ FAIL

### 4.3 — Production-ready research agent

- [ ] Verdict returned: `ready`.
- [ ] Score returned: ≥ 80.
- [ ] Executive decision contains an explicit ship signal (e.g.
      "ready", "ship", "safe to deploy"). It does NOT contain "blocked"
      or "do not ship".
- [ ] No policy gate badges fire.
- [ ] Risk flags panel is empty (no risk-shaped positive bullets).

**Outcome:** ☐ PASS · ☐ FAIL

---

## 5. Re-score with guardrails (multi-agent escalation only)

After step 4.1, scroll to `GuardrailSimulationPanel`:

- [ ] **5.1** — Tick **Require human approval for destructive tools**.
- [ ] **5.2** — Tick **Require review before outbound email**.
- [ ] **5.3** — Click **Re-run production gate**.
- [ ] **5.4** — A second verdict returns within < 15 s.
- [ ] **5.5** — The new score is **strictly greater** than the first
      score.
- [ ] **5.6** — The new verdict is `needs_review` or `ready`.
- [ ] **5.7** — The destructive_without_approval AND
      outbound_without_review gates are **not in the active list**
      anymore (they're "covered" by the selected guardrails).
- [ ] **5.8** — A "Before / after" delta is visible in the UI (score
      change clearly labeled).

**Outcome:** ☐ PASS · ☐ FAIL

---

## 6. Copy audit report

- [ ] **6.1** — On any verdict card, click **Copy audit report**.
- [ ] **6.2** — The button shows a transient **Copied** confirmation
      (with a check icon).
- [ ] **6.3** — Paste the clipboard content into a plain text editor.
      Verify the report contains: scenario name, Gemini model, mode
      (live or replay), verdict, score, executive decision, list of
      triggered policy gates, list of risks with severity, missing
      evidence, remediation plan.
- [ ] **6.4** — No raw HTML, no JSON braces dumped — the report is
      human-readable.

**Outcome:** ☐ PASS · ☐ FAIL

---

## 7. Mobile / half-screen responsiveness

- [ ] **7.1** — Resize the window to **≤ 480 px wide** (or open Chrome
      DevTools and switch to iPhone 12 Pro emulation).
- [ ] **7.2** — `/` renders without horizontal scroll. Hero, pillars
      and architecture ribbon stack vertically and remain readable.
- [ ] **7.3** — `/control-tower` renders without horizontal scroll.
      The scenario picker, evidence timeline, judge panel and runtime
      section all stack vertically.
- [ ] **7.4** — All buttons remain tappable (≥ 44 × 44 px target on
      mobile).
- [ ] **7.5** — No text is truncated or clipped behind another
      element.

**Outcome:** ☐ PASS · ☐ FAIL

---

## 8. Cross-browser smoke

- [ ] **8.1** — Chrome (latest stable): full `/control-tower` flow OK.
- [ ] **8.2** — Firefox (latest stable): full `/control-tower` flow
      OK. The SSE replay completes (Firefox occasionally truncates
      `text/event-stream` if the response is gzipped weirdly).
- [ ] **8.3** — Safari (if available): home `/` renders correctly.
      Best-effort only — Safari is not a hackathon target browser.

**Outcome:** ☐ PASS · ☐ FAIL

---

## 9. Console / network sanity

- [ ] **9.1** — Open DevTools console on `/` and `/control-tower`.
      No `error`-level messages. Warnings are tolerated only if they
      are framework noise (Next/Turbopack hydration warnings).
- [ ] **9.2** — Network tab: no 4xx or 5xx on the happy path,
      excluding the legitimate 503 `GEMINI_NOT_CONFIGURED` if testing
      without the key, and the legitimate 429 `RATE_LIMITED` after
      hammering the judge route 6+ times in 10 minutes.
- [ ] **9.3** — Confirm the `GEMINI_API_KEY` value never appears in
      any network response (search the response bodies). It should
      only ever be sent from the Vercel function to Google.

**Outcome:** ☐ PASS · ☐ FAIL

---

## 10. Draft video — one rehearsal pass before the final take

- [ ] **10.1** — Read [`docs/VIDEO_SCRIPT_90S.md`](VIDEO_SCRIPT_90S.md)
      end to end out loud, screen open on the deployment, no
      recording. Time it. Target 85–95 s.
- [ ] **10.2** — Identify any scene that took > 12 s — those need to
      be sped up or rephrased.
- [ ] **10.3** — Confirm the **Mode: Live Gemini audit** pill is
      clearly visible in the recording at the moment you click **Run
      production gate** (otherwise judges might think the demo is on
      replay).
- [ ] **10.4** — Confirm the score delta in section 5 (re-run with
      guardrails) is **clearly readable** at the recording resolution.

**Outcome:** ☐ PASS · ☐ FAIL

---

## 11. Submission package final check

Before clicking submit on Lablab.ai:

- [ ] All sections 1 → 10 above are **PASS**.
- [ ] [`docs/SUBMISSION_LABLAB.md`](SUBMISSION_LABLAB.md) values were
      copy-pasted into the corresponding Lablab form fields, char
      counts respected.
- [ ] The video URL is filled in (YouTube unlisted is fine; Loom is
      fine; the URL must work in private browsing).
- [ ] The GitHub URL points at a public repo that builds (`npm install
      && npm run build` succeeds with no env vars).
- [ ] The live demo URL works in private browsing.
- [ ] The submission tagline matches **A Gemini-powered production
      gate for autonomous AI agents.** (Don't drift between the README,
      the form, and the video.)

---

## Quick troubleshooting matrix

| Symptom on prod | Likely cause | Fix |
|---|---|---|
| Mode pill stuck on `Deterministic replay` even with the key | The deployment was created **before** the key was added; functions still run with the old env | Trigger a fresh deployment (`vercel --prod`) so the new env is captured |
| `Run production gate` returns 503 `GEMINI_NOT_CONFIGURED` | Same as above, or key is in Preview only and prod doesn't have it | Add key to **Production**, redeploy |
| Verdict + score contradiction (e.g. `blocked` + score 90) | `verdict-consistency.ts` not running OR a bypass was introduced | Check the judge route imports `enforceVerdictConsistency` and that it is called **after** `applyProductionPolicyGates` |
| Multi-agent scenario verdict comes back `ready` | The trace text doesn't match the policy-gate substring rules AND the scenario id isn't in `policy-gates.ts` allowlist | Verify `multi_agent_escalation` is still in the `scenarioIds` array of all 3 critical rules in `src/lib/control-tower/policy-gates.ts` |
| `Copy audit report` button does nothing | Browser blocks `navigator.clipboard.writeText` outside HTTPS (very rare on Vercel) | Confirm the page is served over HTTPS; otherwise file an issue |
| Mobile layout broken | A new component shipped without `flex-wrap` or relies on a fixed pixel width | Re-run section 7 in Chrome DevTools mobile emulation |
