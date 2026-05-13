# Déploiement runner sur Vultr Cloud Compute

Guide pas à pas pour héberger le service FastAPI `runner/` sur une VM Ubuntu, le sécuriser, l’exposer en HTTPS, puis le relier à Vercel via `VULTR_RUNNER_URL`.

## Voie rapide — Provisioning automatique via API

Un script versionné dans le repo provisionne l'instance Vultr en une commande
(remplace les étapes 1-3 ci-dessous : choix région, déploiement instance, SSH access).

### Pré-requis
- Compte Vultr actif avec API key activée (https://my.vultr.com/settings/#settingsapi)
- PowerShell 7+ ou Bash avec `curl` + `jq`
- Une clé SSH locale (`~/.ssh/id_ed25519.pub` détectée automatiquement)

### Usage Windows (PowerShell)

```powershell
$env:VULTR_API_KEY = "VTR-..."
.\scripts\vultr-provision.ps1
```

### Usage Linux/Mac (Bash)

```bash
export VULTR_API_KEY="VTR-..."
./scripts/vultr-provision.sh
```

### Options
- PowerShell : `-Region`, `-Plan`, `-DryRun`, `-Force`, `-SshKeyPath`, `-Hostname`
- Bash : variables `VULTR_REGION` / `VULTR_PLAN`, flags `--dry-run`, `--force`, `--hostname`, `--ssh-key`
- Défaut région : `mil` avec fallback `fra`, `cdg`, `ams`
- Défaut plan : `vc2-1c-2gb` (Cloud Compute Shared CPU, ~12 USD/mois)

### Sortie
Le script écrit `.vultr-state.json` (gitignored) à la racine du repo et imprime :
- IP publique
- Commande SSH (`ssh root@<ip>`)
- Coût mensuel
- Commande de destruction : `.\scripts\vultr-destroy.ps1` ou `./scripts/vultr-destroy.sh` (option `-Full` / `--full` pour supprimer aussi pare-feu + clé SSH)

### Continuer
Une fois l'instance provisionnée, **reprenez ce runbook à l'étape 4** (installation Docker sur la VM).

## Prérequis

- Compte Vultr avec facturation active.
- Domaine ou sous-domaine pointant vers l’IP publique de la VM (recommandé pour TLS automatique).
- Accès au dépôt GitHub du hackathon (clone sur la VM).

## Étape 1 — Compte Vultr et région

1. Créez un compte sur [Vultr](https://www.vultr.com/), validez la facturation.
2. Choisissez une région proche de vos utilisateurs :
   - `fra` (Francfort) — recommandé pour l’UE.
   - `cdg` (Paris) — alternative UE.
   - `ewr` (Newark) — côte est des États-Unis.

## Étape 2 — Créer l’instance Cloud Compute

1. Déployez une instance **Cloud Compute — Regular Performance**.
2. OS : **Ubuntu 24.04 LTS**.
3. Taille minimale : **1 vCPU / 1 Go RAM** (préférez **2 Go** pour marge Docker).
4. Plan indicatif : **6 $/mois** (1 Go) à **12 $/mois** (2 Go) selon la région et les promos.

## Étape 3 — SSH et durcissement basique

1. Ajoutez votre clé SSH lors du provisioning.
2. Connectez-vous : `ssh root@VOTRE_IP`.
3. Mettez à jour le système : `apt update && apt upgrade -y`.
4. Pare-feu UFW :

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Étape 4 — Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
```

Déconnectez-vous puis reconnectez-vous pour que le groupe `docker` soit effectif.

## Étape 5 — Cloner le dépôt et préparer l’environnement

```bash
git clone https://github.com/VOTRE_ORG/arcadeops-control-tower-hackathon.git
cd arcadeops-control-tower-hackathon/runner
cp .env.example .env
```

Éditez `.env` :

- `GEMINI_API_KEY` — laisser vide en Lot 1 ; renseigner pour le Lot 2.
- `ALLOWED_ORIGINS` — incluez `https://votre-app.vercel.app` (et `http://localhost:3000` pour tests locaux via tunnel si besoin).
- `REGION` — par ex. `fra` (valeur affichée dans `/health` et les traces).
- `RUNNER_VERSION` — optionnel (`0.1.0` par défaut).

## Étape 6 — Lancer avec Docker Compose

```bash
docker compose up -d --build
```

Le service écoute en **8000** sur l’interface de la VM (mappé par défaut `8000:8000`).

## Étape 7 — Vérification locale sur la VM

```bash
curl -s http://127.0.0.1:8000/health
```

Attendu : JSON `{"status":"ok","runner":"vultr",...}` avec `region`, `version`, `uptime_s`.

## Étape 8 — Reverse proxy HTTPS avec Caddy

1. Installez Caddy : `apt install -y caddy`.
2. Créez `/etc/caddy/Caddyfile` :

```text
runner-votre-domaine.example.com {
  reverse_proxy 127.0.0.1:8000
}
```

3. Rechargez : `systemctl reload caddy`.
4. Vérifiez : `curl -s https://runner-votre-domaine.example.com/health`.

## Étape 9 — Relier Vercel

1. Dans le projet Vercel : **Settings → Environment Variables**.
2. Ajoutez `VULTR_RUNNER_URL=https://runner-votre-domaine.example.com` pour *Production* et *Preview*.
3. Redéployez l’application Next.js.

## Étape 10 — Test bout-en-bout

1. Ouvrez `https://votre-app.vercel.app/control-tower`.
2. Le badge doit être **vert** (`Live runner: Vultr · …`).
3. Cliquez sur **Générer la trace** : la réponse doit refléter le JSON `AgentRunTrace` issu de `POST /run-agent`.

## Dépannage

| Symptôme | Piste |
| --- | --- |
| Erreurs **CORS** dans le navigateur | Vérifiez `ALLOWED_ORIGINS` côté runner (domaine Vercel exact, `https`). |
| **Healthcheck Docker** en échec | `docker compose logs -f runner` ; vérifiez que le process écoute sur `0.0.0.0:8000`. |
| **Port 8000 non joignable** depuis l’extérieur | Exposez via Caddy/Nginx uniquement sur 443 ; évitez d’ouvrir 8000 publiquement. |
| **Certificat TLS** qui tarde | DNS doit pointer vers la VM ; attendez propagation ; consultez `journalctl -u caddy -f`. |
| **502** depuis Caddy | Le conteneur est arrêté ou le port interne a changé — `docker compose ps`. |

## Coût estimé (hackathon ~7 jours)

- VM **6–12 $/mois** selon taille/région ; sur une semaine, l’ordre de grandeur est **quelques dollars**, négligeable pour une démo.

## Références utiles

- Documentation Docker : [https://docs.docker.com/](https://docs.docker.com/)
- Caddy : [https://caddyserver.com/docs/](https://caddyserver.com/docs/)
- Variables runner : `runner/.env.example`.
