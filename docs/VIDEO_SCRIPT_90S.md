# 90-second jury video — storyboard

> **Goal:** in 90 seconds, prove that `Gemini runs the agent · Vultr
> executes the workflow · ArcadeOps decides if it can ship` is real,
> live and clickable. Bilingual notes — primary VO is **English**,
> French support text in italics underneath each scene for the recording
> session.

## Recording setup

- **Resolution:** 1920×1080, 30 fps, MP4 H.264, AAC audio.
- **Capture:** OBS or Loom screen-share at full resolution. Webcam
  inset is optional and only used in scene 6.
- **Two browser tabs prepared:**
  1. https://arcadeops-control-tower-hackathon.vercel.app
  2. https://github.com/Damso74/arcadeops-control-tower-hackathon
- **One terminal prepared** (PowerShell or any shell with `curl` + `jq`).
- **VS Code** open on `runner/app/agents/worker.py` and
  `src/lib/control-tower/policy-gates.ts` for the code cut-aways.
- Pre-warm the Vultr runner once (`curl http://140.82.35.52/health`)
  to avoid a cold-start in scene 3.

## Asset checklist (capture before recording)

| File                      | Subject                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `01_hero.png`             | Vercel UI hero with the tagline and "Run mission" CTA               |
| `02_problem.png`          | Slide / Figma frame: "Agents are powerful. Production is dangerous." |
| `03_curl.png`             | Terminal mid-curl with the `runner-proxy` request                   |
| `04_trace.png`            | UI evidence timeline showing PLANNER + WORKER steps                 |
| `05_verdict.png`          | UI verdict card showing `BLOCKED` + 3 policy gates                  |
| `06_costcard.png`         | UI panel highlighting `11 453 tokens` · `$0.001001` · `17.6 s`      |
| `07_arch.png`             | Mermaid architecture from `docs/ARCHITECTURE.md` exported as PNG    |
| `08_provision.png`        | `scripts/vultr-provision.ps1 -DryRun` output                        |

---

## Scene 1 — Hook (0:00 → 0:10) · 10 s

| Field         | Value                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship."                        |
| **VO (FR support)** | *« Gemini fait tourner l'agent. Vultr exécute le workflow. ArcadeOps décide s'il peut partir en prod. »* |
| **On-screen** | Hero shot of `https://arcadeops-control-tower-hackathon.vercel.app` with the tagline overlay (`01_hero.png`).  |
| **Lower third** | `arcadeops-control-tower-hackathon.vercel.app`                                                               |
| **Transition** | Hard cut to scene 2 on the last word.                                                                         |

## Scene 2 — Problem (0:10 → 0:25) · 15 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "AI agents now write to CRMs, send customer emails, take refund decisions. The hard part is no longer building the agent — it's deciding when a multi-agent run is actually safe to ship. Most teams ship on faith." |
| **VO (FR support)** | *« Les agents IA écrivent dans le CRM, envoient des mails clients, déclenchent des remboursements. Le vrai problème, ce n'est plus de construire l'agent — c'est de décider quand un run multi-agent peut vraiment partir en prod. Aujourd'hui, on ship à l'aveugle. »* |
| **On-screen** | Wide split-screen: left side — Figma slide "Agents are powerful. Production is dangerous." (`02_problem.png`). Right side — quick montage of CRM dashboard, mail client, Slack alert (any rights-cleared B-roll or Figma mock).                                                                                                                                          |
| **Caption**   | "Production gates are still missing for autonomous agents."                                                                                                                                                                                                                                                                                                            |
| **Transition** | Smooth zoom into the terminal.                                                                                                                                                                                                                                                                                                                                          |

## Scene 3 — Solution, live demo (0:25 → 0:50) · 25 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VO (EN)**   | "I'll prove it in one curl. Live mission to the Vercel proxy: a VIP customer threatens to churn after an SLA breach. Vercel forwards to a FastAPI runner on Vultr Frankfurt. The Planner produces a JSON plan with Gemini. The Worker calls real tools through Gemini function calling. Seven steps later, ArcadeOps' three policy gates fire: no destructive CRM write, no outbound email, prompt injection blocked. Verdict: BLOCKED — 17.6 seconds, 11,453 tokens, one-tenth of a cent. The agent did its job. We refused to ship its output." |
| **VO (FR support)** | *« Je le prouve en un curl. Mission live envoyée au proxy Vercel : un client VIP menace de churn après une violation de SLA. Vercel forwarde vers un runner FastAPI sur Vultr Francfort. Le Planner sort un plan JSON via Gemini. Le Worker appelle de vrais outils via le function calling Gemini. Sept étapes plus tard, les trois policy gates ArcadeOps tombent : pas d'écriture CRM destructive, pas d'email sortant sans review, prompt injection bloqué. Verdict : BLOCKED — 17,6 secondes, 11 453 tokens, un dixième de cent. L'agent a fait son job. On a refusé de shipper son output. »* |
| **On-screen** | (a) 0:25 → 0:30 — terminal foreground, type the `curl` command (already in clipboard, just paste). (b) 0:30 → 0:38 — switch to the Vercel UI, watch the `EventTimeline` populate live. (c) 0:38 → 0:45 — zoom on the verdict card showing `BLOCKED` and the 3 policy gates. (d) 0:45 → 0:50 — pull up the `ToolCallCard` for `crm.lookup` and highlight the prompt-injected `customer_note`.                                                                                                                                                                          |
| **Captions** (rolling)| `POST /api/runner-proxy` · `is_mocked: false` · `model: gemini-2.5-flash` · `verdict: BLOCKED` · `tokens_used: 11453` · `cost_usd: 0.001001` · `run_id: b06cb0f8…`                                                                                                                                                                                                                                                                                          |
| **Transition** | Zoom out to architecture diagram.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Scene 4 — Sponsors integration (0:50 → 1:10) · 20 s

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **VO (EN)**   | "Each sponsor does what it's best at. Gemini 2.5 Flash powers the Planner with structured JSON output and the Worker with native function calling — ten typed tools, full anti-injection, real cost tracking from `usage_metadata`. Vultr hosts the runner: one Cloud Compute VM in Frankfurt, five dollars a month, cloud-init provisioning, zero SSH required to ship a fresh node. Vercel ships the UI and the proxy at the edge — secrets never leave the VM." |
| **VO (FR support)** | *« Chaque sponsor fait ce qu'il fait de mieux. Gemini 2.5 Flash anime le Planner en sortie JSON structurée et le Worker en function calling natif — dix outils typés, anti-injection complet, tracking de coût réel via `usage_metadata`. Vultr héberge le runner : une VM Cloud Compute à Francfort, 5 dollars par mois, provisioning par cloud-init, zéro SSH pour livrer un nouveau node. Vercel ship l'UI et le proxy en edge — les secrets ne quittent jamais la VM. »* |
| **On-screen** | (a) 0:50 → 0:55 — architecture diagram exported from `docs/ARCHITECTURE.md` (`07_arch.png`) with Vercel/Vultr/Gemini labels highlighted in sequence. (b) 0:55 → 1:02 — code cut-away on `runner/app/agents/worker.py` (function-calling loop) for 4 s, then `runner/app/llm/gemini_client.py` (retry/timeout) for 3 s. (c) 1:02 → 1:10 — `scripts/vultr-provision.ps1 -DryRun` output (`08_provision.png`), then health check `curl http://140.82.35.52/health` returning 200.                                                              |
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
| **VO (EN)**   | "Try the live demo. Read the code. ArcadeOps Control Tower."                                                                                                                                                                                                     |
| **VO (FR support)** | *« Essayez la démo live. Lisez le code. ArcadeOps Control Tower. »*                                                                                                                                                                                          |
| **On-screen** | Two URLs stacked center: `arcadeops-control-tower-hackathon.vercel.app` and `github.com/Damso74/arcadeops-control-tower-hackathon`. Logos: Gemini · Vultr · Vercel. Optional small webcam inset of presenter waving.                                              |
| **Caption**   | "Built in 7 days for Milan AI Week 2026."                                                                                                                                                                                                                        |
| **Transition** | Hard cut to black, end card.                                                                                                                                                                                                                                     |

---

## End-card (post-roll, optional 2 s)

- Tagline one-liner: "Gemini runs the agent. Vultr executes the
  workflow. ArcadeOps decides if it can ship."
- Author placeholder: `[Your name]`
- License: MIT
- Submission: Lablab.ai · Milan AI Week 2026

---

## Practical recording notes

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
| 3     | Solution (live) | 0:25  | 0:50 | 25 s     |
| 4     | Sponsors        | 0:50  | 1:10 | 20 s     |
| 5     | Business value  | 1:10  | 1:25 | 15 s     |
| 6     | CTA             | 1:25  | 1:30 | 5 s      |
| **Total** |             |       |      | **90 s** |
