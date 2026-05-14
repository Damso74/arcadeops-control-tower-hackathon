# 90-second jury video — storyboard

> **Goal:** in 90 seconds, prove that **`Gemini judges · Vultr runs ·
> ArcadeOps blocks unsafe autonomous agents before production`** is
> real, live and clickable. Bilingual notes — primary VO is **English**,
> French support text in italics underneath each scene for the recording
> session.
>
> _<sub>Lot 4a — V2 pitch acted (decision §6-A). Older internal pitch
> ("Gemini runs the agent · Vultr executes the workflow · ArcadeOps
> decides if it can ship") kept as historical context only.</sub>_

## Recording setup

- **Resolution:** 1920×1080, 30 fps, MP4 H.264, AAC audio.
- **Capture:** OBS or Loom screen-share at full resolution. Webcam
  inset is optional and only used in scene 6.
- **Two browser tabs prepared:**
  1. https://arcadeops-control-tower-hackathon.vercel.app/control-tower
  2. https://github.com/Damso74/arcadeops-control-tower-hackathon
- **One terminal prepared** (PowerShell or any shell with `curl` + `jq`).
- **VS Code** open on `runner/app/agents/worker.py` and
  `src/lib/control-tower/policy-gates.ts` for the code cut-aways.
- Pre-warm the Vultr runner once (`curl http://136.244.89.159/health`)
  to keep the `<InfrastructureProofCard>` `Status: Online` pastille
  green during the scene 3 close-up — even though the official video
  films **scenario_trace mode** (instant 4 s Gemini audit), not the
  130 s live Vultr+Gemini run path.

> _<sub>**Lot 4b storyboard update (cockpit V2 / hackathon-100):**
> the `⚡ Run live with ArcadeOps backend` button (Vultr 130 s/run) is
> intentionally **masked in public prod** via the
> `NEXT_PUBLIC_LIVE_VULTR=0` kill-switch (decision §6-B). The
> recording showcases the new wow path: sticky 3-step stepper +
> Recommended-demo banner + Critical scenario card →
> `<GeminiTicker>` 4 s animation → `<DecisionCard>` with V2 punchline
> + `<ExpectedVsActualBadge>` + `<ProductionPoliciesCard>` (5 rules) →
> `<InfrastructureProofCard>` (Vultr region + last latency) →
> `<CockpitScoreboard>` bumping in real time. The live Vultr path is
> still shown discreetly via the InfrastructureProofCard chip, which
> is what proves the runtime claim without burning 130 s of video.</sub>_

## Asset checklist (capture before recording)

| File                      | Subject                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `01_hero.png`             | Vercel UI hero with the tagline (the green "Run live" CTA renders below the fold after picking replay mode) |
| `02_problem.png`          | Slide / Figma frame: "Agents are powerful. Production is dangerous."     |
| `03_curl.png`             | Terminal mid-curl with the `runner-proxy` request (debug path)           |
| `04_trace.png`            | UI evidence timeline showing PLANNER + WORKER steps (see `docs/assets/live-demo-trace.png`) |
| `05_verdict.png`          | UI verdict card showing `BLOCKED` + 3 policy gates                       |
| `06_costcard.png`         | UI panel highlighting `16 322 tokens` · `$0.001424` · `23.44 s`          |
| `07_arch.png`             | Mermaid architecture from `docs/ARCHITECTURE.md` exported as PNG         |
| `08_provision.png`        | `scripts/vultr-provision.ps1 -DryRun` output                             |
| `09_judge.png`            | Gemini reliability judge panel (see `docs/assets/gemini-reliability-judge.png`) |

> Two reference screenshots already shipped in the repo are reusable
> as cuts in scenes 3 and 4:
>
> - [`docs/assets/live-demo-trace.png`](assets/live-demo-trace.png) —
>   the `/control-tower` page mid-run with timeline, tool calls and
>   `BLOCKED` verdict.
> - [`docs/assets/gemini-reliability-judge.png`](assets/gemini-reliability-judge.png) —
>   the Gemini reliability judge panel with the structured verdict.

---

## Scene 1 — Hook (0:00 → 0:10) · 10 s

| Field         | Value                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production."                      |
| **VO (FR support)** | *« Gemini juge. Vultr exécute. ArcadeOps bloque les agents IA dangereux avant la prod. »*                |
| **On-screen** | (a) 0:00 → 0:03 — `public/cover.png` full-bleed (1920×1080, V2 punchline + Gemini/Vultr/Vercel chips) for the punchline beat. (b) 0:03 → 0:10 — cut to the `/control-tower` cockpit hero showing the H1 "A Gemini-powered production gate for autonomous AI agents." + the V2 emerald punchline + the secondary italic "Logs tell you what happened…" + the **`<CockpitStepper>` sticky top-bar** (1 Pick / 2 Inspect / 3 Decide) + the **`<RecommendedDemoBanner>`** below it. |
| **Lower third** | `arcadeops-control-tower-hackathon.vercel.app/control-tower`                                                  |
| **Transition** | Hard cut to scene 2 on the last word.                                                                         |

## Scene 2 — Problem (0:10 → 0:25) · 15 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "AI agents now write to CRMs, send customer emails, take refund decisions. The hard part is no longer building the agent — it's deciding when a multi-agent run is actually safe to ship. Most teams ship on faith." |
| **VO (FR support)** | *« Les agents IA écrivent dans le CRM, envoient des mails clients, déclenchent des remboursements. Le vrai problème, ce n'est plus de construire l'agent — c'est de décider quand un run multi-agent peut vraiment partir en prod. Aujourd'hui, on ship à l'aveugle. »* |
| **On-screen** | Wide split-screen: left side — Figma slide "Agents are powerful. Production is dangerous." (`02_problem.png`). Right side — quick montage of CRM dashboard, mail client, Slack alert (any rights-cleared B-roll or Figma mock).                                                                                                                                          |
| **Caption**   | "Production gates are still missing for autonomous agents."                                                                                                                                                                                                                                                                                                            |
| **Transition** | Smooth zoom into the terminal.                                                                                                                                                                                                                                                                                                                                          |

## Scene 3 — Solution, live judge (0:25 → 0:50) · 25 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "I'll prove it live. I pick the unsafe **Multi-agent customer escalation** scenario — a CRM write agent that drafts outbound emails and tries destructive writes without approval. Gemini reads the entire trace in **about four seconds** — you can see the ticker tick. The verdict drops: **BLOCKED**. The Expected-vs-Gemini badge confirms a `Match: yes` against the documented expected verdict. ArcadeOps' five non-negotiable policy rules light up below — destructive without approval, write without audit, missing replay ID, all enforced server-side. The infrastructure card shows we're talking to Vultr Frankfurt with a live audit latency. The cockpit scoreboard at the top ticks `Blocked +1`, `High-risk calls blocked +1`. The agent did its job. We refused to ship its output." |
| **VO (FR support)** | *« Je le prouve en live. Je sélectionne le scénario unsafe **Multi-agent customer escalation** — un agent qui écrit dans le CRM, drafte des emails sortants et tente des écritures destructives sans approbation. Gemini lit toute la trace en **environ quatre secondes** — on voit le ticker défiler. Le verdict tombe : **BLOCKED**. Le badge Expected-vs-Gemini confirme `Match: yes` contre le verdict attendu documenté. Les cinq règles non-négociables d'ArcadeOps s'allument en-dessous — destructif sans approbation, write sans audit, replay ID manquant, toutes appliquées côté serveur. La carte infrastructure montre qu'on parle bien à Vultr Francfort avec une latence d'audit live. Le scoreboard tout en haut incrémente `Blocked +1`, `High-risk calls blocked +1`. L'agent a fait son job. On a refusé de shipper son output. »* |
| **On-screen** | (a) 0:25 → 0:28 — focus the `/control-tower` page, click the **critical scenario card** (red border, `Recommended demo path` chip, `Multi-agent customer escalation`) — the card highlights, the **Audit this run** CTA pulses. (b) 0:28 → 0:32 — click **Run Gemini judge**; the `<GeminiTicker>` animation kicks in (rotating phases `Reading trace · Scoring risks · Building remediation` for ~3-4 s). (c) 0:32 → 0:36 — verdict scrolls into view: **`<DecisionCard>`** with `BLOCKED` pill (rose), `<ExpectedVsActualBadge>` `Expected: BLOCKED · Gemini: BLOCKED · Match: yes` (emerald), `<PolicyGateBadge>` "destructive_without_approval triggered (+2 more)", **Copy audit report** + **Export verdict JSON** buttons next to it. (d) 0:36 → 0:42 — pan down to **`<InfrastructureProofCard>`** (`Backend: Vultr · Region: Frankfurt · Status: Online · Last audit latency: ~4 200 ms`) then **`<ProductionPoliciesCard>`** (5 rules: 3 fired in red, 2 still armed). (e) 0:42 → 0:46 — `<ReadinessComparison>` placeholder pops with **"Apply guardrails below to compute the After score"**. (f) 0:46 → 0:50 — **scroll back to the top** of the page: the **`<CockpitScoreboard>`** has bumped: `Runs audited: 1 · Blocked: 1 · High-risk calls blocked: 1 · Avg cost: $0.0014`. |
| **Captions** (rolling)| `scenario_trace mode` · `model: gemini-2.5-flash` · `verdict: BLOCKED` · `readinessScore: 18` · `policyGate.triggered: true` · `Match: yes` · `Backend: Vultr · fra` · `Last audit latency: 4 187 ms`                                                                                                                                                                                                                                  |
| **Transition** | Zoom out to architecture diagram.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Scene 4 — Sponsors integration (0:50 → 1:10) · 20 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **VO (EN)**   | "Each sponsor does what it's best at. Gemini 2.5 Flash powers the Planner with structured JSON output and the Worker with native function calling — ten typed tools, full anti-injection, real cost tracking from `usage_metadata`. Vultr hosts the runner: one Cloud Compute VM in Frankfurt, five dollars a month, cloud-init provisioning, zero SSH required to ship a fresh node. Vercel ships the UI and the proxy at the edge — secrets never leave the VM." |
| **VO (FR support)** | *« Chaque sponsor fait ce qu'il fait de mieux. Gemini 2.5 Flash anime le Planner en sortie JSON structurée et le Worker en function calling natif — dix outils typés, anti-injection complet, tracking de coût réel via `usage_metadata`. Vultr héberge le runner : une VM Cloud Compute à Francfort, 5 dollars par mois, provisioning par cloud-init, zéro SSH pour livrer un nouveau node. Vercel ship l'UI et le proxy en edge — les secrets ne quittent jamais la VM. »* |
| **On-screen** | (a) 0:50 → 0:55 — architecture diagram exported from `docs/ARCHITECTURE.md` (`07_arch.png`) with Vercel/Vultr/Gemini labels highlighted in sequence. (b) 0:55 → 1:02 — code cut-away on `runner/app/agents/worker.py` (function-calling loop) for 3 s, then `runner/app/main.py::enforce_runner_secret` (middleware) for 2 s, then `src/lib/runner/auth.ts::runnerHeaders` (Vercel side) for 2 s. (c) 1:02 → 1:10 — `scripts/vultr-provision.ps1 -DryRun` output (`08_provision.png`), then health check `curl http://136.244.89.159/health` returning 200, then smoke triple flash: `401 missing_runner_secret` → `401 invalid_runner_secret` → `200`. |
| **Captions**  | `Gemini · gemini-2.5-flash` · `Vultr · vc2-1c-2gb · fra` · `cloud-init · UFW 22/80/443` · `Vercel · /api/runner-proxy`                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Transition** | Cross-fade to business-value scene.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Scene 5 — Business value (1:10 → 1:25) · 15 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "What ArcadeOps unlocks: shipping autonomous agents in production with the same confidence we ship code. Three policy gates is what stands between a Gemini hallucination and a real customer email. That's the difference between a demo and a system you can run for paying customers." |
| **VO (FR support)** | *« Ce qu'ArcadeOps débloque : déployer des agents IA en prod avec la même confiance qu'un déploiement de code. Trois policy gates, c'est ce qui sépare une hallucination Gemini d'un vrai email client envoyé par erreur. C'est la différence entre une démo et un système exploitable pour de vrais clients payants. »* |
| **On-screen** | Split panel — left: the `BLOCKED` verdict frozen on screen with policy gates list; right: a stylized "post-guardrail" version showing `NEEDS_REVIEW` after applying `approval.request` and audit log (use the existing remediation simulation panel in the UI).                                                                                                                                                                            |
| **Caption**   | "Decision-grade observability for autonomous agents."                                                                                                                                                                                                                                                                                                                                                                                  |
| **Transition** | Fade to CTA.                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Scene 6 — Call to action (1:25 → 1:30) · 5 s

| Field         | Value                                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "Try the live demo. Read the code. **Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production.**"                                                                                                                                  |
| **VO (FR support)** | *« Essayez la démo live. Lisez le code. **Gemini juge. Vultr exécute. ArcadeOps bloque les agents IA dangereux avant la prod.** »*                                                                                                                          |
| **On-screen** | Two URLs stacked center: `arcadeops-control-tower-hackathon.vercel.app` and `github.com/Damso74/arcadeops-control-tower-hackathon`. Logos: Gemini · Vultr · Vercel. Optional small webcam inset of presenter waving.                                              |
| **Caption**   | "Built in 7 days for Milan AI Week 2026."                                                                                                                                                                                                                        |
| **Transition** | Hard cut to black, end card.                                                                                                                                                                                                                                     |
| **Punchline rule** | The bolded sentence ("Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production.") **must be the very last sentence spoken in the recording**. Silent post-roll only after that.                                              |

---

## End-card (post-roll, optional 2 s)

- Tagline one-liner: "Gemini judges. Vultr runs. ArcadeOps blocks
  unsafe autonomous agents before production."
- Author: **ArcadeOps Team**
- License: MIT
- Submission: Lablab.ai · Milan AI Week 2026

---

## Practical recording notes

- **UI gating reminder (cockpit V2 / hackathon-100).** In public prod
  the page lands on **scenario mode** and the green
  **⚡ Run live with ArcadeOps backend** button is **hidden** — the
  `NEXT_PUBLIC_LIVE_VULTR=0` kill-switch (decision §6-B) intentionally
  removes the 130 s/run path from the jury demo. The **only button to
  click during recording** is the purple **"Run Gemini judge"** in
  panel 3 — it judges the bundled scenario trace fixture in **about 4 s**
  via Gemini 2.5 Flash, which is exactly what scene 3 narrates. The
  Vultr live path is still implicitly proven by
  `<InfrastructureProofCard>` (Vultr region + last audit latency, polled
  from the same backend) — no need to actually run a 130 s job on
  camera. To re-enable the live launcher locally for an internal
  director's-cut, set `NEXT_PUBLIC_LIVE_VULTR=1` and restart the dev
  server.
- **Stepper anchor.** The sticky `<CockpitStepper>` (1 Pick / 2 Inspect /
  3 Decide) at the top of `/control-tower` highlights the active stage
  on scroll. Scene 1 frames it at stage 1, scene 3 at stage 3 — make
  sure the scroll position lands the active pill in frame.
- **Scoreboard reset.** Click the small **Reset** link on the
  `<CockpitScoreboard>` **before recording** so the audit counters
  start at zero — scene 3 closes on `Runs audited: 1`. If you want a
  more impressive scene 5, run the unsafe + safe + needs-review
  scenarios once before take, then reset for the take itself.
- **Sample loaders (pasted_trace).** The 3 sample loader buttons in
  `<PastedTraceInput>` (`Load unsafe CRM trace` / `Load safe research
  trace` / `Load multi-agent escalation trace`) are gated by
  `NEXT_PUBLIC_HACKATHON_MODE=cockpit_v6` (decision §6-C). They are
  optional in the main script but make a great director's-cut B-roll
  if the jury asks "what about a custom trace?" during Q&A.
- **Lower the screen brightness on the terminal** before recording —
  the UI white background will spike the histogram otherwise.
- **Pre-script the curl line** in clipboard. Live-typing burns 3 s of
  budget you don't have.
- **Mute system notifications.** The macOS / Windows ping is the
  fastest way to tank a hackathon submission.
- **Record at 60 fps if your encoder allows** — it makes the timeline
  scroll feel premium even on a $5 VM.
- **Stretch goal:** re-record scene 3 a second time with a `safe_research`
  scenario that returns `is_mocked=true` to demonstrate the runner
  fixture fallback. Use it as a director's-cut B-roll if the prod run
  is unstable on demo day.

## Timing summary

| Scene | Title           | Start | End  | Duration |
| ----- | --------------- | ----- | ---- | -------- |
| 1     | Hook            | 0:00  | 0:10 | 10 s     |
| 2     | Problem         | 0:10  | 0:25 | 15 s     |
| 3     | Solution (judge) | 0:25 | 0:50 | 25 s     |
| 4     | Sponsors        | 0:50  | 1:10 | 20 s     |
| 5     | Business value  | 1:10  | 1:25 | 15 s     |
| 6     | CTA             | 1:25  | 1:30 | 5 s      |
| **Total** |             |       |      | **90 s** |
