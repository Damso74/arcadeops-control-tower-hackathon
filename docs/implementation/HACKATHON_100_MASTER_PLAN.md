# HACKATHON 100/100 — Master Plan ArcadeOps Control Tower

> Cible : décrocher 100/100 à l'AI Agent Olympics / Milan AI Week (Lablab.ai), soumission **20 mai 2026**.
> Fenêtre disponible : **5 jours** (15 → 20 mai). Stack figée : Next.js 16.2.6 + React 19.2.4 + Tailwind v4 + lucide-react 1.14 + FastAPI runner Vultr `fra` + Gemini 2.5 Flash.
> Repo : `arcadeops-control-tower-hackathon/`. Prod : `https://arcadeops-control-tower-hackathon.vercel.app`.

---

## §1. Résumé exécutif

Le repo est **très en avance** sur ce que le backlog laisse penser. La quasi-totalité de la mécanique produit est déjà en place : 4 scénarios typés, 3 modes d'audit (`scenario_trace`, `pasted_trace`, `sample_replay`) + 1 mode `remediation_simulation`, policy-gates serveur (4 rules), verdict-consistency à 5 invariants, Gemini judge live avec sanitisation et rate-limit, badge Live/Replay, ReadinessComparison Before/After, CopyAuditReport, ArcadeOpsRuntimeSection avec architecture et "What Control Tower prevents", VIDEO_SCRIPT 90s + SUBMISSION_LABLAB + DECK 8 slides + HOW_TO_DEMO complets.

Ce qui manque pour passer de "très bon" à **100/100** est essentiellement de l'**orchestration UX** et du **polish narratif** : stepper sticky guidé, animation Gemini ticker (2-4s pendant l'appel), verdict immédiatement visible (scroll auto), Vultr Infrastructure Proof Card visible, 5 policies listées explicitement, mini-dashboard scoreboard, cover image, et migration de la punchline vers la version finale **« Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production. »**.

**Verdict global de faisabilité** : `FAISABLE AVEC COUPES` (voir §8). Aucun item P0-P1 n'est techniquement risqué. Les coupes portent sur des P2/P5 cosmétiques et un sous-ensemble du P4 backend (5ème policy rule, suite de tests Vitest/Playwright complète).

---

## §2. Cartographie réelle

### 2.1 Stack et structure

- Frontend : **Next.js 16.2.6 App Router**, React 19.2.4, Tailwind v4, lucide-react 1.14, TypeScript strict. Aucune dépendance lourde non-essentielle (zéro Supabase, zéro Prisma, zéro state manager).
- Routes API : `/api/health`, `/api/capabilities`, `/api/gemini/judge`, `/api/replay`, `/api/arcadeops/run` (SSE compat layer Vultr), `/api/runner-proxy` (plain JSON fallback).
- Backend FastAPI Python 3.12 dans `runner/` (Vultr VM `136.244.89.159`, Frankfurt `fra`, `vc2-1c-2gb` $5/mo), middleware `x-runner-secret` (kill-switch `RUNNER_REQUIRE_SECRET=1`), Planner + Worker agents Gemini 2.5 Flash function calling sur 10 outils typés.
- Scripts : `vultr-provision.ps1` / `vultr-cloud-init.yaml.template` / `pre-demo-check.ps1`.
- Pas de suite de tests automatisés (`tests/` absent). Smoke = manuel via browser MCP + `pre-demo-check.ps1` + une trace `prod-deploy-snapshot.txt`.

### 2.2 État effectif vs backlog — ce qui marche / ce qui boîte

#### Ce qui marche solidement
- **Pipeline verdict** : Gemini → `applyProductionPolicyGates` (4 rules) → `enforceVerdictConsistency` (5 invariants) → ne peut **jamais** rendre un état contradictoire visible. Architecture **propre**.
- **Scénarios** : 4 traces typées (`scenarios.ts`), tone/risk/agent/tool/durationMs/expectedVerdict, `recommendedDemoPath` flaggé sur `multi_agent_escalation`, traces "READY" formulées en positif (anti faux-négatif Gemini).
- **Live Vultr + Gemini** : 23.44s / 16322 tokens / $0.001424 prouvé en prod (smoke `2026-05-13`).
- **Fallback déterministe** : `demo-run.json` toujours servi sans crash si Gemini KO.
- **Copy audit report** : format texte structuré aligné avec le backlog (Verdict / Readiness / Next action / Production gates / Critical risks / Missing evidence / Recommended remediation).
- **Doc submission** : `SUBMISSION_LABLAB.md`, `VIDEO_SCRIPT_90S.md`, `DECK_OUTLINE.md` 8 slides, `HOW_TO_DEMO.md` 60s.
- **Punchline actuelle** (`Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship.`) — **propre mais à migrer vers la nouvelle version** (§6 décision A).

#### Ce qui boîte (à fixer en P0/P1)
- **Hero `/control-tower`** : déjà compact 3 lignes + flowstep numéroté, **mais** pas de **top-bar sticky avec stepper guidé** comme demandé. La frise `1 · Pick → 2 · Inspect → 3 · Decide` existe dans le texte du hero, pas comme stepper navigable.
- **Trop de modes d'entrée** : 4 scénarios + 1 PasteCard + 1 ReplayLink discret = **6 affordances dans le picker**, ce qui dilue le message. L'utilisateur lablab tombe sur le picker et hésite. Le ReplayLink est largement obsolète depuis que `multi_agent_escalation` (avec `recommendedDemoPath`) couvre la vidéo officielle.
- **Verdict pas visible immédiatement** : le `GeminiJudgePanel` rend le verdict **dans le panel 3** ; après clic depuis le picker en haut, sur 1080p le verdict tombe sous la fold. Pas de `scrollIntoView` automatique.
- **Animation Gemini** : actuellement spinner + texte `Auditing run…` — pas le ticker 2-4s narratif demandé par le backlog (`Reading agent trace... → Checking tool calls... → Detecting external side effects... → Applying production policies... → Generating Gemini verdict...`).
- **Vultr Infrastructure Proof Card** : `ArcadeOpsRuntimeSection` est utile mais en **bas de page** et ne montre **pas** explicitement `Backend runner: Vultr / Runtime: Docker+FastAPI / Status: Online / Health: OK / Last audit latency: 1.2s`. Le `health` endpoint existe (`/api/health`) mais l'UI n'en lit pas le statut en live.
- **5 policies non listées** : le code en a 4 (frontend) ou 3 (backend Vultr verdict). Le backlog en veut **5 listées explicitement dans l'UI**. Aucun bloc UI dédié.
- **Before/After Comparison** : présent dans `ReadinessComparison`, mais rendu **seulement après ouverture du Guardrails Panel**. Le backlog veut Before/After comme bloc structurel proche du verdict.
- **CTAs scenarios hétérogènes** : `Audit unsafe run` (critical) / `Review this run` (medium) / `Audit this run` (low/ready). Backlog veut **uniformiser tous à "Audit this run"**.
- **Mini dashboard score haut cockpit** : inexistant.
- **Onglets internes `Summary | Evidence | Trace | Report | Architecture`** : inexistants.
- **Export verdict JSON** : inexistant (juste Copy text report).
- **Cover image** : `public/` ne contient que les SVG Next.js par défaut. Aucune cover hackathon.
- **Tests automatisés** : zéro. Suite Vitest/Playwright manquante.
- **Punchline** : version 1 figée partout, migration vers V2 pas faite.

#### Hors scope / piège à éviter
- **Mode "Live ArcadeOps" via runner Vultr+Gemini live (130s/run)** — exposé dans le DemoMissionLauncher comme bouton vert `⚡ Run live with ArcadeOps backend`. AGENTS.md dit explicitement « masqué en prod publique car 130s par run trop long pour démo jury, vidéo officielle filme uniquement Replay ». **Contradiction à trancher (§6 décision B)** : aujourd'hui le bouton vert est affiché dès que `RUNNER_URL` est set (donc actuellement visible en prod). Recommandation : masquage via kill-switch `NEXT_PUBLIC_LIVE_VULTR=0` par défaut, mode visible seulement pour démo interne.

### 2.3 Fichiers clés du repo (références pour les lots)

| Zone | Fichier(s) |
|------|------|
| Page principale cockpit | `src/app/control-tower/page.tsx` |
| Orchestrateur UI (state machine 3 modes) | `src/components/control-tower/ControlTowerExperience.tsx` |
| Picker scenarios + CTA | `src/components/control-tower/TraceScenarioPicker.tsx` |
| Panel Gemini judge (DecisionCard / Spinner / CopyAudit) | `src/components/control-tower/GeminiJudgePanel.tsx` |
| Données scénarios + traces + evidence + snapshot | `src/lib/control-tower/scenarios.ts` |
| Pipeline verdict (4 rules) | `src/lib/control-tower/policy-gates.ts` |
| Coherence layer (5 invariants) | `src/lib/control-tower/verdict-consistency.ts` |
| Before/After Card | `src/components/control-tower/ReadinessComparison.tsx` |
| Guardrails simulation | `src/components/control-tower/GuardrailsPanel.tsx` |
| Evidence timeline | `src/components/control-tower/ScenarioEvidenceTimeline.tsx` |
| Observability Panel (compact + full) | `src/components/control-tower/ObservabilityPanel.tsx` |
| Pasted trace input | `src/components/control-tower/PastedTraceInput.tsx` |
| Replay SSE launcher (Vultr Live) | `src/components/control-tower/DemoMissionLauncher.tsx` |
| Architecture / ArcadeOps Runtime section | `src/components/control-tower/ArcadeOpsRuntimeSection.tsx` |
| API Gemini judge | `src/app/api/gemini/judge/route.ts` |
| API capabilities runtime | `src/app/api/capabilities/route.ts` |
| API health | `src/app/api/health/route.ts` |
| Landing | `src/app/page.tsx` |
| Backend FastAPI runner | `runner/app/main.py`, `runner/app/orchestrator.py`, `runner/app/agents/*.py` |
| Fixture fallback | `src/data/demo-run.json`, `runner/app/fixtures/vip_churn_trace.json` |
| Submission | `docs/SUBMISSION_LABLAB.md`, `docs/VIDEO_SCRIPT_90S.md`, `docs/DECK_OUTLINE.md`, `docs/HOW_TO_DEMO.md`, `README.md` |

---

## §3. Tableau de croisement backlog × code (55 items)

> Légende : **Fait** = couvert solidement / **Partiel** = présent mais delta vs backlog / **À faire** = vrai manque / **Hors scope** = à écarter (5 jours, dilution, ou contradiction décidée).
> Effort : `XS` < 30 min, `S` 30 min – 2h, `M` 2h – 4h, `L` ½ jour, `XL` ≥ 1 jour.
> Priorité finale : `P0` indispensable / `P1` fort levier / `P2` polish / `Cut` écarté.

| # | Item backlog | État | Preuve code | Effort | Priorité finale |
|---|---|---|---|---|---|
| 1 | Cockpit guidé `/control-tower` (top-bar sticky, stepper 3 étapes, layout gauche/droite) | À faire | `src/app/control-tower/page.tsx` n'a pas de top-bar sticky ; layout flat colonnes ; `ControlTowerExperience.tsx` ordonné en stack vertical | M | P0 |
| 2 | Hero compact `/control-tower` (3 lignes max) | Partiel | `page.tsx` lignes 42-80 : déjà 3 lignes + flowstep + 3 badges, mais peut encore être resserré (CTA d'entrée manquant) | S | P0 |
| 3 | Uniformiser CTA scénarios → "Audit this run" | Partiel | `TraceScenarioPicker.tsx` `ctaLabel()` : critical→"Audit unsafe run", medium→"Review this run", low→"Audit this run" | XS | P0 |
| 4 | Fiabiliser "Needs-review support agent" (carte active, preuves changent, métriques changent, verdict précédent disparaît) | Partiel | `ControlTowerExperience.tsx` wipe `judgeBefore`/`judgeAfter` sur changement scénario ; mais snapshot/observability/evidence sont déjà spécifiques | S | P0 |
| 5 | Verdict visible immédiatement (scroll auto OU panel droite OU remplacement bouton par carte verdict) | À faire | Pas de `scrollIntoView` ni layout 2 colonnes dans `ControlTowerExperience.tsx` | S | P0 |
| 6 | Animation jugement Gemini 2-4s avec ticker (`Reading agent trace... → Checking tool calls... → ...`) | À faire | `GeminiJudgePanel.tsx` ligne 224 : juste `<Spinner /> Auditing run…` | S | P0 |
| 7 | 3 verdicts SHIP / NEEDS REVIEW / BLOCKED + sous-labels (`Ready with monitoring` / `Human approval required` / `Do not ship`) | Fait | `GeminiJudgePanel.tsx::verdictPalette` lignes 944-986 — labels conformes | — | — |
| 8 | Before/After ArcadeOps placé très haut ou juste après le verdict | Partiel | `ReadinessComparison.tsx` rendu seulement après ouverture `GuardrailsPanel` (`judgeBefore && judgeAfter`) | S | P0 |
| 9 | Vultr Infrastructure Proof Card (`Backend: Vultr / Runtime: Docker+FastAPI / Status: Online / Health endpoint: OK / Last audit latency: 1.2s`) | À faire | `ArcadeOpsRuntimeSection.tsx` montre l'archi mais aucune carte "Vultr Infrastructure" dédiée + état live | M | P0 |
| 10 | Gemini live/replay clair (toggle `[Live Gemini] [Deterministic replay]`, badge `gemini-2.5-flash`, latency) | Fait | `GeminiJudgePanel.tsx::JudgeModeBadge` lignes 893-913 + model affiché ligne 193-197 + capabilities API | — | — |
| 11 | Onglets internes cockpit `Summary | Evidence | Trace | Report | Architecture` | À faire | Aucun onglet dans `ControlTowerExperience.tsx` ; tout est rendu en stack vertical | L | P1 |
| 12 | "Load sample trace" enrichi (Load unsafe CRM / Load safe research / Load custom JSON / Clear / Audit pasted) + validation JSON | Partiel | `PastedTraceInput.tsx` : seulement bouton "Load unsafe example" + Clear ; pas de "Load safe" ni "Load custom JSON" | S | P1 |
| 13 | Rapport copiable propre (`ArcadeOps Production Gate Report / Decision / Readiness / Run type / Mode / Key findings / Policy violations / Next action`) | Fait | `GeminiJudgePanel.tsx::formatAuditReport` lignes 650-703 — format conforme | — | — |
| 14 | Section "Why enterprises need this" (4 lignes) | Partiel | `ArcadeOpsRuntimeSection.tsx` lignes 109-140 : bloc "Business impact / What Control Tower prevents" — proche, mais à reformuler "Why enterprises need this" + remonter dans la page | XS | P1 |
| 15 | Politiques de production visibles (5 policies listées) | À faire | `policy-gates.ts` RULES = 4 ; aucun rendu UI explicite hors `PolicyGateBadge` post-trigger | S | P1 |
| 16 | Timeline visuelle multi-agent (`CEO → Support → CRM → Email → Control Tower → Gemini Judge`) | Partiel | `ScenarioEvidenceTimeline.tsx` montre les agents (chip `entry.agent`) mais flow horizontal absent ; existe partiellement dans `ArcadeOpsRuntimeSection::ARCH_NODES` | S | P1 |
| 17 | Distinction claire `ArcadeOps Runtime / Control Tower / Gemini Judge / Policy Gate` | Partiel | `ArcadeOpsRuntimeSection::ARCH_NODES` couvre, mais en bas de page | XS | P1 |
| 18 | Mode "demo script" intégré (bandeau `Recommended demo path: 1. Audit critical CRM run → 2. Watch Gemini block it → 3. Audit safe research run → 4. Watch it ship with monitoring`) | Partiel | `TraceScenarioPicker.tsx` ligne 161-166 : badge "Recommended demo path" sur critical ; pas de bandeau pédagogique explicite | S | P1 |
| 19 | Améliorer micro-copies des 3 cartes scénarios | Partiel | `TraceScenarioPicker.tsx::secondaryDescription()` 1-ligne par scénario — vague pour `needs_review` ; peut être affiné | XS | P1 |
| 20 | Corriger typos (`Prodution-ready`, `Producing gate`, cohérence `ArcadeOps`/`Arcadeops`, `sub-agents`) | Fait | grep insensitive `Prodution|Producing gate` = 0 occurrences ; `Arcadeops` cassé n'apparaît jamais comme typo (toujours `ArcadeOps`) | XS | P2 |
| 21 | Mini dashboard score haut cockpit (`Runs audited: X / Blocked: Y / Needs review: Z / Shipped: W / Avg cost / High-risk tool calls blocked`) | À faire | Aucun dashboard counter, pas de localStorage ni state global | M | P1 |
| 22 | État "policy simulation" pre-Gemini (`Pre-check result: 3 policy violations detected before Gemini review`) | À faire | `detectProductionPolicyGates` est pure, mais appelée seulement post-Gemini dans la route ; pas exposée UI | S | P2 |
| 23 | Score détaillé en sous-scores (Trace completeness / Approval safety / Tool risk / Cost control / Production readiness) | Hors scope | Demande retravailler le prompt Gemini + UI dédiée ; coût/bénéfice insuffisant en 5 jours | L | Cut |
| 24 | Punchline "Logs tell you what happened. ArcadeOps decides whether what happened is safe enough to ship." | À faire | Punchline actuelle = "Gemini runs the agent...". Cette punchline secondaire peut servir de second slogan dans le landing | XS | P2 |
| 25 | Comparaison Traditional observability vs Agent control | Hors scope | Nouveau bloc UI dense, peu de levier pour le score jury vs effort | M | Cut |
| 26 | Carte Enterprise use cases (Customer support / Sales-CRM / Research) | À faire | Inexistant ; peut servir d'ancrage business | S | P2 |
| 27 | Bouton "Export verdict JSON" en plus de "Copy report" | À faire | `GeminiJudgePanel.tsx` n'a pas de download blob JSON | XS | P2 |
| 28 | États vides propres (aucun scénario, audit en cours, terminé, trace invalide, backend indisponible, Gemini fallback, Vultr health KO) | Partiel | États idle/loading/ready/error présents (`GeminiJudgePanel::JudgeState`) ; Vultr health KO + scenario non sélectionné déjà OK ; Gemini KO renvoie `GEMINI_NOT_CONFIGURED` UI ; reste à harmoniser | S | P2 |
| 29 | Limite taille custom trace 100 KB avec message d'erreur | Partiel | `PastedTraceInput.tsx` cap 12 000 chars ≈ 12 KB ; le backlog parle de 100 KB mais 12 KB est suffisant pour la démo. Message d'erreur déjà affiché | XS | P2 |
| 30 | Vraie preuve backend (`GET /api/health 200 OK` + `POST /api/judge` + UI `Vultr API status: Online / Last health check: timestamp`) | Partiel | `/api/health` existe mais UI ne le poll pas ; lié à item #9 | S | P0 (mergé avec #9) |
| 31 | Cover image plus claire | À faire | `public/` ne contient que `next.svg`/`vercel.svg`/etc. | M | P0 (submission) |
| 32 | Vidéo 90s ultra cadrée (script 0-10s problem / 10-25s unsafe run / ...) | Partiel | `VIDEO_SCRIPT_90S.md` complet mais à mettre à jour avec nouvelle UX (stepper, animation Gemini, mini-dashboard, Vultr Proof) | S | P0 (submission) |
| 33 | Slides 6 pages (Problem / Solution / Demo flow / Architecture / Why it matters / Impact) | Partiel | `DECK_OUTLINE.md` = 8 slides — à condenser à 6 et aligner sur la nouvelle UX | S | P0 (submission) |
| 34 | Long description lablab orientée business | Fait | `SUBMISSION_LABLAB.md` complet — relire et migrer punchline | S | P0 (submission) |
| 35 | Short description | Fait | `SUBMISSION_LABLAB.md` lignes 11-21 | — | — |
| 36 | Tagline | Fait | `SUBMISSION_LABLAB.md` ligne 9 (109 chars) | — | — |
| 37 | Tech tags | À vérifier | Pas vu de liste explicite | XS | P2 |
| 38 | Vrai endpoint `/api/judge` avec contrat I/O JSON typé | Fait | `/api/gemini/judge` (chemin différent du backlog mais sémantique = OK), schéma typé `JudgeRequestBody` / `GeminiJudgeResult` / `JudgeErrorResponse` | — | — |
| 39 | Validation server-side (pas seulement client) | Fait | `sanitizePastedTrace`, `sanitizeSnapshot`, `sanitizeGuardrails`, `sanitizeMission`, rate-limit serveur 5/10min, cap 12k chars | — | — |
| 40 | Fallback déterministe propre avec UI message clair (`Demo running in deterministic replay mode. Set GEMINI_API_KEY to enable live Gemini audit.`) | Partiel | `GeminiJudgePanel.tsx` lignes 152-175 affiche un message proche mais à reformuler exactement comme demandé | XS | P1 |
| 41 | Policy engine minimal 5 rules (noDestructiveActionWithoutApproval, noOutboundMessageWithoutReview, requireReplayId, requireCompleteAuditTrail, requireCostBudget) | Partiel | `policy-gates.ts` = 4 rules. La 3ème (`write_without_audit_or_replay`) couvre 2 sur 5 du backlog. Le 5ème (`cost_budget_exceeded`) existe. Manque rule séparée `requireReplayId` (couverte par #3 actuellement). **Décision : garder 4 rules, ajouter une 5ème `require_replay_id` séparée pour aligner sur le narratif** | S | P1 |
| 42 | Traces typées `Evidence = { id, severity, category, agent, tool?, message }` | Fait | `scenarios.ts::ScenarioEvidence` lignes 27-55 + `gemini-types.ts::GeminiRisk` | — | — |
| 43 | Tests simples (critical → BLOCKED, safe → SHIP, support → NEEDS_REVIEW, invalid trace → validation error, missing Gemini key → replay) | Hors scope | Pas de Vitest/Playwright installés. Mise en place coûteuse en 5j. **Tests = smoke browser MCP + `pre-demo-check.ps1`** | L | Cut |
| 44 | README "How it works" (Problem / Demo / Architecture / How Gemini used / How Vultr used / Local setup / ENV / API contract / Future) | Fait | `README.md` ~380 lignes couvre tout ; à relire + migrer punchline | S | P0 (submission) |
| 45 | Jauge 0-39 rouge / 40-79 jaune / 80-100 vert avec gros label | Partiel | `ScoreDial` dans `GeminiJudgePanel.tsx` lignes 735-770 — bonnes couleurs via `verdictPalette` mais label "Readiness" petit ; pas de "BLOCKED / REVIEW / SHIP" géant à côté | XS | P2 |
| 46 | "Expected vs actual" (`Expected: BLOCKED / Gemini: BLOCKED / Match: yes`) | À faire | `expectedVerdict` existe dans `scenarios.ts` mais pas affiché post-run | S | P2 |
| 47 | Risques high en premier dans Evidence | Fait | `JudgeResultView` ligne 283-285 `sortedRisks` trie par severity | — | — |
| 48 | Icônes explicites par catégorie | Fait | `ScenarioEvidenceTimeline::renderEvidenceIcon` + `RiskCard` | — | — |
| 49 | Responsive mobile/tablette | À vérifier | Tailwind classes sm/md/lg présentes ; smoke browser MCP requis | S | P2 |
| 50 | Raccourcis clavier (`1/2/3` sélectionne scénario, `Enter` run judge) | Hors scope | Nice-to-have, faible levier jury vs coût | S | Cut |
| 51 | Ne PAS ajouter trop de features (auth, billing, marketplace) | Fait | Aucune feature de ce type, scope tenu | — | — |
| 52 | Ne PAS faire 10 pages (garder `/` + `/control-tower` + `/api/health` + `/api/judge`) | Fait | Routes app : `/`, `/control-tower`, `/api/health`, `/api/capabilities`, `/api/gemini/judge`, `/api/replay`, `/api/arcadeops/run`, `/api/runner-proxy` — bornes acceptables | — | — |
| 53 | Ne PAS trop montrer de JSON au début | Fait | Aucun JSON brut dans le picker ; JSON apparaît uniquement dans "View full audit details" disclosure | — | — |
| 54 | Ne PAS faire croire que Gemini remplace la sécurité (positionnement : Gemini audits and explains, ArcadeOps enforces policies) | Fait | `GeminiJudgePanel.tsx` ligne 565-568 dit explicitement "Gemini provided the audit. ArcadeOps applied non-negotiable production gates." | — | — |
| 55 | Ne PAS présenter comme observability dashboard (c'est un production gate avec décision opérationnelle) | Fait | Tous les copy parlent de "production gate", "block before ship", jamais "dashboard" | — | — |

### 3.bis Synthèse compteurs

- **Fait** : 14 items (#7, #10, #13, #20, #34-36, #38-39, #42, #44, #47-48, #51-55)
- **Partiel à corriger** : 18 items (#2-4, #8, #14, #16-19, #28-30, #32-33, #40-41, #45, #49)
- **À faire** : 17 items (#1, #5-6, #9, #11-12, #15, #21-22, #24, #26-27, #31, #37, #46)
- **Hors scope (Cut)** : 4 items (#23, #25, #43, #50)
- **Non comptés** (auto-vérifiés ok) : 2 items (#37 tech tags rapide / #49 responsive smoke)

---

## §4. Distinction systématique solide / fragile / manque / polish

### 4.1 **SOLIDE** (ne pas toucher, c'est notre socle)
- Pipeline `policy-gates.ts` (4 rules) + `verdict-consistency.ts` (5 invariants) — comportement déterministe garanti.
- Route `/api/gemini/judge` (sanitisation, rate-limit, 4 modes, fallback, debug metadata).
- Backend FastAPI Vultr + middleware `x-runner-secret` + cloud-init.
- Fixture `demo-run.json` comme kill-switch obligatoire.
- ReadinessComparison Before/After (mécanique solide, juste à mieux placer).
- CopyAuditReport (format conforme).
- VerdictPalette + sous-labels (`Ready with monitoring` / `Needs review` / `Blocked — do not ship`).
- ArcadeOpsRuntimeSection (architecture flow, runtime bullets, business impact).

### 4.2 **FRAGILE** (à consolider avant le polish)
- **6 affordances dans le picker** (4 scenarios + paste + replay link) — risque de dilution UX. Décision §6-C requise.
- **Verdict hors viewport après clic** — UX failure point #1 sur 1080p.
- **Mode "Live ArcadeOps" affiché en prod** — contradiction AGENTS.md, à kill-switcher (§6-B).
- **Pas d'auto-refresh `/api/health` UI** — perception de site statique.
- **`ReadinessComparison` enterré dans `GuardrailsPanel`** — la wow moment doit être disponible plus tôt.
- **Tests automatisés absents** — refactor risqué si on touche le moteur d'état (`ControlTowerExperience`).

### 4.3 **MANQUE** (vrais trous fonctionnels)
- Animation Gemini ticker (P0#6).
- Vultr Infrastructure Proof Card (P0#9).
- Stepper sticky (P0#1).
- 5 policies listées explicitement (P1#15).
- Mini dashboard scoreboard (P1#21).
- Onglets internes (P1#11).
- Cover image submission (P0#31).
- Export JSON verdict (P2#27).
- "Why enterprises need this" remonté + reformulé (P1#14).
- Expected vs Actual (P2#46).

### 4.4 **POLISH** (touche finale jury)
- Uniformiser CTA scénarios (P0#3).
- Resserrer hero (P0#2).
- Améliorer micro-copies des 3 cartes scénarios (P1#19).
- Bandeau "Recommended demo path: 1→2→3→4" (P1#18).
- Reformuler fallback Gemini KO (P1#40).
- Jauge avec gros label `BLOCKED / REVIEW / SHIP` (P2#45).
- Enterprise use cases mini-card (P2#26).
- Punchline secondaire "Logs tell you... ArcadeOps decides..." (P2#24).

---

## §5. Plan d'exécution — Lots groupés en 4 blocs (12 lots Lot 1 → Lot 12)

> Ordre obligatoire : **Bloc 1 (UX guidée)** → **Bloc 2 (Démo qui claque)** → **Bloc 3 (Gemini+Vultr crédibles)** → **Bloc 4 (Polish submission)**. Pas de saut.
> Chaque lot inclut : objectif, fichiers exacts, changements précis, risques de régression, tests à faire, critères d'acceptation, dépendances.
> **Gates par lot** : `npx tsc --noEmit` + `npm run lint` + `npm run build` + smoke `cursor-ide-browser` MCP + commit + push.

### Bloc 1 — UX guidée (J-5 → J-4) — 4 lots

**12 améliorations à mettre en exergue ici** : cockpit guidé, stepper réel, 3 scénarios fiables (réduction de 6→4 modes), verdict immédiatement visible (scroll auto), CTA uniformisé, Recommended demo path bandeau.

---

#### **Lot 1a — Réduction 6→4 modes + uniformisation CTA + verdict scrollIntoView**

| Champ | Détail |
|---|---|
| Objectif | Le picker n'expose plus que 3 scénarios + 1 paste. Le ReplayLink est masqué (mode `Live Vultr` accessible via env, voir §6-B). Tous les CTA scenarios disent "Audit this run". Au clic d'un scénario, le focus saute sur le verdict après audit. |
| Fichiers | `src/components/control-tower/TraceScenarioPicker.tsx`, `src/components/control-tower/ControlTowerExperience.tsx`, `src/app/control-tower/page.tsx` |
| Changements | (1) `TraceScenarioPicker::ctaLabel` retourne `"Audit this run"` pour les 3 niveaux risk. (2) `ReplayLink` rendu conditionné à `process.env.NEXT_PUBLIC_LIVE_VULTR === "1"` (default off). (3) `ControlTowerExperience` : ajout d'un `useRef` sur la section `Gemini Judge` + `scrollIntoView({behavior:"smooth", block:"start"})` après réception du premier `judgeBefore`. |
| Risques régression | Tests visuels : ne pas casser le focus initial sur `multi_agent_escalation` ; ne pas casser le mode `pasted` qui réutilise le PasteCard. |
| Tests | Smoke browser MCP : pick critical → Run Gemini judge → vérifier verdict visible sans scroll manuel. Pick safe → idem. Pick pasted → coller trace → idem. |
| Critères d'acceptation | 4 affordances dans le picker, 0 différence de wording sur les 3 CTAs, verdict visible immédiatement post-audit. |
| Dépendances | Aucune. |

---

#### **Lot 1b — Animation Gemini ticker (2-4s) + reformulation fallback**

| Champ | Détail |
|---|---|
| Objectif | Pendant l'appel Gemini (3-15s réels), afficher un ticker progressif des 5 étapes (`Reading agent trace... → Checking tool calls... → Detecting external side effects... → Applying production policies... → Generating Gemini verdict...`). Reformuler le message Gemini KO. |
| Fichiers | `src/components/control-tower/GeminiJudgePanel.tsx` |
| Changements | (1) Remplacer `<Spinner /> Auditing run…` par un sous-composant `<GeminiTicker />` qui cycle un `setInterval` toutes ~600ms sur 5 messages (purement décoratif, l'audit serveur reste l'horloge maître). Le ticker tourne en boucle jusqu'à réception du résultat. (2) `available === false` : reformuler le copy en `Demo running in deterministic replay mode. Set GEMINI_API_KEY to enable live Gemini audit.` (P1#40). |
| Risques régression | Le `setInterval` doit être nettoyé sur `state.status !== "loading"` et au démontage (sinon fuite mémoire). |
| Tests | Smoke : observer 2-4s d'animation pendant un audit live. Vérifier que le ticker disparaît à `state === "ready"` ou `state === "error"`. |
| Critères d'acceptation | Le ticker tourne 2-4s minimum (cap soft à 2s même si Gemini répond plus vite), 5 messages visibles cycliquement, cleanup ok. |
| Dépendances | Lot 1a. |

---

#### **Lot 1c — Stepper sticky 3 étapes en top-bar**

| Champ | Détail |
|---|---|
| Objectif | Top-bar fixe (`sticky top-0 z-20`) avec 3 étapes (1 · Pick / 2 · Inspect / 3 · Decide) cliquables qui scrollent vers la section correspondante + indicateur d'étape courante calculé via `IntersectionObserver`. |
| Fichiers | `src/app/control-tower/page.tsx`, `src/components/control-tower/ControlTowerExperience.tsx`, nouveau composant `src/components/control-tower/CockpitStepper.tsx` |
| Changements | (1) Créer `CockpitStepper.tsx` : 3 chips cliquables avec ancres `#pick / #evidence / #decide`. (2) Sections de `ControlTowerExperience` reçoivent `id="pick" / id="evidence" / id="decide"`. (3) Ajouter `IntersectionObserver` pour highlighter l'étape active. (4) Stepper placé dans `page.tsx` au-dessus de `<ControlTowerExperience>`, en `sticky top-0 backdrop-blur`. |
| Risques régression | Z-index conflict avec le hero ; sur mobile le stepper doit rester compact (chips icon-only sous 640px). |
| Tests | Smoke desktop + mobile (Cursor browser MCP iPhone viewport) : scroll → l'étape active doit changer. Clic stepper → scroll vers section. |
| Critères d'acceptation | Stepper visible en permanence pendant le scroll, état actif cohérent avec la section visible, fonctionne mobile. |
| Dépendances | Lot 1a (sections id-ed). |

---

#### **Lot 1d — Hero `/control-tower` resserré + CTA d'entrée + bandeau Recommended demo path**

| Champ | Détail |
|---|---|
| Objectif | Hero réduit à 3 lignes max (titre / sous-titre / flowstep), suppression des 3 badges en-dessous (transférés ailleurs), ajout d'un bandeau pédagogique sous le stepper : `Recommended demo path: 1. Audit critical CRM run → 2. Watch Gemini block it → 3. Audit safe research run → 4. Watch it ship with monitoring`. |
| Fichiers | `src/app/control-tower/page.tsx`, nouveau composant `src/components/control-tower/RecommendedDemoBanner.tsx` |
| Changements | (1) `page.tsx::Badge` 3 occurrences supprimées du hero, replacées dans un mini block `MetaBadges` plus discret en haut de la section `Architecture` en bas (ou supprimées si redondantes). (2) Hero garde uniquement titre + 1 sous-titre + flowstep numéroté. (3) Nouveau `RecommendedDemoBanner` : 1 ligne 4 étapes inline avec icônes, dismissible (localStorage). |
| Risques régression | Le titre doit rester accessible (h1) ; vérifier que le SEO `metadata` reste cohérent. |
| Tests | Smoke browser MCP : vérifier hero ≤ 3 lignes sur 1280px, bandeau visible juste sous le stepper, dismiss persiste au reload. |
| Critères d'acceptation | Premier viewport montre hero + stepper + bandeau + début du picker sans scroll sur 1080p. |
| Dépendances | Lot 1c (stepper en place). |

---

### Bloc 2 — Démo qui claque (J-4 fin → J-3) — 3 lots

**12 améliorations couvertes ici** : Before/After remonté + Vultr Status Card + Copy audit report (déjà fait, validation) + Custom trace samples enrichis.

---

#### **Lot 2a — Vultr Infrastructure Proof Card + health polling**

| Champ | Détail |
|---|---|
| Objectif | Carte dédiée `Infrastructure proof` placée **juste sous le verdict** (DecisionCard) qui affiche : Backend runner: Vultr · Runtime: Docker+FastAPI · Region: fra (Frankfurt) · Status: Online (live polling de `/api/health` toutes 30s) · Last audit latency: X.X s (tiré de `usage_metadata.latencyMs` de la dernière trace). |
| Fichiers | Nouveau composant `src/components/control-tower/InfrastructureProofCard.tsx`, intégration dans `GeminiJudgePanel.tsx` (juste après `<DecisionCard>`), nouveau endpoint helper `src/lib/control-tower/health-probe.ts` (côté client) |
| Changements | (1) `InfrastructureProofCard` poll `GET /api/health` toutes 30s avec `useEffect` + `setInterval`, lit `geminiConfigured` + `uptimeSeconds` + on étend le `health` endpoint pour exposer aussi `vultrRunnerConfigured: Boolean(process.env.RUNNER_URL?.trim())`. (2) Status visuel : pastille verte/orange/rouge. (3) Latency = transmise via prop depuis le `GeminiJudgeResult` (à enrichir si non présent, calculée à partir de `usage_metadata.totalTokens` si manquant, fallback `1.2s` documenté). |
| Risques régression | Polling 30s sur Vercel = 2880 req/jour, OK pour le free tier. Cleanup interval au démontage. |
| Tests | Smoke browser MCP : observer la pastille verte au mount, simuler une coupure (mock fetch fail) → pastille orange. |
| Critères d'acceptation | Carte visible immédiatement sous le verdict, état Online en prod, ne crash pas si health endpoint répond 500. |
| Dépendances | Lot 1a (verdict scrollIntoView). |

---

#### **Lot 2b — Before/After remonté + 5 policies listées dans carte dédiée**

| Champ | Détail |
|---|---|
| Objectif | (1) `ReadinessComparison` peut s'afficher dès le premier audit (sans attendre la `GuardrailsPanel`), avec une preview "Apply guardrails to see Before/After" cliquable. (2) Une carte `Production policies enforced` placée dans la section Decide, listant les 5 policies (4 existantes + `require_replay_id` séparée). Chaque policy a un statut `enforced`/`triggered`/`covered`. |
| Fichiers | `src/components/control-tower/ControlTowerExperience.tsx`, nouveau composant `src/components/control-tower/ProductionPoliciesCard.tsx`, `src/lib/control-tower/policy-gates.ts` (ajout rule #5) |
| Changements | (1) `ControlTowerExperience` : `ReadinessComparison` rendu dès `judgeBefore !== null` (au lieu de attendre `judgeAfter`). Quand `after === null`, affiche un placeholder "Apply guardrails below". (2) `policy-gates.ts` : ajouter `require_replay_id` (severity: high, scoreCap: 70, verdictCeiling: needs_review) — séparée de `write_without_audit_or_replay` qui devient strictement audit-log. (3) `ProductionPoliciesCard` : tableau 5 lignes statiques avec statut dynamique calculé depuis `policyGate.rules`. |
| Risques régression | (1) Le test invariant verdict-consistency ne doit pas casser (la 5ème rule respecte le même contrat). (2) `multi_agent_escalation` doit toujours produire 3+ rules fired (vérifier MISSING_AUDIT_TOKENS + nouveau REPLAY_ID_TOKENS). |
| Tests | Smoke 3 scenarios : critical → BLOCKED + 3 policies triggered + 2 enforced. Medium → NEEDS_REVIEW + 1 triggered + 4 enforced. Low → READY + 0 triggered + 5 enforced. |
| Critères d'acceptation | Before/After visible dès le 1er audit, 5 policies visibles, statut cohérent avec la trace. |
| Dépendances | Lot 1a, Lot 2a. |

---

#### **Lot 2c — PasteCard enrichi (3 boutons sample) + Export JSON verdict**

| Champ | Détail |
|---|---|
| Objectif | Le PasteCard expose 3 boutons sample : `Load unsafe CRM trace`, `Load safe research trace`, `Load multi-agent escalation trace` + bouton `Clear`. Dans le DecisionCard, ajouter un bouton `Export verdict JSON` (à côté de Copy audit report). |
| Fichiers | `src/components/control-tower/PastedTraceInput.tsx`, `src/components/control-tower/ControlTowerExperience.tsx`, `src/components/control-tower/GeminiJudgePanel.tsx` |
| Changements | (1) `PastedTraceInput` reçoit 3 callbacks `onLoadUnsafe`/`onLoadSafe`/`onLoadMultiAgent` au lieu d'un seul `onLoadExample`. (2) `ControlTowerExperience` les câble sur les `traceText` des scénarios. (3) Nouveau `<ExportVerdictJsonButton result={result} />` qui télécharge un blob `verdict.json` avec le `GeminiJudgeResult` complet (déjà sérialisable). |
| Risques régression | Vérifier que le download blob fonctionne cross-browser (Safari mobile = pas de prompt natif, fallback `<a download>` ok). |
| Tests | Smoke : pasted mode → 3 boutons load → verdict cohérent à chaque charge. Decision → Export JSON → fichier téléchargé valide. |
| Critères d'acceptation | 4 boutons dans PasteCard, Export JSON fonctionnel, fichier JSON parsable. |
| Dépendances | Lot 1a. |

---

### Bloc 3 — Gemini + Vultr crédibles (J-3 fin → J-2) — 2 lots

**12 améliorations couvertes ici** : policy engine visible (déjà Lot 2b), Live/Replay clair (déjà fait), mini-dashboard scoreboard, animation Gemini (déjà Lot 1b).

---

#### **Lot 3a — Mini dashboard scoreboard haut cockpit**

| Champ | Détail |
|---|---|
| Objectif | Mini panel `Cockpit summary` épinglé sous le stepper, qui affiche `Runs audited: X / Blocked: Y / Needs review: Z / Shipped: W / Avg cost: $X.XX / High-risk tool calls blocked: N`. Counters incrémentés en localStorage à chaque audit. |
| Fichiers | Nouveau composant `src/components/control-tower/CockpitScoreboard.tsx`, intégration dans `page.tsx` ou `ControlTowerExperience.tsx`, nouveau helper `src/lib/control-tower/scoreboard-store.ts` (localStorage wrapper) |
| Changements | (1) `scoreboard-store.ts` : `incrementCounter({ verdict, costUsd, highRiskBlocked })` + `getCounters()` avec backing localStorage `arcadeops-scoreboard-v1`. (2) `CockpitScoreboard` lit les counters, rendu compact horizontal 6 KPI. (3) `ControlTowerExperience::handleJudgeBefore` incrémente après chaque audit. |
| Risques régression | Pas de SSR sur scoreboard (localStorage). Wrap dans `useEffect` + state initial null + skeleton fallback. |
| Tests | Smoke : audit critical → Blocked++ ; audit medium → Needs review++ ; audit safe → Shipped++ ; reload page → counters persistés ; bouton "Reset cockpit" disponible. |
| Critères d'acceptation | 6 KPI visibles, valeurs cohérentes, persiste au reload, reset fonctionne. |
| Dépendances | Lot 1c (stepper), Lot 1a (verdict). |

---

#### **Lot 3b — Reformulations + micro-copies + Expected vs Actual**

| Champ | Détail |
|---|---|
| Objectif | (1) Améliorer micro-copies des 3 cartes scénarios. (2) Ajouter un mini bloc `Expected vs Actual` dans le DecisionCard quand `mode === "scenario_trace"` (affiche `Expected: BLOCKED · Gemini: BLOCKED · Match: yes/no`). (3) Reformuler le copy de la `verdictPalette` si besoin. (4) Ajouter la punchline secondaire "Logs tell you... ArcadeOps decides..." sous le hero. |
| Fichiers | `src/components/control-tower/TraceScenarioPicker.tsx` (descriptions), `src/components/control-tower/GeminiJudgePanel.tsx` (DecisionCard), `src/app/control-tower/page.tsx` (sous-titre punchline) |
| Changements | (1) `secondaryDescription` reformulée par scénario (avec verbes d'action). (2) `<ExpectedVsActualBadge expected={scenario.expectedVerdict} actual={result.verdict} />` dans DecisionCard ssi `scenario` (mode `scenario_trace`). (3) Sous le titre du hero, petite ligne italique `Logs tell you what happened. ArcadeOps decides whether what happened is safe enough to ship.` |
| Risques régression | Pas de risque mécanique, juste copy. |
| Tests | Smoke : 3 scenarios → `Expected vs Actual` affiché correctement avec Match: yes (sauf si Gemini surprend, ce qui est normal et instructif). |
| Critères d'acceptation | Texte cleaner, ExpectedVsActual visible en mode scenario_trace uniquement. |
| Dépendances | Lot 2b. |

---

### Bloc 4 — Polish submission (J-2 → J-1) — 3 lots

**Bloc terminal** : cover, vidéo, slides, README, long description, migration punchline finale partout, smoke prod complet.

---

#### **Lot 4a — Migration punchline finale + landing alignée**

| Champ | Détail |
|---|---|
| Objectif | Migrer la nouvelle punchline **« Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production. »** dans tous les copy : hero `/`, hero `/control-tower`, README.md, SUBMISSION_LABLAB.md, VIDEO_SCRIPT_90S.md, DECK_OUTLINE.md, footer, métadonnées SEO. Ancienne punchline conservée uniquement comme tagline secondaire/historique. |
| Fichiers | `src/app/page.tsx`, `src/app/control-tower/page.tsx`, `README.md`, `docs/SUBMISSION_LABLAB.md`, `docs/VIDEO_SCRIPT_90S.md`, `docs/DECK_OUTLINE.md`, `docs/HOW_TO_DEMO.md`, `docs/FEATURES.md`, `src/app/layout.tsx` (metadata) |
| Changements | Search & replace ciblé. Garder l'ancienne version dans `docs/CHANGELOG.md` comme trace historique. **Décision §6-A confirme OUI**. |
| Risques régression | Aucun technique. Risque message → recheck cohérence (Gemini = juge / Vultr = runtime / ArcadeOps = enforcement). |
| Tests | Smoke : recharger landing + cockpit, vérifier les 3 mots-clés. Grep résiduel `Gemini runs the agent` doit retourner 0 hors changelog. |
| Critères d'acceptation | Punchline V2 partout, V1 archivée dans changelog, 0 occurrence accidentelle. |
| Dépendances | Décision §6-A actée. |

---

#### **Lot 4b — Cover image + slides à jour + vidéo script aligné**

| Champ | Détail |
|---|---|
| Objectif | (1) Créer la cover image hackathon (1280×720 ou 1920×1080) — outil : Figma / Excalidraw / capture UI annotée. (2) Mettre à jour `DECK_OUTLINE.md` de 8→6 slides (Problem / Solution / Demo flow / Architecture / Why it matters / Impact) avec nouvelle UX + punchline V2. (3) Réviser `VIDEO_SCRIPT_90S.md` : intégrer animation Gemini (scene 3), stepper visible (scene 1), mini-dashboard (scene 3 fin), nouvelle punchline (scene 6). |
| Fichiers | `public/cover.png` (nouveau), `docs/DECK_OUTLINE.md`, `docs/VIDEO_SCRIPT_90S.md` |
| Changements | (1) Cover : ratio 16:9, fond zinc-950, logo ArcadeOps stylisé + punchline V2 + 3 logos sponsors. (2) Slides 6 pages alignées sur la nouvelle UX. (3) Script video : 6 scenes avec nouveaux timings cohérents. |
| Risques régression | Aucun code. Vérifier que la cover image est sous 2 MB pour upload lablab. |
| Tests | Visualiser cover.png à 1280×720. Imprimer le deck mentalement et vérifier qu'il raconte la même histoire que la nouvelle UX. |
| Critères d'acceptation | 1 cover prête, 6 slides synchronisées, video script à jour. |
| Dépendances | Lot 4a (punchline V2). |

---

#### **Lot 4c — README "How it works" relu + long description lablab + smoke prod final**

| Champ | Détail |
|---|---|
| Objectif | (1) Relire `README.md` section par section, vérifier conformité backlog P4#44 (Problem / Demo / Architecture / How Gemini used / How Vultr used / Local setup / ENV / API contract / Future). (2) `SUBMISSION_LABLAB.md` migré punchline V2 + relu. (3) Smoke browser MCP final : 3 scenarios + 1 paste + Run Gemini judge × 3 + Re-score avec guardrails × 1, en prod. (4) `pre-demo-check.ps1` doit retourner exit code 0. |
| Fichiers | `README.md`, `docs/SUBMISSION_LABLAB.md` |
| Changements | Texte uniquement. Pas de code touché. |
| Risques régression | Aucun. |
| Tests | `npm run build` en prod, deploy Vercel, browser MCP full path J-0. |
| Critères d'acceptation | Smoke 3 scenarios + 1 paste full pass en prod. `pre-demo-check.ps1` PASS. README ne contient plus l'ancienne punchline V1 (sauf changelog). |
| Dépendances | Lot 4a, 4b, et tous les Lots Bloc 1-2-3. |

---

## §6. Décisions binaires à acter avant implémentation

> Chaque décision est **binaire** (pas de demi-mesure). L'utilisateur acte avant que le parent lance le **Lot 1a**.
> Quand pertinent, un **kill-switch env explicite** est défini pour rollback sans redéploiement.

### **Décision A — Nouvelle punchline**

- **Question** : Migrer la punchline historique `« Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship. »` vers la nouvelle `« Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production. »` ?
- **Recommandation forte** : **OUI**. La V2 est plus opérationnelle (3 verbes nets : judges / runs / blocks), aligne le positionnement "production gate" demandé par le backlog #54, et évite l'ambiguïté de "decides if it can ship" qui sonne consultatif. Ancienne version archivée dans `CHANGELOG.md` comme trace historique de la phase Lot 5 FULL.
- **Kill-switch** : non pertinent (changement de copy). Si rétropédalage nécessaire = `git revert` Lot 4a.
- **Impact si refusé** : Lot 4a devient un no-op, tous les autres lots restent valides.

### **Décision B — Mode "Live ArcadeOps" Vultr+Gemini en prod publique**

- **Question** : Le bouton vert `⚡ Run live with ArcadeOps backend` (130s par run = trop long pour démo jury) doit-il rester visible publiquement, ou être masqué (accessible uniquement via env var pour démo interne) ?
- **Recommandation forte** : **MASQUER en prod publique**. AGENTS.md acte déjà cette décision. La vidéo officielle filme uniquement le Replay déterministe. Le `Live ArcadeOps` reste joué en démo live par l'auteur si réseau OK, sinon Plan B fixture sans broncher.
- **Kill-switch env explicite** : `NEXT_PUBLIC_LIVE_VULTR` (default off). En prod Vercel, ne pas le set. En démo interne / local, set à `1` pour réactiver le bouton.
- **Impact côté Lot 1a** : `ReplayLink` et `DemoMissionLauncher` gated par `process.env.NEXT_PUBLIC_LIVE_VULTR === "1"` (rendu côté serveur dans `detectModeAvailability`, propagé via prop `liveAvailable`).
- **Impact si refusé** : `Live ArcadeOps` reste exposé, le risque de timeout 130s en démo jury reste réel. À acter en connaissance de cause.

### **Décision C — Garder ou supprimer le 5ème mode `pasted_trace`**

- **Question** : Le mode `pasted_trace` (PasteCard) ajoute une affordance supplémentaire dans le picker (donc 4 entrées + paste = 5). Garder ou supprimer ?
- **Recommandation forte** : **GARDER** mais l'enrichir (Lot 2c : 3 boutons sample + Clear + Export). Le mode `pasted_trace` est ce qui transforme la démo d'un "showcase fixe" en "tu peux essayer avec ta propre trace", c'est une preuve forte pour les jurys techniques. AGENTS.md liste les 3 modes Gemini comme architecture stable.
- **Kill-switch** : `NEXT_PUBLIC_HACKATHON_MODE` (valeurs `cockpit_v6` = défaut ouvert, `picker_minimal` = paste masquée). Lecture côté serveur dans `page.tsx::detectModeAvailability`.
- **Impact si refusé** : `PasteCard` retirée de `TraceScenarioPicker`, on tombe à 3 scenarios pure ; le Lot 2c se simplifie en juste "Export JSON verdict".

### Décisions secondaires (non bloquantes pour démarrer)

| ID | Question | Recommandation | Kill-switch |
|---|---|---|---|
| D | Garder le ReplayLink discret (mode `replay` SSE déterministe) ? | **Supprimer** (gated derrière `NEXT_PUBLIC_LIVE_VULTR`, redondant avec le scenario `ready_research_agent`) | Idem B |
| E | Ajouter une 5ème policy rule `require_replay_id` séparée ? | **OUI** (cohérence avec narratif backlog) | Aucun (rule additive, ne dégrade rien) |
| F | Cover image style : capture UI annotée vs design Figma neuf ? | **Capture UI annotée** (cohérent, rapide, ne ment pas) | Aucun |
| G | Mini dashboard scoreboard avec compteurs localStorage ? | **OUI** mais reset disponible | `NEXT_PUBLIC_SCOREBOARD=0` pour désactiver |

---

## §7. Filet de sécurité avant gros lot moteur

Le seul lot **moteur** qui touche le pipeline verdict-consistency est **Lot 2b** (ajout d'une 5ème policy rule `require_replay_id`). Tous les autres lots sont des couches UI au-dessus.

### Mini-tests de non-régression à écrire AVANT Lot 2b

> Pas de Vitest installé → tests **manuels reproductibles via smoke browser MCP** + un script TypeScript autonome `scripts/smoke-policy-gates.ts` qui appelle `applyProductionPolicyGates` + `enforceVerdictConsistency` sur les 4 scenarios + 1 trace paste et vérifie le verdict final.

| # | Cas | Trace | Verdict attendu | Score attendu | Rules attendues |
|---|---|---|---|---|---|
| T1 | Multi-agent escalation | `multi_agent_escalation.traceText` | `blocked` | ≤ 45 | `destructive_without_approval` + `outbound_without_review` + `write_without_audit_or_replay` (+ `require_replay_id` après Lot 2b) |
| T2 | Blocked CRM write | `blocked_crm_write_agent.traceText` | `blocked` | ≤ 45 | Idem T1 + `cost_budget_exceeded` |
| T3 | Needs-review support | `needs_review_support_agent.traceText` | `needs_review` | 50-79 | Aucune rule high triggered |
| T4 | Ready research | `ready_research_agent.traceText` | `ready` | ≥ 80 | 0 rule triggered |
| T5 | Pasted trace minimal | `"Agent did X without approval"` (50 chars) | `needs_review` ou `blocked` selon match | ≤ 79 | Au moins 1 rule |

### Procédure

1. Écrire `scripts/smoke-policy-gates.ts` (pas de framework, juste `console.assert` + exit code 1 si échec).
2. Lancer le script **avant** Lot 2b → noter les valeurs actuelles.
3. Implémenter Lot 2b (5ème rule).
4. Re-lancer le script → vérifier que T1-T4 passent toujours et que T1+T2 ont bien +1 rule supplémentaire fired.
5. Si T3 ou T4 régresse, **stop** et corriger les tokens de matching de la 5ème rule.

**Critère go/no-go** : T1 et T2 doivent garder `blocked` strict, T4 doit garder `ready` strict. Si l'un des deux casse, ne pas merger Lot 2b.

---

## §8. Verdict de faisabilité 5 jours

**`FAISABLE AVEC COUPES`**.

### Faisable en 5 jours (J-5 à J-0)

- **Bloc 1 (UX guidée)** — 4 lots — **J-5 (15 mai) + J-4 matin (16 mai)** — Lots 1a/1b/1c/1d.
- **Bloc 2 (Démo qui claque)** — 3 lots — **J-4 après-midi + J-3 (17 mai)** — Lots 2a/2b/2c.
- **Bloc 3 (Gemini+Vultr crédibles)** — 2 lots — **J-3 fin + J-2 matin (18 mai)** — Lots 3a/3b.
- **Bloc 4 (Polish submission)** — 3 lots — **J-2 après-midi + J-1 (19 mai)** — Lots 4a/4b/4c.
- **J-0 (20 mai)** : buffer + soumission lablab + tweet announce.

### Coupes assumées (et leur justification)

| Item | Raison de la coupe |
|---|---|
| **P2#23 sous-scores détaillés** (Trace completeness / Approval safety / Tool risk / Cost control / Production readiness) | Demande retravailler le prompt Gemini + UI dédiée 5 KPI. Le score actuel 0-100 + 3 assessments compact (Cost / Tool safety / Observability) est déjà cogent. Coût/bénéfice insuffisant. |
| **P2#25 comparaison Traditional observability vs Agent control** | Nouveau bloc UI dense. Couvert plus efficacement dans le **deck submission (slide 6)** que dans le cockpit. Ne pas surcharger l'UI. |
| **P5#50 raccourcis clavier 1/2/3/Enter** | Nice-to-have, faible levier jury (jury clique). Effort ~3h pour zéro impact submission. |
| **P4#43 suite tests Vitest/Playwright complète** | Installer Vitest + Playwright + écrire 5 specs en 5 jours = 1 jour entier qui détourne du polish UX. Remplacé par **`scripts/smoke-policy-gates.ts` (§7) + smoke browser MCP manuel + `pre-demo-check.ps1`**. |
| **P2#22 état "policy simulation" pre-Gemini** | Demande exposer le résultat de `detectProductionPolicyGates` en pre-flight côté UI avant l'appel Gemini. Effort moyen pour gain narratif marginal (la même info apparaît post-Gemini avec plus de contexte). |

### Périmètre minimal viable (si J-2 explose et qu'il faut couper davantage)

**Si J-2 18 mai = retard de 1 jour**, on coupe en plus :
- Lot 3a (mini dashboard scoreboard) → reporté post-hackathon.
- Lot 3b (Expected vs Actual + punchline secondaire) → garder uniquement Expected vs Actual, abandonner punchline secondaire.

**Si J-1 19 mai = retard de 2 jours**, on tient quand même la submission grâce au socle déjà solide :
- Garder uniquement Bloc 1 + Lot 2a (Vultr Card) + Lot 4a (punchline V2) + Lot 4b (cover) + Lot 4c (relecture).
- Submission lablab passe à 90/100 estimé au lieu de 100/100.

### Tableau final | Zone | Fichiers | Constat | Impact | Fix |

| Zone | Fichiers | Constat | Impact | Fix |
|---|---|---|---|---|
| Picker (6 affordances) | `TraceScenarioPicker.tsx`, `ControlTowerExperience.tsx` | 4 scenarios + paste + replay link dilue le choix | Décision lente jury, message brouillé | Lot 1a : kill replay link, garder 3 scenarios + paste, uniformiser CTA |
| Verdict hors viewport | `ControlTowerExperience.tsx` | Pas de `scrollIntoView` après audit | Le jury manque le wow moment | Lot 1a : ref + scrollIntoView smooth |
| Animation Gemini | `GeminiJudgePanel.tsx` | Spinner basique 1 mot | Pas de narration "Gemini travaille" | Lot 1b : ticker 5 messages |
| Stepper | `page.tsx`, `ControlTowerExperience.tsx` | Pas de top-bar sticky | UX moins guidée que dans le brief jury | Lot 1c : `CockpitStepper.tsx` sticky + IntersectionObserver |
| Hero `/control-tower` | `page.tsx` | 3 lignes + 3 badges + flowstep = légèrement lourd | Premier viewport encombré | Lot 1d : retirer badges du hero, bandeau pédagogique sous stepper |
| Vultr Proof | `ArcadeOpsRuntimeSection.tsx` (bas de page) | Pas de carte "Infrastructure proof" sous verdict, pas de polling `/api/health` UI | Le mot "Vultr" reste vague pour le jury | Lot 2a : `InfrastructureProofCard.tsx` sous verdict + health polling 30s |
| Before/After | `ReadinessComparison.tsx`, `ControlTowerExperience.tsx` | Caché derrière `GuardrailsPanel` (visible seulement après `judgeBefore && judgeAfter`) | Wow moment trop tardif | Lot 2b : rendre dès `judgeBefore`, preview placeholder pour after |
| Policies visibles | `policy-gates.ts`, UI | 4 rules backend, 0 carte UI listant les 5 policies | Backlog #15 = manque produit | Lot 2b : `ProductionPoliciesCard.tsx` + 5ème rule `require_replay_id` |
| PasteCard | `PastedTraceInput.tsx` | 1 seul bouton "Load unsafe example" | Manque preuve de polyvalence | Lot 2c : 3 boutons sample + Clear |
| Export JSON | `GeminiJudgePanel.tsx` | Pas de bouton Export JSON (juste Copy text) | Backlog #27 = manque | Lot 2c : `ExportVerdictJsonButton` |
| Dashboard scoreboard | absent | 0 compteurs visibles | Pas de "sense of progress" sur 3 audits | Lot 3a : `CockpitScoreboard.tsx` + localStorage |
| Micro-copies | `TraceScenarioPicker.tsx`, `GeminiJudgePanel.tsx` | Wording assez sec, manque Expected vs Actual | Backlog #19 + #46 = polish | Lot 3b : 3 descriptions + ExpectedVsActualBadge |
| Punchline | partout | V1 figée historiquement, V2 demandée | Backlog explicite | Lot 4a : search & replace cadré |
| Cover image | `public/` | Aucune image hackathon | Backlog #31 = bloquant submission | Lot 4b : créer `public/cover.png` |
| Slides 8→6 | `docs/DECK_OUTLINE.md` | 8 slides, backlog demande 6 | Format submission | Lot 4b : condenser |
| Tests automatisés | absent | Aucune suite Vitest/Playwright | Risque régression sur Lot 2b (policy 5) | §7 : `scripts/smoke-policy-gates.ts` + smoke browser MCP |
| Mode Live Vultr | `DemoMissionLauncher.tsx`, `page.tsx::detectModeAvailability` | Affiché en prod, 130s/run trop long jury | Contradiction AGENTS.md | Décision §6-B : kill-switch `NEXT_PUBLIC_LIVE_VULTR` |

---

## Annexes

- **Référence backlog complet** : 55 items P0→P6, formulés par l'utilisateur, traités intégralement dans §3.
- **TODO checklist** racine repo : `TODO_HACKATHON_100.md` (J-5 → J-0).
- **Source de vérité runtime** : code source du repo, jamais les docs historiques (`CONTROL_TOWER_MILAN_PLAN.md`, `LOT_5_FULL_PLAN.md`, `TODO_CONTROL_TOWER.md`) — ces docs servent de contexte mais ne reflètent pas l'état réel post-Lot 5 FULL.
- **Convention agentique** : tous les commits doivent porter le préfixe `feat(control-tower): Lot Xy — <résumé>` ou `chore(control-tower): Lot Xy — <résumé>` pour traçabilité.
