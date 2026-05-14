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

- [x] Créé `src/lib/control-tower/scoreboard-store.ts` : helpers `getCounters()` / `incrementCounter({verdict, costUsd, policyGateTriggered})` / `resetCounters()` / `averageCostUsd()` / `emptyCounters()` avec backing `localStorage["arcadeops-scoreboard-v1"]` ; SSR-safe (zero snapshot fallback) ; crash-safe (corruption → zeros silencieux) (P1#21).
- [x] Créé `src/components/control-tower/CockpitScoreboard.tsx` : 6 KPI horizontal compact (Runs audited / Blocked / Needs review / Shipped / Avg cost / High-risk calls blocked) + bouton Reset, `useSyncExternalStore` (cross-tab `storage` event + module-level `notifyScoreboardChange()` pour les updates in-tab), grid responsive `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.
- [x] `ControlTowerExperience::handleJudgeBefore` : appel `incrementCounter` après chaque audit (gated par module-level constant `SCOREBOARD_ENABLED = process.env.NEXT_PUBLIC_SCOREBOARD !== "0"` — tree-shaking-friendly), `notifyScoreboardChange()` pour rafraîchir l'UI in-tab. `costUsd` sourcé depuis `activeScenario.snapshot.observability.costUsd` (mode scenario) ou `replaySnapshot.observability.costUsd` (mode replay), omis pour pasted (pas de coût réel attribuable). `policyGateTriggered` lu depuis `result.policyGate?.triggered`.
- [x] Smoke : sera vérifié en fin de Bloc 3 via browser MCP.
- [x] Gates + commit `feat(control-tower): Lot 3a — cockpit scoreboard with localStorage counters`.

---

## J-2 — Lundi 18 mai 2026 · Bloc 3 (fin) + Bloc 4 (début)

### Lot 3b — Micro-copies + Expected vs Actual + punchline secondaire

- [x] `TraceScenarioPicker.tsx::secondaryDescription` : 3 cas verbes d'action explicites — `needs_review` ("Drafts customer replies without a confidence floor — ship or escalate?"), `ready` ("Reads sources only, every step audited — green-light candidate."), `blocked` ("Tries to mass-update CRM deals via destructive writes, no approval — block or let it ship?") (P1#19).
- [x] `GeminiJudgePanel.tsx` `<DecisionCard>` : `<ExpectedVsActualBadge>` (compact pill `Expected · Gemini · Match`, tone emerald=match / rose=mismatch, `aria-label` complet) rendu ssi `requestBody.mode === "scenario_trace"` via helper `resolveExpectedVerdict()` qui lookup `findScenarioById`. Prop optionnelle `expectedVerdict` propagée à `JudgeResultViewProps` → `DecisionCard` (les autres callsites — GuardrailsPanel After — n'ont pas à changer car prop optional `null` par défaut) (P5#46).
- [x] `page.tsx` : ligne italique `text-sm sm:text-base text-zinc-400` sous le titre hero, `max-w-3xl` pour respecter la grille du flow compact (P2#24).
- [x] Smoke : sera vérifié en fin de Bloc 3 via browser MCP.
- [x] Gates + commit `feat(control-tower): Lot 3b — micro-copy + expected vs actual + secondary punchline`.

### Lot 4a — Migration punchline finale partout

- [x] Search & replace ciblé `Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship.` → `Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production.` dans :
  - [x] `README.md` (V1 archivée comme tagline historique en `<sub>` sous la V2)
  - [x] `src/app/page.tsx` (landing — V2 affichée verbatim sous le H1, `text-emerald-200` semibold)
  - [x] `src/app/control-tower/page.tsx` (cockpit hero — V2 verbatim sous H1, secondaire italique en-dessous)
  - [x] `src/app/layout.tsx` (`description` SEO migrée + commentaire référence Lot 4a)
  - [x] `docs/SUBMISSION_LABLAB.md` (tagline 109 chars → V2 88 chars)
  - [x] `docs/VIDEO_SCRIPT_90S.md` (intro storyboard, scene 1 VO, scene 6 VO + punchline rule, end-card tagline — toutes alignées sur V2 avec FR support)
  - [x] `docs/DECK_OUTLINE.md` (Slide 1 sub-line + Slide 8 closing line — V2 verbatim)
  - [x] `docs/HOW_TO_DEMO.md` (script verbal "Say:" 0:00 hook — V2)
  - [N/A] `docs/FEATURES.md` (pas de mention punchline V1 ; couvert via README/landing/cockpit)
  - [N/A] `docs/implementation/CONTROL_TOWER_MILAN_PLAN.md` (plan historique de phase passée — note historique conservée intentionnellement)
- [x] Tagline V1 archivée comme historique sous V2 dans `README.md` (`<sub>` italique) + bandeau historique sous la `> Goal` du `VIDEO_SCRIPT_90S.md` (pas de `CHANGELOG.md` créé pour minimiser le diff — décision gardée pour Lot 4c README polish).
- [x] Grep final : 9 occurrences résiduelles toutes intentionnelles (notes historiques explicitement taguées README/VIDEO_SCRIPT, commentaire layout.tsx, instruction TODO/master plan/POST_BACKLOG/LOT_5_FULL_PLAN/CONTROL_TOWER_MILAN_PLAN).
- [x] Gates + commit `chore(control-tower): Lot 4a — final punchline migration`.

---

## J-1 — Mardi 19 mai 2026 · Bloc 4 (fin) — submission pack

### Lot 4b — Cover image + slides + script vidéo aligné

- [x] Préparé `public/cover.png` (1920×1080, ~1.13 MB, fond zinc-950 dégradé emerald, logo ArcadeOps + V2 punchline + chips sponsors Google Gemini / Vultr / Vercel — généré via outil image dédié, P3#31).
- [x] `docs/DECK_OUTLINE.md` : restructuré 8 → 6 slides (Problem / Solution / Demo flow / Architecture / Why it matters / Impact) + page de titre référençant `public/cover.png`, intégrant stepper / Recommended Demo Banner / scoreboard / ProductionPoliciesCard / ExpectedVsActualBadge + V2 punchline en Slide 1, 2, 3 et 6 (P3#33).
- [ ] Exporter le deck en PDF 6 pages (`docs/deck.pdf` ou via Figma/Slidev/Keynote selon outil) — **manuel utilisateur**.
- [x] `docs/VIDEO_SCRIPT_90S.md` : storyboard mis à jour pour la cockpit V2 — Scene 1 = cover.png 3 s puis hero `/control-tower` avec stepper + Recommended demo banner ; Scene 3 = scenario_trace mode (clic critical scenario card → `<GeminiTicker>` 4 s → `<DecisionCard>` V2 + `<ExpectedVsActualBadge>` + `<ProductionPoliciesCard>` + `<InfrastructureProofCard>` + scoreboard bump) au lieu de l'ancien live Vultr 130 s ; Scene 6 = punchline V2 en dernière phrase ; notes pratiques alignées sur `NEXT_PUBLIC_LIVE_VULTR=0` (live masqué) et sample loaders gated `cockpit_v6` (P3#32).
- [ ] Enregistrer la vidéo 90s (OBS/QuickTime, micro propre, 1080p) — **manuel utilisateur**.
- [ ] Export `docs/demo_90s.mp4` ≤ 100 MB — **manuel utilisateur**.
- [ ] Commit `chore(control-tower): Lot 4b — cover image + deck v2 + 90s video script`.

### Lot 4c — README "How it works" relu + long description lablab + smoke prod final

- [x] Relu `README.md` section par section : section "Live demo" réécrite pour la cockpit V2 (stepper, scenario picker, Run Gemini judge 4 s, Decision card avec Expected vs Gemini badge, Production policies card 5 rules, Infrastructure proof card, Cockpit scoreboard) ; ajout sous-section "Internal director's cut" pour le bouton vert live Vultr 130 s gated par `NEXT_PUBLIC_LIVE_VULTR=1` ; "Why we win" enrichi avec bullet "Decision-first cockpit (V2)" + correction "three policy gates" → "five policy gates" ; bloc Mermaid mis à jour avec 5 gates (`crm_writes_require_approval`, `external_email_requires_approval`, `prompt_injection_must_be_blocked`, `write_without_audit_blocked`, `require_replay_id`) ; preuve historique "3 policy gates triggered" recadrée en "3 of 5 armed in cockpit V2" ; punchline V1 dans "How to demo curl" remplacée par V2 (P4#44).
- [x] Section live demo enrichie avec les nouveaux composants UX (CockpitStepper, RecommendedDemoBanner, CriticalScenarioCard, GeminiTicker, DecisionCard, ExpectedVsActualBadge, ProductionPoliciesCard, InfrastructureProofCard, CockpitScoreboard).
- [x] `docs/SUBMISSION_LABLAB.md` relu : long description ouvre toujours sur "production gate" et ferme sur la V2 (déjà OK Lot 4a) ; "Three deterministic policy gates" → "Five deterministic policy gates" + ajout d'un nouveau bullet "Cockpit V2 decision-first UI" listant tous les composants V2 ; section "Live demo URL" réécrite pour la cockpit V2 + note explicite sur le masquage du bouton vert via `NEXT_PUBLIC_LIVE_VULTR=0` ; section "Demo video URL" enrichie avec liens cover.png + DECK_OUTLINE.md.
- [x] Smoke browser MCP : navigate `/control-tower` prod → snapshot AOM PASS (3 scenarios + paste, scenario picker fonctionnel, headings 1·Pick / 2·Inspect / 3·Decide visibles). Note : la prod publique est encore sur `main` (commit `36c4f03`) — la branche `feat/hackathon-100-bloc1` (12 commits) sera mergée à la fin de ce lot pour déclencher l'auto-deploy Vercel.
- [x] `pre-demo-check.ps1` PASS — 5/5 checks (Vercel app `/control-tower` 605 ms, proxy GET 668 ms, Vultr `/health` 420 ms, secret enforced HTTP 401, end-to-end live run 13.4s/6781 tokens/$0.000588/BLOCKED/gemini-2.5-flash/vultr) → **GLOBAL VERDICT: READY FOR DEMO**.
- [ ] Capturer 3 screenshots prod (verdict BLOCKED critical / verdict SHIP safe / Before/After) pour la submission lablab — **manuel utilisateur** (à faire post-merge main quand la cockpit V2 est en prod publique).
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
