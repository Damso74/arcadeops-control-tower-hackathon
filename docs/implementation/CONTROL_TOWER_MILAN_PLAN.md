# ArcadeOps Control Tower Milan Plan

## 1. Vision & Punchline

Gemini runs the agent.
Vultr executes the workflow.
ArcadeOps decides if it can ship.

## 2. Triangle Gagnant

| Pilier | Role demo | Valeur jury |
|---|---|---|
| Google Gemini | Raisonnement agentique et function calling natif | Application of Technology |
| Vultr | Runner FastAPI/Docker qui execute le workflow hors frontend | Application of Technology + Presentation |
| ArcadeOps | Control Tower, audit risque, policy gates et readiness report | Business Value + Originality |

## 3. Scenario Demo Fige

Un client VIP enterprise menace de churn apres une violation de SLA. L'agent doit inspecter le contexte client, verifier la policy interne, preparer une reponse, puis tenter deux actions sensibles : `crm.update` et `email.send`.

La premiere execution volontairement risquee contient une note client avec injection de prompt et aucune approbation humaine valide. Le Risk Agent detecte l'injection et l'approval manquante. La Control Tower bloque la mise en production avec preuves detaillees.

La demo applique ensuite des guardrails, relance le scenario et passe de `BLOCKED` a `NEEDS_REVIEW`, puis exporte un Production Readiness Report pour montrer la valeur business : accelerer l'automatisation sans laisser partir une action dangereuse.

## 4. Architecture Cible

```text
Browser
  |
  v
Vercel / Next.js 15 App Router
  |
  | POST VULTR_RUNNER_URL/run-agent
  v
Vultr Cloud Compute VM
FastAPI runner + Docker
  |
  | Gemini function calling
  v
Google Gemini API
  |
  v
Trace JSON
tools + risks + evidence + verdict
  |
  v
Control Tower UI
visual replay + decision + report export
```

## 5. Stack Technique Verrouillee

| Choix | Valeur |
|---|---|
| Frontend | Next.js 15 App Router + TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui + Framer Motion leger |
| Runner backend | FastAPI Python + Docker |
| Hebergement runner | Vultr Cloud Compute VM |
| Hebergement frontend | Vercel |
| LLM | Google Gemini API, `gemini-2.5-flash` par defaut |
| Repo GitHub | Public, `arcadeops-control-tower-hackathon` |
| Storage | In-memory runner + JSON fixtures |
| Auth | Aucune, demo publique |
| MCP | Pas de serveur MCP reel, registry "MCP-compatible" seulement |
| Streaming | Faux streaming visuel cote client |
| Agents | 4 max : Planner, Worker, Risk, Control Tower |

## 6. Hierarchie Features

### Must-have

- Vultr runner reel.
- Gemini Planner reel.
- Tool registry serveur.
- Trace live generee.
- Control Tower audit.
- Policy gates deterministes.
- Verdict consistency.
- Guardrails before/after.
- Production Readiness Report.
- Demo Wizard premium.

### Strong Stretch

- Prompt injection detectee par Risk Agent.
- Policy YAML read-only.
- Faux streaming visuel.
- PDF report export.
- Cover image clean.
- Deck 6 slides.

### Moonshot

Uniquement si tout est vert J6 :

- MCP server reel.
- PDF multimodal reel.
- Streaming SSE reel.
- 7 agents.
- Human approval modal avancee.
- Scenario builder.

## 7. Plan 6 Lots

### Lot 1 — Vultr Runner Minimal

| Champ | Detail |
|---|---|
| Objectif binaire | Runner FastAPI deployable avec `/health` et `/run-agent` mocke. |
| Fichiers concernes | `runner/app/main.py`, `runner/app/routes/health.py`, `runner/app/routes/run_agent.py`, `runner/Dockerfile`, `runner/docker-compose.yml`, `.env.example`, `src/lib/runner-client.ts`. |
| Dependances | Scaffolding initial valide. |
| PASS/FAIL | PASS si un appel depuis Vercel prod retourne 200 + trace JSON. FAIL sinon. |
| Risques de regression | CORS mal configure, URL Vultr absente, fixture incompatible avec le frontend. |
| Estimation | 1 jour. |

### Lot 2 — Live Gemini Planner + Worker

| Champ | Detail |
|---|---|
| Objectif binaire | Gemini 2.5 Flash genere une trace live Planner + Worker avec function calling. |
| Fichiers concernes | `runner/app/agents/*`, `runner/app/tools/*`, `runner/app/routes/run_agent.py`, `runner/app/models/trace.py`, `src/lib/runner-client.ts`. |
| Dependances | Lot 1 vert sur Vultr + `GEMINI_API_KEY` active. |
| PASS/FAIL | PASS si la trace live est generee bout-en-bout depuis l'UI. FAIL si fallback fixture obligatoire. |
| Risques de regression | Rate-limit Gemini, schema function calling instable, divergence camelCase/snake_case. |
| Estimation | 1.5 jour. |

### Lot 3 — Control Tower Audit

| Champ | Detail |
|---|---|
| Objectif binaire | Risk Agent + Control Tower produisent un verdict `BLOCKED` avec evidence. |
| Fichiers concernes | `runner/app/agents/risk.py`, `runner/app/agents/control_tower.py`, `runner/app/tools/policy.py`, `runner/app/models/trace.py`, UI decision card. |
| Dependances | Lot 2 trace live stable. |
| PASS/FAIL | PASS si le scenario VIP-churn renvoie `BLOCKED` avec evidence detaillee. FAIL si le verdict varie ou manque de preuves. |
| Risques de regression | Verdict non deterministe, detection injection trop vague, policy gates trop permissifs. |
| Estimation | 1 jour. |

### Lot 4 — Premium UX

| Champ | Detail |
|---|---|
| Objectif binaire | Parcours demo premium complet, lisible et stable. |
| Fichiers concernes | `app/page.tsx`, `app/control-tower/page.tsx`, `src/components/*`, `docs/design/BRAND.md`. |
| Dependances | Lots 1-3 fonctionnels. |
| PASS/FAIL | PASS si le wizard complet tourne sans bug et rend une experience Linear/Vercel/command-center. FAIL si le parcours casse ou semble brouillon. |
| Risques de regression | Trop d'animations, surcharge visuelle, confusion entre BLOCKED et NEEDS REVIEW. |
| Estimation | 1.5 jour. |

### Lot 5 — Submission Pack

| Champ | Detail |
|---|---|
| Objectif binaire | Tous les assets Lablab sont prets. |
| Fichiers concernes | `README.md`, `docs/submission/LABLAB_CHECKLIST.md`, deck, cover, video script, diagrammes. |
| Dependances | Lot 4 parcours finalise. |
| PASS/FAIL | PASS si la soumission est complete cote contenu. FAIL si un asset critique manque. |
| Risques de regression | Story trop technique, video trop longue, repo public incomplet. |
| Estimation | 1 jour. |

### Lot 6 — Stabilization

| Champ | Detail |
|---|---|
| Objectif binaire | Demo stable sur prod et soumission envoyee. |
| Fichiers concernes | Tout le repo, screenshots backup, fixtures fallback. |
| Dependances | Lots 1-5 termines. |
| PASS/FAIL | PASS si soumission validee + 3 runs consecutifs stables. FAIL sinon. |
| Risques de regression | Vultr down, Gemini rate-limit, console bruyante, asset video obsolete. |
| Estimation | 1 jour. |

## 8. Calendrier 7 Jours

| Jour | Focus | Sortie attendue |
|---|---|---|
| J1 | Lot 1 | Runner Vultr minimal deploye et appele par Vercel. |
| J2 | Lot 2 | Planner + Worker Gemini live avec tools mockes. |
| J3 | Lot 3 | BLOCKED deterministe avec evidence. |
| J4 | Lot 4 | UI premium et wizard complet. |
| J5 | Lot 4 + Lot 5 | Guardrails before/after, report, deck et script video. |
| J6 | Lot 5 + Lot 6 | Enregistrement 90 s, screenshots backup, smoke prod. |
| J7 | Lot 6 | Soumission Lablab envoyee et demo stable. |

## 9. Kill-switches & Fallbacks

| Risque | Fallback |
|---|---|
| Vultr down | Frontend charge `src/fixtures/deterministic-trace.json` et affiche un badge fixture. |
| Gemini rate-limit | Runner bascule en mode fixture `runner/app/fixtures/mock-trace.json`. |
| CORS prod bloque | Autoriser explicitement l'origine Vercel via `CORS_ALLOWED_ORIGINS`. |
| Demo instable | Rejouer le faux streaming visuel depuis la trace deterministe. |
| Export indisponible | Export Markdown texte avant tout PDF. |

## 10. Criteres De Soumission Lablab

- Cover image sobre, lisible, orientee security command center.
- Video 90 s avec narration claire : problem, agent, block, guardrails, report.
- Deck 6 slides : problem, architecture, tech sponsors, demo flow, business value, next steps.
- Repo public `arcadeops-control-tower-hackathon`.
- URL demo Vercel publique.
- Runner Vultr documente et reproductible.
- README final avec quickstart.

## 11. Anti-scope

Ne pas faire pendant les lots principaux :

- Pas de serveur MCP reel.
- Pas de PDF multimodal reel.
- Pas de mobile-first avance.
- Pas de 7 agents.
- Pas de streaming SSE reel.
- Pas de Coolify.
- Pas de Serverless Inference.
- Pas de Supabase, Prisma, BullMQ ou Redis.
- Pas d'auth.
- Pas de scenario builder avant J6 vert.
