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

## Format pour la prochaine entrée

Si on rouvre ce fichier post-hackathon, ajouter une nouvelle section avec timestamp ISO :

```
## YYYY-MM-DD — note rapide

- [ ] Item à traiter
- Cause / contexte
- Décision : ...
```
