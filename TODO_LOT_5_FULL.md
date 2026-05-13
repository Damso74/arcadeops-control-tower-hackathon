# TODO — Lot 5 FULL

## A. UI bridge — SSE compat layer (route `/api/arcadeops/run`)

- [ ] Créer `src/lib/runner/auth.ts` (helper `runnerHeaders()` — header `x-runner-secret` si env set).
- [ ] Réécrire `src/app/api/arcadeops/run/route.ts` :
  - drop des dépendances `ARCADEOPS_*` ;
  - POST `${RUNNER_URL}/run-agent` avec headers Vultr-secret ;
  - chunker le JSON `AgentRunTrace` en frames SSE Control Tower (`phase_change`, `step`, `tool_call`, `observability`, `result`, `done`) ;
  - mapping `phase` Vultr → ControlTowerPhase (planning→plan, tool_call→execute, risk_scan→evaluate, conclusion→summarize) ;
  - délais 80 ms entre frames pour effet « live ».
- [ ] Ajouter `x-runner-secret` aussi à `src/app/api/runner-proxy/route.ts` (sans rien casser).
- [ ] Mettre à jour `src/app/control-tower/page.tsx` `detectModeAvailability` : `live = !!RUNNER_URL`.
- [ ] Optionnel : badge « Powered by Gemini + Vultr » sur le bouton live (`DemoMissionLauncher`).
- [ ] `npx tsc --noEmit` + `npx eslint . --max-warnings=0` PASS.
- [ ] Smoke local : `npm run dev` + curl `/api/arcadeops/run` → frames SSE OK.
- [ ] Commit `feat(arcadeops/run): SSE compat layer over Vultr runner`.

## B. Sécurité runner — header `x-runner-secret`

- [ ] Générer `RUNNER_SECRET` via `python -c "import secrets;print(secrets.token_hex(32))"`.
- [ ] Étendre `runner/app/config.py` : `runner_require_secret`, `runner_secret`.
- [ ] Middleware FastAPI dans `runner/app/main.py` (skip `/health`, `hmac.compare_digest`).
- [ ] Mettre à jour `scripts/vultr-cloud-init.yaml.template` (ajouter `RUNNER_REQUIRE_SECRET=1` + `RUNNER_SECRET=__RUNNER_SECRET__`).
- [ ] Mettre à jour `scripts/vultr-provision.ps1` pour substituer `__RUNNER_SECRET__` depuis `$env:RUNNER_SECRET`.
- [ ] Commit `feat(runner): x-runner-secret middleware + cloud-init secret`.
- [ ] **Push GitHub** (cloud-init clone le repo public — il faut que le code soit pushed avant la recréation).
- [ ] `vercel env add RUNNER_SECRET production` × 3 scopes.
- [ ] `vultr-destroy.ps1` puis `vultr-provision.ps1 -Force -CloudInitPath scripts/vultr-cloud-init.yaml.template`.
- [ ] Attendre cloud-init (`curl http://${IP}/health` boucle).
- [ ] `vercel env rm RUNNER_URL production` puis re-add avec la nouvelle IP (ou laisser identique si chance).
- [ ] Smoke runner :
  - [ ] sans header → 401
  - [ ] mauvais header → 401
  - [ ] bon header → 200 + trace JSON valide.

## C. Smoke E2E final via browser MCP

- [ ] `npm run build` côté Vercel OK (pas d'erreur TS/lint).
- [ ] `vercel --prod --prebuilt` OU push main (auto-deploy).
- [ ] Browser MCP : `https://arcadeops-control-tower-hackathon.vercel.app/control-tower`.
- [ ] Bascule mode replay → clic « ⚡ Run live with ArcadeOps backend ».
- [ ] Vérifier EventTimeline + ToolCallCard + ObservabilityPanel + ResultCard remplis.
- [ ] Lancer Gemini judge → verdict obtenu.
- [ ] Screenshot final.
- [ ] Console : 0 erreur réseau, 0 occurrence `GEMINI_API_KEY`, `is_mocked:false` confirmé.

## D. Documentation

- [ ] Section `## Live demo (60-second tour)` dans `README.md` (URL prod + 3 étapes jury).
- [ ] Commit `docs(readme): add live demo section pointing to Vercel + Vultr stack`.

## Verdict final

- [ ] Sections `=== ÉTAPE === ` + `=== VERDICT GLOBAL ===` selon template du Plan §8.
