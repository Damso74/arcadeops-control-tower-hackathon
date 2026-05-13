# Lot 5 FULL — Plan d'exécution (ArcadeOps Control Tower)

> Pitch : « Gemini runs the agent. Vultr executes the workflow. ArcadeOps decides if it can ship. »

## 0. Contexte (état d'entrée)

Voir aussi `LOT_2_PLAN.md` (V0 SSE Control Tower) et le runbook `docs/runbooks/DEPLOYMENT_VULTR.md`.

| Composant | État Lot 4 (entrée) | Cible Lot 5 FULL |
| --- | --- | --- |
| Runner FastAPI Vultr (`runner/app/*`) | Public, expose `POST /run-agent`, `GET /health`. Stateful Gemini sur la VM uniquement. | Header obligatoire `x-runner-secret` (kill-switch `RUNNER_REQUIRE_SECRET=1`). Ré-déployé via cloud-init. |
| `src/app/api/runner-proxy/route.ts` | Proxy plain JSON Vercel → Vultr. | Inchangé fonctionnellement, mais ajoute le header `x-runner-secret` avant POST upstream. **Reste comme fallback** (curl-friendly, debug). |
| `src/app/api/arcadeops/run/route.ts` | Déconnecté : exige `ARCADEOPS_API_BASE_URL` + `ARCADEOPS_DEMO_TOKEN`. Émet déjà du SSE Control Tower. | Re-câblé sur le runner Vultr (`/run-agent`), récupère le JSON `AgentRunTrace`, le **chunke en frames SSE Control Tower** (`phase_change`, `step`, `tool_call`, `observability`, `result`, `done`). |
| `src/app/control-tower/page.tsx` (`detectModeAvailability`) | `live = ARCADEOPS_API_BASE_URL && ARCADEOPS_DEMO_TOKEN && ARCADEOPS_DEMO_AGENT_ID`. | `live = !!RUNNER_URL` (le bouton « Run live with ArcadeOps backend » s'allume si la VM Vultr est branchée). |
| `DemoMissionLauncher.tsx` + downstream UI | Compatibles Control Tower SSE. | **Aucun changement** (le but du A1) : la même boucle d'événements alimente EventTimeline, ToolCallCard, ObservabilityPanel, ResultCard, et build le snapshot pour `GeminiJudgePanel`. |
| Vercel env | `RUNNER_URL=http://140.82.35.52` (prod+preview+dev). | Ajout `RUNNER_SECRET=<32B hex>` (mêmes scopes). `RUNNER_URL` mis à jour si l'IP Vultr change après recréation. |

## 1. Décisions binaires (avec justification)

### A — UI bridge → **A1 (réécrire `/api/arcadeops/run` en SSE compat)**

**Pourquoi A1 plutôt que A2** :
- **Coût** : ~150 LOC dans la route Next.js, zéro touche aux composants React. A2 demanderait un nouveau composant + branchement dans `ControlTowerExperience` + un cas d'état parallèle dans `selection.mode`.
- **Pitch UX** : `DemoMissionLauncher` est déjà câblé pour streamer la frise « plan → tool call → observability → verdict », et son `onSnapshotReady` alimente le `GeminiJudgePanel` V4+V5 sans aucun glue code. A1 réutilise tout ça.
- **Compatibilité** : la route `/api/runner-proxy` reste live → fallback debug et garantie « Lot 4 minimal ne casse pas ».

### B-deploy → **B-deploy-1 (recréer la VM via cloud-init)**

**Pourquoi B-deploy-1** :
- Teste de bout en bout le flux cloud-init que nous voulons réutiliser après le hackathon (audit de reproductibilité).
- Pas de surface d'attaque supplémentaire (`/admin/redeploy` serait une faille permanente s'il fuit).
- ~5 min de coût + un `vercel env update RUNNER_URL` derrière → toujours moins risqué qu'un endpoint admin perpétuel.
- Contrainte locale (FortiGuard bloque SSH) confirme que la voie « push code via SSH manuel » n'est pas tenable.

**Risque accepté** : l'IP Vultr changera. On le gère par un commit atomique « update RUNNER_URL Vercel + push » qui suit immédiatement la recréation.

## 2. Spec technique — Mission A (SSE compat)

### 2.1 Contrat d'entrée

```ts
POST /api/arcadeops/run
Body: { mission?: string; missionId?: string; scenario?: "vip_churn" | "safe_research" }
```

`missionId` (existant) sert juste de hint UI pour `DemoMissionLauncher`, on le passe à travers comme `mission` si `mission` est vide. `scenario` par défaut : `vip_churn` (cohérent avec le runner FastAPI).

### 2.2 Algo

1. Lire `RUNNER_URL` (env, `.trim()` pour CRLF) ; si absent → `singleFrameErrorResponse("Vultr runner not configured")`.
2. POST `${RUNNER_URL}/run-agent` avec headers `Content-Type: application/json`, `x-runner-secret: ${RUNNER_SECRET}` (si défini), body `{mission, scenario}`. Timeout 85s.
3. Parser le JSON `AgentRunTrace`. Si shape invalide → `singleFrameErrorResponse("Invalid trace shape")`.
4. **Chunker en SSE Control Tower** dans un `ReadableStream<Uint8Array>` :
   - `phase_change(phase=plan, status=running)` au début ;
   - pour chaque step : `phase_change` + `step` + (si `tool_calls`) `tool_call` × N ;
   - mapping phase :
     - `planning` → `plan`
     - `tool_call` → `execute`
     - `risk_scan` → `evaluate`
     - `conclusion` → `summarize`
     - défaut → `execute`
   - une `observability` finale construite depuis `cost_usd`, `tokens_used`, `region`, `model`, `runner` + un `latencyMs` calculé `completed_at - started_at` ;
   - une `result` finale dont `title = mission`, `summary = verdict.reasons.join("\n") || "Run completed."`, `recommendations = verdict.policy_gates.filter(!passed).map(g => g.reason).slice(0,3)` ;
   - `done({reason: verdict.verdict})`.
5. Petit `await new Promise(r => setTimeout(r, 80))` entre les frames pour donner un effet « live » à la frise sans rallonger le wallclock total (la trace est déjà reçue).

### 2.3 Garde-fous

- Aucun changement aux types `ControlTowerEvent` (déjà figés Lot 2).
- `risk_findings[].severity` est mappé vers `riskFlags` (string[] côté observability) → `["${sev}: ${cat}"]`.
- Si la trace n'a pas de `verdict`, on émet quand même `done({reason: "completed"})`.
- Le timeout côté Vercel reste `maxDuration = 300` (config existante).
- Toute erreur upstream → `error` event + `done({reason: "upstream_error"})`.

### 2.4 Wiring page

Dans `src/app/control-tower/page.tsx` :

```ts
function detectModeAvailability(): ControlTowerModeAvailability {
  const runnerUrl = process.env.RUNNER_URL?.trim();
  return { replay: true, live: Boolean(runnerUrl) };
}
```

→ le bouton « Run live with ArcadeOps backend » s'allume immédiatement en prod (env déjà set Lot 4).

## 3. Spec technique — Mission B (sécurité runner)

### 3.1 Génération du secret

`scripts/generate-runner-secret.ps1` (nouveau, optionnel — sinon `python -c "import secrets;print(secrets.token_hex(32))"`).
- 64 chars hex (32 bytes d'entropie, OK pour HMAC sans rainbow).
- Imprimé une seule fois sur stdout, jamais loggé ailleurs.

### 3.2 Middleware FastAPI

Ajout dans `runner/app/main.py` :

```python
@app.middleware("http")
async def enforce_runner_secret(request, call_next):
    if not settings.runner_require_secret:
        return await call_next(request)
    if request.url.path == "/health":  # health stays public for cloud probes
        return await call_next(request)
    received = request.headers.get("x-runner-secret", "")
    expected = settings.runner_secret or ""
    if not expected or not hmac.compare_digest(received, expected):
        return Response(status_code=401, content='{"error":"missing_or_invalid_runner_secret"}', media_type="application/json")
    return await call_next(request)
```

`Settings` enrichi de :
- `runner_require_secret: bool = Field(default=False, alias="RUNNER_REQUIRE_SECRET")`
- `runner_secret: str | None = Field(default=None, alias="RUNNER_SECRET")`

**Comportement** :
- `RUNNER_REQUIRE_SECRET` absent ou `0` → passe-through (rétro-compat Lot 4).
- `RUNNER_REQUIRE_SECRET=1` + `RUNNER_SECRET` absent → bloque tout sauf `/health`.
- `RUNNER_REQUIRE_SECRET=1` + `RUNNER_SECRET` set → vérifie via `hmac.compare_digest` (constant-time).

### 3.3 Cloud-init

`scripts/vultr-cloud-init.yaml.template` enrichi :
```yaml
- path: /opt/arcadeops/.env
  content: |
    GEMINI_API_KEY=__GEMINI_API_KEY__
    GEMINI_MODEL=gemini-2.5-flash
    ALLOWED_ORIGINS=https://arcadeops-control-tower-hackathon.vercel.app,http://localhost:3000
    RUNNER_REQUIRE_SECRET=1
    RUNNER_SECRET=__RUNNER_SECRET__
```

`vultr-provision.ps1` :
- Nouveau marqueur `__RUNNER_SECRET__` substitué via `$env:RUNNER_SECRET`.
- `Resolve-CloudInit` enrichi pour exiger les deux marqueurs.

### 3.4 Branchement Next.js

Helper `src/lib/runner/auth.ts` (nouveau, ~25 LOC) :
```ts
export function runnerHeaders(): Record<string, string> {
  const secret = process.env.RUNNER_SECRET?.trim();
  return secret ? { "x-runner-secret": secret } : {};
}
```

Utilisé par :
- `src/app/api/runner-proxy/route.ts`
- `src/app/api/arcadeops/run/route.ts`

### 3.5 Smoke d'acceptation runner

Après recréation VM :
```
curl http://${IP}/health                                     -> 200
curl -X POST http://${IP}/run-agent -H 'Content-Type: application/json' -d '{"mission":"x"}'              -> 401 (sans header)
curl -X POST http://${IP}/run-agent -H 'Content-Type: application/json' -H 'x-runner-secret: WRONG' -d '{"mission":"x"}'  -> 401
curl -X POST http://${IP}/run-agent -H 'Content-Type: application/json' -H "x-runner-secret: ${SECRET}" -d '{"mission":"x"}'  -> 200
```

## 4. Variables Vercel finales

| Var | Scope | Valeur |
| --- | --- | --- |
| `RUNNER_URL` | prod+preview+dev | `http://<nouvelle IP Vultr>` (mise à jour après recréation) |
| `RUNNER_SECRET` | prod+preview+dev | secret hex 64-char (jamais commit) |
| `GEMINI_API_KEY` | prod+preview+dev | inchangé (déjà set Lot 4 minimal pour `/api/gemini/judge`) |

## 5. Smoke E2E final (Mission C)

1. `https://arcadeops-control-tower-hackathon.vercel.app/control-tower`
2. Cliquer « Replay an agent run » (bascule mode replay) → cliquer « ⚡ Run live with ArcadeOps backend ».
3. Observer en temps réel : phase pills (plan→execute→summarize), `EventTimeline` qui se remplit, `ToolCallCard` × 5+, `ObservabilityPanel` (cost, tokens, latency), `ResultCard` (verdict).
4. Une fois la frise complète, cliquer « Run Gemini reliability judge » → verdict Gemini en bas.
5. Screenshot final + vérifier console : `is_mocked:false` (source), 0 erreur réseau, aucune apparition de `GEMINI_API_KEY` dans les payloads.

## 6. Polish UX inclus dans le scope

(coût ~10-15 min, gain « wow »)

- Sur le bouton live : badge `Powered by Gemini + Vultr` à la place de « Dev mode ».
- Footer Control Tower : phrase clé avec le pitch 1-liner.
- (déjà existant) `MissionStatusBadge` couvre le loading state.
- README : nouvelle section « Live demo (60-second tour) » avec 3 étapes ultra-courtes pour le jury.

## 7. Plan d'exécution séquentiel

1. **Plan + TODO** (ce fichier).
2. **A** — réécrire `/api/arcadeops/run` + `detectModeAvailability` + helper `runnerHeaders`.
3. **A** — `npx tsc --noEmit` + `npx eslint .` + smoke local (Next dev) → commit.
4. **B** — middleware FastAPI + cloud-init + script provision → commit.
5. **B** — générer `RUNNER_SECRET`, le poser sur Vercel + sur l'env local PowerShell.
6. **B** — `vultr-destroy.ps1` puis `vultr-provision.ps1 -CloudInitPath ...` → noter nouvelle IP, mettre à jour `RUNNER_URL` sur Vercel.
7. **B** — smoke runner (3 curls).
8. **Vercel** — `vercel --prod --prebuilt` (ou push main qui trigger).
9. **C** — smoke E2E browser MCP avec screenshot.
10. **D** — README section Live demo + commit.
11. **Verdict ArcadeOps** dans la réponse finale.

## 8. Verdict (template d'autoévaluation)

```
=== ÉTAPE A. SSE compat /api/arcadeops/run ===
HTTP_CODE: 200
WALL_TIME_S: <…>
events_emitted: <…>
verdict: PASS|FAIL

=== ÉTAPE B. Sécurité runner x-runner-secret ===
sans_header: 401
mauvais_header: 401
bon_header: 200
verdict: PASS|FAIL

=== ÉTAPE C. Smoke E2E browser MCP ===
button_clicked: true
events_streamed: <…>
gemini_verdict: <…>
console_clean: true
gemini_key_leaked: false
is_mocked: false
verdict: PASS|FAIL

=== VERDICT GLOBAL ===
READY TO MERGE | MERGEABLE AFTER MINI FIX | NOT READY
```
