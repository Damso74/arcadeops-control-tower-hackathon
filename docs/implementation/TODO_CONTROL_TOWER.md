# TODO Control Tower

## Pre-requis Bloquants

- [ ] Compte Vultr active + carte CB validee.
- [ ] Cle `GEMINI_API_KEY` generee via Google AI Studio.
- [ ] Compte Vercel lie au repo GitHub.
- [ ] Domaine custom optionnel choisi ou explicitement reporte.

## Lot 1 — Vultr Runner Minimal

- [x] Verifier que `/health` retourne le JSON attendu en local.
- [x] Verifier que `/run-agent` retourne la fixture mockee en local.
- [x] Aligner le schema JSON runner avec `src/lib/types.ts`.
- [x] Configurer `ALLOWED_ORIGINS` pour l'URL Vercel (voir `runner/.env.example` + `docs/runbooks/DEPLOYMENT_VULTR.md`).
- [ ] Construire l'image Docker localement.
- [ ] Provisionner une VM Vultr Cloud Compute.
- [ ] Installer Docker sur la VM Vultr.
- [ ] Deployer le runner sur la VM Vultr.
- [ ] Ouvrir le port HTTP necessaire.
- [ ] Configurer `VULTR_RUNNER_URL` cote Vercel.
- [ ] Tester l'appel frontend prod vers `/run-agent`.
- [ ] Documenter l'URL runner retenue.

## Lot 2 — Live Gemini Planner + Worker

### Lot 2a — Scaffolding (Gemini + tools Python)

- [x] Creer le module agent Planner.
- [x] Creer le module agent Worker.
- [x] Definir le registry tools mockes serveur.
- [x] Ajouter `kb.search`.
- [x] Ajouter `crm.lookup`.
- [x] Ajouter `crm.update_attempt`.
- [x] Ajouter `email.draft`.
- [x] Ajouter `email.send_attempt`.
- [x] Ajouter `policy.check`.
- [x] Ajouter `approval.request`.
- [x] Ajouter `audit.log`.
- [x] Ajouter `budget.check`.
- [x] Ajouter `risk.scan`.
- [x] Ajouter le client Gemini runner.
- [x] Mapper function calling Gemini vers les tools mockes.
- [x] Ajouter fallback fixture sur erreur Gemini.

### Lot 2b — Gemini brain (prompts + robustesse)

- [ ] Retourner une trace live compatible UI.
- [ ] Tester une execution bout-en-bout depuis l'UI.

## Lot 3 — Control Tower Audit

- [ ] Creer le Risk Agent.
- [ ] Creer le Control Tower Agent.
- [ ] Ajouter detection prompt injection sur la trace.
- [ ] Ajouter detection approval manquante.
- [ ] Ajouter policy gate deterministe `crm.update`.
- [ ] Ajouter policy gate deterministe `email.send`.
- [ ] Stabiliser le verdict `BLOCKED`.
- [ ] Ajouter evidence detaillee par tool.
- [ ] Verifier la consistency du verdict sur 5 runs.
- [ ] Documenter la logique de gates.

## Lot 4 — Premium UX

- [ ] Dessiner le logo SVG shield + tower + radar dot.
- [ ] Integrer le logo dans la home.
- [ ] Polir la home premium.
- [ ] Creer le DemoWizard 5 etapes.
- [ ] Creer AgentFlowGraph.
- [ ] Creer ProductionDecisionCard.
- [ ] Creer ToolRegistryPanel.
- [ ] Creer TrustStackPanel.
- [ ] Creer PartnerStack Google + Vultr + Vercel.
- [ ] Ajouter l'action Apply Guardrails.
- [ ] Ajouter le re-run visuel.
- [ ] Afficher le verdict `NEEDS_REVIEW` apres guardrails.
- [ ] Generer l'export Markdown Production Readiness Report.
- [ ] Tester le parcours wizard complet.
- [ ] Faire une passe visuelle command-center sobre.

## Lot 5 — Submission Pack

- [ ] Finaliser le README.
- [ ] Remplir `LABLAB_CHECKLIST.md`.
- [ ] Produire le deck 6 slides.
- [ ] Produire la cover image.
- [ ] Ecrire le script video 90 s.
- [ ] Enregistrer la video 90 s.
- [ ] Exporter une architecture image ou SVG.
- [ ] Verifier que le repo GitHub est public.
- [ ] Verifier que l'URL Vercel est publique.
- [ ] Relire la soumission contre les criteres jury.

## Lot 6 — Stabilization

- [ ] Lancer 3 runs prod consecutifs.
- [ ] Verifier fallback si runner Vultr indisponible.
- [ ] Verifier fallback si Gemini indisponible.
- [ ] Nettoyer les erreurs console frontend.
- [ ] Capturer screenshots backup.
- [ ] Capturer backup video ou GIF court.
- [ ] Verifier le deck final.
- [ ] Verifier la video finale.
- [ ] Soumettre sur Lablab.
- [ ] Archiver les liens de soumission.
