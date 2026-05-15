# HACKATHON_POST_DEMO_NOTES — opportunités de refactor à traiter APRÈS submission

> Créé en fin de Lot 4c (15 mai 2026). Ce fichier capture les opportunités de refactor / améliorations
> identifiées pendant l'exécution des 12 lots du `HACKATHON_100_MASTER_PLAN.md` mais **volontairement
> non exécutées** pour respecter le scope strict (pas de refonte cosmétique pendant un sprint critique).
>
> Aucun de ces items n'est bloquant pour la submission AI Agent Olympics du 20 mai 2026.
> À traiter en post-mortem si on continue le projet, ou à archiver si le projet s'arrête après le hackathon.

---

## P1 — Bug de prod découvert et corrigé en hotfix (à pérenniser)

### `useSyncExternalStore` contract — leçon apprise

- **Symptôme** : après merge `feat/hackathon-100-bloc1` → `main`, page `/control-tower` crash en prod
  Vercel avec `Uncaught Error: Minified React error #185` (infinite render loop).
- **Cause racine** : `CockpitScoreboard.tsx::getSnapshot()` retournait un nouvel objet
  `ScoreboardCounters` à chaque appel via `getCounters()` (lit `localStorage` + parse JSON).
  React 19 appelle `getSnapshot` en boucle pour comparer (par référence). Comme la référence
  changeait à chaque tick, React détectait une "nouvelle" valeur, déclenchait un re-render,
  qui rappelait `getSnapshot`, etc. → boucle infinie.
- **Fix appliqué (commit `241a36b`)** : snapshot caché module-level (`cachedSnapshot`) + helper
  `countersEqual` qui compare structurellement les 7 champs. Si égal → réutilise la référence
  cachée. Invalidation explicite dans `notifyScoreboardChange()` et le handler `onStorage` du
  `subscribe`. `getServerSnapshot()` retourne désormais une référence SSR stable (`SSR_SNAPSHOT`).
- **À pérenniser** : ajouter une rule ESLint custom ou un test unitaire `vitest` qui vérifie que
  toute fonction passée à `useSyncExternalStore` retourne une référence stable quand les valeurs
  sont identiques. Documenter ce pattern dans un éventuel `docs/REACT_PATTERNS.md`.

---

## P2 — Refactor opportunities notées en route (non bloquantes)

### Architecture cockpit
- `ControlTowerExperience.tsx` est volumineux (~600+ lignes) — pourrait être découpé en
  sous-composants par section (HeroBlock, EvidencePanel, DecisionPanel) si on continue le projet
  au-delà du hackathon.
- `useScrollAnchor` / `useIntersectionObserver` du stepper : extraire dans un hook partagé
  `src/hooks/useStickyStepper.ts` pour réutilisation si on ajoute d'autres pages avec stepper.
- `getCounters()` / `setCounters()` dans `CockpitScoreboard.tsx` : la sérialisation
  `localStorage` pourrait passer par un helper générique `useLocalStorageState<T>` typé Zod
  pour éviter la duplication avec `RecommendedDemoBanner.tsx`.

### Tests
- Aucune suite Vitest n'a été créée pendant le sprint (scope strict). Le filet `scripts/smoke-policy-gates.ts`
  et `pre-demo-check.ps1` couvrent l'essentiel à court terme. Si on continue, ajouter :
  - Vitest unit tests pour `verdict-consistency.ts` (3 règles déterministes)
  - Vitest unit tests pour `CockpitScoreboard` (avec mock `localStorage`)
  - Playwright E2E pour le wow path (clic critical scenario → Run Gemini judge → verdict BLOCKED)
- Note : la suite `scripts/smoke-policy-gates.ts` (T1-T5) a été écrite **avant** Lot 2b comme filet
  de sécurité — ce pattern marche bien et pourrait être généralisé.

### Backend Vultr
- L'app FastAPI Python sur Vultr (`fra` Frankfurt, $6/mo) est minimaliste — pas de pool de connexions
  réutilisables côté Gemini, chaque run réinstancie le client. Pour la prod long terme, ajouter un
  pool + un cache LRU sur les traces sample (4 fixtures connues = 4 cache hits sur les démos jury).
- L'endpoint `/health` répond en ~420 ms ce qui est OK pour la `InfrastructureProofCard` mais
  pourrait être < 100 ms avec un cache 60 s côté FastAPI (`@lru_cache` sur la réponse JSON statique).

### UX
- Le bouton vert `⚡ Run live with ArcadeOps backend` est masqué en prod publique
  (`NEXT_PUBLIC_LIVE_VULTR=0`) parce que 130 s/run = trop long pour démo jury. Si on veut le
  ré-exposer post-hackathon, ajouter un timeout client + un message "Long live run, ~2 min" avec
  une barre de progression réelle (pas juste un spinner).
- Les 4 sample buttons du PasteCard (gated `NEXT_PUBLIC_HACKATHON_MODE=cockpit_v6`) pourraient
  devenir un dropdown avec icônes pour réduire la hauteur du panel mobile.
- `RecommendedDemoBanner` dismissed est persisté en localStorage MAIS pas par session
  (un même utilisateur qui revient après plusieurs jours ne le revoit pas). Si on continue,
  ajouter un TTL 30 jours via timestamp dans la valeur stockée.

### Documentation
- `README.md` est à jour (Lot 4c) mais long (~600 lignes). Pour la maintenance long terme,
  découper en `README.md` (intro + quick start + screenshots) + `docs/ARCHITECTURE.md` (le bloc
  Mermaid + la justification 5 gates) + `docs/DEMO.md` (le wow path détaillé).
- `docs/SUBMISSION_LABLAB.md` peut être archivé après le 20 mai (post-submission) et remplacé
  par un `docs/POSTMORTEM.md` qui résume le résultat (placement, retours jury, leçons).

---

## P3 — Idées explorées et abandonnées (à ne PAS reprendre)

- **Migration vers shadcn/ui** : envisagée pour uniformiser les composants, abandonnée parce que
  le coût de migration > bénéfice sur un repo de démo. Garder Tailwind v4 + composants custom.
- **Ajout d'un mode dark/light toggle** : l'app est full dark intentionnellement (positionnement
  produit "control tower" = mission control NASA). Ne pas ajouter de toggle.
- **i18n FR/EN** : abandonné, l'app vise un jury anglophone pour Milan AI Week. Tout en EN.
- **Animation framer-motion sur le verdict** : un petit fade-in suffit, pas besoin de spring/scale
  qui détourneraient l'attention du score 0/100.

---

## 2026-05-15 — UX V2.2 Gate Mode (mission `ARCADEOPS_GATE_MODE_UI_V2_2`)

Refonte cockpit guided pour le hackathon AI Agent Olympics — un seul commit
`feat(ui): add guided Gate Mode cockpit for hackathon demo` couvrant les
22 sections du brief V2.2.

**Nouveautés introduites :**

- **Compact security audit dashboard header** (`CompactDashboardHeader.tsx`) —
  remplace le hero V0–V5. Embarque l'emblème `BrandLogoMark` (radar + bouclier
  inline SVG, pas d'asset externe), titre `Production Security Audit`,
  sous-titre, punchline V2 verbatim, badges `Production Gate` + `Live Gemini
  Audit`/`Deterministic Replay` + `Vultr Online` (réutilisation de
  `pollHealth`).
- **Agent Test Gallery** (`TraceScenarioPicker.tsx`) — section renommée +
  helper text + CTA `Select run` (au lieu de `Audit this run`, qui prêtait à
  confusion). Marqueurs `data-section="agent-test-gallery"` et
  `data-cta="select-run"` pour scroll programmatique.
- **Selected Run Summary card** (`SelectedRunSummaryCard.tsx`) — cœur du
  cockpit. Affiche titre / risque / décision attendue / 3 findings clés /
  metrics ribbon / `GateStatus` / CTA primaire « Run Gemini Production Gate ».
  Pure présentationnel, pilote l'audit via le hook `useGeminiJudge`.
- **Gate Status** (`GateStatus.tsx`) — signature visuelle ArcadeOps. Mappe
  le verdict Gemini sur 4 états cinématiques (`awaiting` / `blocked` /
  `paused` / `open`) avec emblèmes Lucide + palette dédiée.
- **CockpitTabs** (`CockpitTabs.tsx`) — primitive de progressive disclosure,
  ARIA `role="tablist"`. Onglets `Summary / Evidence / Policies /
  Infrastructure / Trace`. Lazy-mount des panels inactifs.
- **AgentPipelineDiagram** (`AgentPipelineDiagram.tsx`) — chaîne narrative
  par scénario (CRM critique, support draft, recherche safe).
- **GeminiScanTicker** (`GeminiScanTicker.tsx`) — animation scan 5 étapes
  pendant l'audit (2 s ticker plancher pour ne jamais "trop court").
- **VerdictRevealCard** (`VerdictRevealCard.tsx`) — wrapper cinématique du
  `JudgeResultView` historique : Gate Status hero banner + auto-scroll +
  fade-in restreint. La `InfrastructureProofCard` est masquée à l'intérieur
  car déjà servie par l'onglet Infrastructure.
- **TraceJsonInspector** (`TraceJsonInspector.tsx`) — onglet Trace, hidden
  by default. Affiche le JSON brut + bouton « Download verdict JSON » ; se
  remplit uniquement après verdict.
- **`useGeminiJudge` hook** (`src/lib/control-tower/use-gemini-judge.ts`) —
  centralise l'appel `/api/gemini/judge` (state machine
  `idle | loading | ready | error`, ticker plancher 2 s, abort signal,
  reset sur changement de `judgeKey`, exposition `lastAuditLatencyMs` réel).
- **`RecommendedDemoBanner`** retravaillé — 5 étapes action-oriented,
  steps cliquables avec `scrollIntoView` (Agent Test Gallery + Summary
  anchor), persistance `localStorage` inchangée.
- **Smoke V2.2** (`scripts/smoke-gate-mode-v22.ts` + entrée
  `npm run smoke:gate-mode-v22`) — couvre les 17 assertions du brief §20,
  dont 12 assertions HTML + 2 assertions verdict déterministes via
  `applyProductionPolicyGates` + `enforceVerdictConsistency` ; 3 dynamiques
  (React #185, scan animation, persistance Copy/Export après verdict)
  marquées `MANUAL` et validées via browser MCP en prod.

**Préservé verbatim (zéro régression) :**

- Punchline V2 : *Gemini judges. Vultr runs. ArcadeOps blocks unsafe
  autonomous agents before production.*
- Contrat `useSyncExternalStore` du `CockpitScoreboard` (snapshot caché +
  `countersEqual`) intact, déplacé sous le header sans modification.
- 5 production policies (T1-T5) — `scripts/smoke-policy-gates.ts` reste
  vert.
- PasteCard `cockpit_v6` (samples + Clear + Export verdict JSON).
- Vultr Infrastructure Proof Card + health polling 30 s.
- `NEXT_PUBLIC_LIVE_VULTR=0` (mode Live ArcadeOps masqué en prod publique).
- Wow path historique : critical CRM → BLOCKED + Gate Closed,
  ExpectedVsActualBadge MATCH, scoreboard tick à 1.

**Composants devenus secondaires (non supprimés) :**

- `GeminiJudgePanel.tsx` — son state machine est désormais portée par
  `useGeminiJudge`, mais l'export `JudgeResultView` + `verdictPalette`
  reste réutilisé par `VerdictRevealCard`. À considérer pour suppression
  post-hackathon si on confirme qu'aucune autre surface ne dépend du
  panel original.

**Décisions de scope (refus volontaires) :**

- **§18 sidebar** : skipped (le brief autorise explicitement le skip).
- Pas de nouveau scénario, pas de nouvelle route, pas de refonte
  `ControlTowerExperience.tsx` au-delà du strict nécessaire.

**Patch de clarté V2.2.1 (2026-05-15 PM) :**

- 2026-05-15 (PM) — Clarity patch: heading "Start here", support label
  aligné verdict réel, "Under the hood" derrière disclosure.

---

## Format pour la prochaine entrée

Si on rouvre ce fichier post-hackathon, ajouter une nouvelle section avec timestamp ISO :

```
## YYYY-MM-DD — note rapide

- [ ] Item à traiter
- Cause / contexte
- Décision : ...
```
