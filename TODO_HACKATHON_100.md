# TODO Hackathon 100/100 — ArcadeOps Control Tower

> Plan de référence : [`docs/implementation/HACKATHON_100_MASTER_PLAN.md`](docs/implementation/HACKATHON_100_MASTER_PLAN.md).
> Fenêtre : **15 → 20 mai 2026** (J-5 → J-0). Submission deadline AI Agent Olympics : **20 mai 2026**.
> Chaque case `- [ ]` est conçue pour être traitée en **< 2h**.
> Gates obligatoires par lot avant push : `npx tsc --noEmit` · `npm run lint` · `npm run build` · smoke browser MCP · commit + push · vérifier deploy Vercel preview.

---

## 0. Décisions binaires à acter AVANT de démarrer (HACKATHON_100_MASTER_PLAN.md §6)

- [ ] **Décision A** — Acter la nouvelle punchline « Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production. » (recommandation : OUI).
- [ ] **Décision B** — Masquer le bouton `⚡ Run live with ArcadeOps backend` en prod publique via `NEXT_PUBLIC_LIVE_VULTR=0` (recommandation : OUI ; réactiver localement avec `=1`).
- [ ] **Décision C** — Garder le mode `pasted_trace` (PasteCard) et l'enrichir avec 3 boutons sample (recommandation : OUI).
- [ ] Confirmer les décisions secondaires D/E/F/G ou les acter par défaut (Supprimer ReplayLink / 5ème rule / Cover capture annotée / Scoreboard ON).

---

## J-5 — Vendredi 15 mai 2026 · Bloc 1 (UX guidée) — démarrage

### Préparation

- [ ] `git checkout main && git pull --rebase` puis `git checkout -b feat/hackathon-100-bloc1`.
- [ ] Vérifier que `npm install` à jour ; `npm run dev` lance Next 16.2.6 sans warning bloquant.
- [ ] `pre-demo-check.ps1` exécuté = baseline verte (capture en mémoire pour comparaison fin de journée).
- [ ] `scripts/smoke-policy-gates.ts` créé (cf. HACKATHON_100_MASTER_PLAN.md §7) — écrit AVANT toute modif moteur, comme filet de sécurité.

### Lot 1a — Réduction 6→4 modes + uniformisation CTA + verdict scrollIntoView (réf §5)

- [x] `TraceScenarioPicker.tsx::ctaLabel` : retourner `"Audit this run"` pour les 3 niveaux risk (P0#3).
- [x] `TraceScenarioPicker.tsx` : gater `ReplayLink` derrière `process.env.NEXT_PUBLIC_LIVE_VULTR === "1"` (default off ; lecture serveur dans `page.tsx::detectModeAvailability`).
- [x] `ControlTowerExperience.tsx` : ajouter `useRef<HTMLDivElement>` sur la section Gemini Judge + `useEffect` qui appelle `scrollIntoView({behavior:"smooth", block:"start"})` quand `judgeBefore` passe de null → non null (P0#5).
- [x] Gates : `tsc`, `lint`, `build` ✓ — commit `feat(control-tower): Lot 1a — reduce picker affordances + uniform CTA + verdict scrollIntoView`.

### Lot 1b — Animation Gemini ticker + reformulation fallback (réf §5)

- [x] `GeminiJudgePanel.tsx` : créer sous-composant `<GeminiTicker />` qui cycle 5 messages via `setInterval` 600ms (`Reading agent trace... → Checking tool calls... → Detecting external side effects... → Applying production policies... → Generating Gemini verdict...`) (P0#6).
- [x] `<GeminiTicker />` rendu pendant `state.status === "loading"`, cleanup `setInterval` au démontage et à `status !== "loading"` (cycle stop quand le composant disparaît du JSX). Floor min 2s via `TICKER_MIN_DURATION_MS` côté `runJudge`.
- [x] `GeminiJudgePanel.tsx` `available === false` : reformuler le copy en `Demo running in deterministic replay mode. Set GEMINI_API_KEY to enable live Gemini audit.` (P1#40).
- [x] Gates + commit `feat(control-tower): Lot 1b — Gemini ticker animation + replay fallback copy`.

---

## J-4 — Samedi 16 mai 2026 · Bloc 1 (fin) + Bloc 2 (début)

### Lot 1c — Stepper sticky 3 étapes en top-bar (réf §5)

- [x] Créer `src/components/control-tower/CockpitStepper.tsx` : 3 chips cliquables (`1 · Pick · #pick`, `2 · Inspect · #evidence`, `3 · Decide · #decide`), highlight de l'étape active via `IntersectionObserver` (rootMargin `-110px 0px -55%`, intersectionRatio max), design `sticky top-0 z-20 backdrop-blur` (P0#1).
- [x] `ControlTowerExperience.tsx` : assigner `id="pick" / id="evidence" / id="decide"` aux sections correspondantes (avec `scroll-mt-24` pour offset sticky).
- [x] `page.tsx` : intercaler `<CockpitStepper />` juste au-dessus de `<ControlTowerExperience>`.
- [x] Mobile : icône Lucide rendue `sm:hidden`, label long sur desktop (`hidden sm:inline`), label court mobile (`sm:hidden`).
- [x] Gates + commit `feat(control-tower): Lot 1c — sticky cockpit stepper 3 steps`.

### Lot 1d — Hero resserré + bandeau Recommended demo path (réf §5)

- [x] `page.tsx` : retirer les 3 `<Badge>` du hero (suppression complète, fonction `Badge` retirée car non utilisée), garder hero 3 lignes max (P0#2).
- [x] Créer `src/components/control-tower/RecommendedDemoBanner.tsx` : 1 ligne 4 étapes inline icons (`1. Audit critical CRM run → 2. Watch Gemini block it → 3. Audit safe research run → 4. Watch it ship with monitoring`), dismissible via localStorage key `arcadeops-demo-banner-dismissed-v1` (P1#18). Implémenté via `useSyncExternalStore` (React 19-compatible, contourne `react-hooks/set-state-in-effect`).
- [x] Intercaler `<RecommendedDemoBanner />` juste sous le stepper.
- [x] Smoke : sera vérifié en fin de Bloc 1 via browser MCP.
- [x] Gates + commit `feat(control-tower): Lot 1d — hero compaction + recommended demo banner`.

### Lot 2a — Vultr Infrastructure Proof Card + health polling (début, réf §5)

- [x] Étendre `src/app/api/health/route.ts` : ajouter `vultrRunnerConfigured` (true si `RUNNER_URL` ou fallback Vultr historique) + `region: "fra"` dans la réponse.
- [x] Créer `src/lib/control-tower/health-probe.ts` (helper client `pollHealth(onSnapshot, options)` avec `AbortController` + premier probe immédiat puis intervalle).
- [x] Créer `src/components/control-tower/InfrastructureProofCard.tsx` (affiche Backend Vultr / Runtime Docker+FastAPI / Region FRA Frankfurt / Status pastille animée / Last audit latency).
- [x] Intégrer la card **juste sous `<DecisionCard>`** dans `GeminiJudgePanel.tsx::JudgeResultView` ; passe la latence mesurée client-side via state `lastAuditLatencyMs`.
- [x] `GuardrailsPanel.tsx` : `<JudgeResultView showInfrastructureProof={false}>` pour éviter de doubler la card dans la vue "After".
- [x] Smoke : sera vérifié en fin de Bloc 2 via browser MCP.
- [x] Gates + commit `feat(control-tower): Lot 2a — Vultr infrastructure proof card + health polling`.

---

## J-3 — Dimanche 17 mai 2026 · Bloc 2 (fin) + Bloc 3 (début)

### Lot 2b — Before/After remonté + 5 policies listées (réf §5)

- [x] **AVANT TOUTE MODIF MOTEUR** : créé `scripts/smoke-policy-gates.ts` (T1-T5) — baseline 5/5 PASS (T3 redéfini en "engine-only smoke" car le verdict needs_review attendu vient du Gemini live, pas du moteur déterministe seul).
- [x] `policy-gates.ts` : ajouté rule #5 `require_replay_id` (severity: high, scoreCap: 70, verdictCeiling: needs_review, matchers `MISSING_REPLAY_ID_TOKENS`, scenarioIds hard-wired sur les 2 critiques) (P4#41).
- [x] Re-exécuté `smoke-policy-gates.ts` → 5/5 PASS, T1+T2 ont bien gagné la 5ᵉ rule, T3+T4 inchangés.
- [x] `ControlTowerExperience.tsx` : `<ReadinessComparison showPlaceholderWhenAfterMissing>` rendu dès `judgeBefore !== null` dans la section Decide (au-dessus de la GuardrailsPanel) — `<ReadinessComparisonPlaceholder>` interne affiche "Apply guardrails below to compute the After score" si `judgeAfter === null` (P0#8).
- [x] Créé `src/components/control-tower/ProductionPoliciesCard.tsx` : 5 lignes (label / description / statut `armed` avant audit, `enforced` ou `triggered` après), badges synthétiques `X enforced` / `Y triggered` (P1#15).
- [x] Intégré `<ProductionPoliciesCard result={judgeBefore}>` dans la section Decide, juste sous `<GeminiJudgePanel>` (rendu permanent — pédagogie pré-audit + état post-audit).
- [x] Smoke moteur via `npx tsx scripts/smoke-policy-gates.ts` : T1 4 rules, T2 5 rules, T3+T4 0 rules, T5 1 rule — 5/5 PASS.
- [x] Gates + commit `feat(control-tower): Lot 2b — before/after promoted + 5 production policies card`.

### Lot 2c — PasteCard enrichi + Export JSON (réf §5)

- [x] `PastedTraceInput.tsx` : remplacé le bouton unique `Load unsafe example` par 3 boutons typés couleur (`Load unsafe CRM trace` rouge, `Load safe research trace` emerald, `Load multi-agent escalation trace` amber) + `Clear` (P1#12). Helper interne `SampleLoaderButton`.
- [x] `ControlTowerExperience.tsx` : câblé les 3 callbacks sur les `traceText` des scénarios `blocked_crm_write_agent` / `ready_research_agent` / `multi_agent_escalation` ; chaque load wipe `judgeBefore`/`judgeAfter` (cohérent avec `handleSelect`).
- [x] `GeminiJudgePanel.tsx` : ajouté `<ExportVerdictJsonButton result={result} />` à côté de `<CopyAuditReportButton>` (Blob JSON, fallback Safari mobile via anchor injecté + cleanup `URL.revokeObjectURL`) (P2#27).
- [x] Smoke : sera vérifié en fin de Bloc 2 via browser MCP.
- [x] Gates + commit `feat(control-tower): Lot 2c — paste samples + export verdict json`.

### Lot 3a — Mini dashboard scoreboard (démarrage)

- [ ] Créer `src/lib/control-tower/scoreboard-store.ts` : helpers `getCounters()` / `incrementCounter({verdict, costUsd, highRiskBlocked})` / `reset()` avec backing `localStorage["arcadeops-scoreboard-v1"]` (P1#21).
- [ ] Créer `src/components/control-tower/CockpitScoreboard.tsx` : 6 KPI horizontal compact (Runs audited / Blocked / Needs review / Shipped / Avg cost / High-risk tool calls blocked).
- [ ] `ControlTowerExperience::handleJudgeBefore` : appeler `incrementCounter` après chaque audit (gated par `process.env.NEXT_PUBLIC_SCOREBOARD !== "0"`).
- [ ] Smoke : audit critical → Blocked++ ; reload → counters persistés ; bouton `Reset cockpit` → counters = 0.
- [ ] Gates + commit `feat(control-tower): Lot 3a — cockpit scoreboard with localStorage counters`.

---

## J-2 — Lundi 18 mai 2026 · Bloc 3 (fin) + Bloc 4 (début)

### Lot 3b — Micro-copies + Expected vs Actual + punchline secondaire

- [ ] `TraceScenarioPicker.tsx::secondaryDescription` : réécrire les 3 descriptions avec verbes d'action + tension narrative (P1#19).
- [ ] `GeminiJudgePanel.tsx` `<DecisionCard>` : ajouter `<ExpectedVsActualBadge expected={scenario.expectedVerdict} actual={result.verdict} />` rendu ssi `mode === "scenario_trace"` (P5#46).
- [ ] `page.tsx` : ajouter sous le titre du hero une ligne italique `Logs tell you what happened. ArcadeOps decides whether what happened is safe enough to ship.` (P2#24).
- [ ] Smoke 3 scenarios : ExpectedVsActual visible et Match: yes (sauf surprise Gemini).
- [ ] Gates + commit `feat(control-tower): Lot 3b — micro-copy + expected vs actual + secondary punchline`.

### Lot 4a — Migration punchline finale partout

- [ ] Search & replace ciblé `Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship.` → `Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production.` dans :
  - [ ] `README.md`
  - [ ] `src/app/page.tsx` (landing)
  - [ ] `src/app/control-tower/page.tsx` (cockpit hero + metadata)
  - [ ] `src/app/layout.tsx` (metadata)
  - [ ] `docs/SUBMISSION_LABLAB.md`
  - [ ] `docs/VIDEO_SCRIPT_90S.md`
  - [ ] `docs/DECK_OUTLINE.md`
  - [ ] `docs/HOW_TO_DEMO.md`
  - [ ] `docs/FEATURES.md`
  - [ ] `docs/implementation/CONTROL_TOWER_MILAN_PLAN.md` (note historique uniquement)
- [ ] Archiver l'ancienne punchline dans `CHANGELOG.md` sous une entrée `## 2026-05-18 — Punchline V2 migration`.
- [ ] Grep final : `rg "Gemini runs the agent"` doit retourner 0 hors `CHANGELOG.md`.
- [ ] Gates + commit `chore(control-tower): Lot 4a — final punchline migration`.

---

## J-1 — Mardi 19 mai 2026 · Bloc 4 (fin) — submission pack

### Lot 4b — Cover image + slides + script vidéo aligné

- [ ] Préparer `public/cover.png` (1280×720 OU 1920×1080), fond zinc-950, logo ArcadeOps + punchline V2 + logos sponsors (Google Gemini, Vultr, Lablab). Capture UI annotée préférée (rapide + véridique).
- [ ] `docs/DECK_OUTLINE.md` : passer de 8 slides à 6 slides (Problem / Solution / Demo flow / Architecture / Why it matters / Impact) avec captures de la nouvelle UX (stepper, animation Gemini, Vultr Card, scoreboard) (P3#33).
- [ ] Exporter le deck en PDF 6 pages (`docs/deck.pdf` ou via Figma/Slidev/Keynote selon outil).
- [ ] `docs/VIDEO_SCRIPT_90S.md` : intégrer les nouveaux éléments UX dans le storyboard (scène 1 stepper, scène 3 animation Gemini, scène 3 fin scoreboard, scène 6 nouvelle punchline V2 comme dernière phrase) (P3#32).
- [ ] Enregistrer la vidéo 90s (OBS/QuickTime, micro propre, 1080p).
- [ ] Export `docs/demo_90s.mp4` ≤ 100 MB.
- [ ] Commit `chore(control-tower): Lot 4b — cover image + deck v2 + 90s video script`.

### Lot 4c — README "How it works" relu + long description lablab + smoke prod final

- [ ] Relire `README.md` section par section, conformité backlog P4#44 (Problem / Demo / Architecture / How Gemini used / How Vultr used / Local setup / ENV / API contract / Future).
- [ ] Mettre à jour la section live demo avec instructions du nouveau cockpit (stepper, animation, infrastructure card).
- [ ] `docs/SUBMISSION_LABLAB.md` : relire, vérifier punchline V2, vérifier que la long description ouvre sur "production gate" et ferme sur la punchline.
- [ ] Smoke browser MCP **complet** sur la prod Vercel : 3 scenarios + 1 paste + Run Gemini judge × 3 + Re-score guardrails × 1.
- [ ] `pre-demo-check.ps1` doit PASS (exit code 0).
- [ ] Capturer 3 screenshots prod (verdict BLOCKED critical / verdict SHIP safe / Before/After) pour la submission lablab.
- [ ] Gates + commit `chore(control-tower): Lot 4c — README polish + submission copy + prod smoke`.
- [ ] **Merger `feat/hackathon-100-bloc1` → `main`** + push → vérifier deploy Vercel prod auto.

---

## J-0 — Mercredi 20 mai 2026 · Submission & buffer

### Submission lablab

- [ ] Sur lablab.ai : créer la submission (titre, tagline, short description, long description, tech tags, repo public link, demo URL, video link).
- [ ] Upload `public/cover.png` comme cover image.
- [ ] Upload `docs/deck.pdf` (slides 6 pages).
- [ ] Upload `docs/demo_90s.mp4` (ou lien YouTube non-listé).
- [ ] Tag sponsors (Google Gemini, Vultr).
- [ ] Soumettre **AVANT 18h CET** (buffer 6h sur la deadline théorique).

### Communication

- [ ] Tweet announce : punchline V2 + lien lablab + lien live demo Vercel + screenshot verdict BLOCKED.
- [ ] LinkedIn post court (4 lignes) : positionnement business + lien.
- [ ] Mise à jour `BUILD_IN_PUBLIC.md` (entrée finale 20 mai).

### Buffer si retard

- [ ] Si J-1 19 mai retardé, exécuter le périmètre minimal viable §8 du HACKATHON_100_MASTER_PLAN.md (Bloc 1 + Lot 2a + 4a + 4b + 4c uniquement).
- [ ] Si Gemini API down le jour J : forcer fallback `GEMINI_NOT_CONFIGURED` (vidéo officielle joue le replay déterministe — pas d'impact).
- [ ] Si Vercel preview KO : rollback au dernier deploy main stable + republier.

---

## Vérifications terminales

- [ ] `tsc --noEmit` PASS.
- [ ] `npm run lint` PASS (0 warning).
- [ ] `npm run build` PASS (no Next 16 warnings bloquants).
- [ ] `scripts/smoke-policy-gates.ts` PASS (T1-T5).
- [ ] `pre-demo-check.ps1` PASS sur prod.
- [ ] Smoke browser MCP : `/control-tower` 4 modes (3 scenarios + paste) + verdict + Before/After + Export JSON + Copy report.
- [ ] Repo public GitHub à jour, dernier commit visible.
- [ ] Submission lablab visible publiquement.
- [ ] Vidéo 90s + slides 6 pages + cover image uploadés.
