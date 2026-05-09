# Vultr deployment guide

> **Status:** the public hackathon demo is currently hosted on **Vercel**.
> The Dockerfile in this repo makes the same demo trivially deployable to
> **Vultr** (Container Registry + VPS, Vultr Kubernetes Engine, or any
> generic Linux VPS). This guide documents the path; the team will switch
> hosting to Vultr only if the Vercel build remains stable.

---

## Why Vultr fits the Control Tower

ArcadeOps Control Tower is a **production-readiness layer for autonomous
AI agents**. Its natural deployment target is a controlled, predictable
infrastructure stack — not just an edge runtime. Vultr provides exactly
that:

- **Predictable cost / region pinning**: a single VPS runs the demo for
  a flat monthly cost, with no per-invocation pricing surprises that
  matter when you are auditing other AI agents' cost behavior.
- **Full Linux containers**: the Gemini Reliability Judge and the SSE
  replay endpoint run on the standard Node.js runtime — no edge runtime
  caveats, no streaming quirks.
- **Optional GPU upgrade path**: future versions of the judge can move
  to Vultr Cloud GPU when we add local-model risk classification.

---

## Architecture (Docker-first)

```
                ┌────────────────────────────────────────────┐
                │  Vultr VPS / Kubernetes (Linux x86_64)     │
                │                                            │
   browser ───► │  Docker container — node 20 alpine         │
                │    └─ Next.js 16 standalone (server.js)    │
                │       └─ /control-tower (replay UI)        │
                │       └─ /api/replay     (SSE)             │
                │       └─ /api/gemini/judge (live)          │
                │       └─ /api/capabilities (runtime probe) │
                │       └─ /api/health     (liveness)        │
                └────────────────────────────────────────────┘
                           ▲
                           │ runtime-only (never baked)
                           │
                  GEMINI_API_KEY (optional)
```

The replay endpoint, the health endpoint and the capabilities endpoint
work with **zero env vars**. Only the Gemini Reliability Judge requires
`GEMINI_API_KEY` at runtime.

---

## Optional environment variables

| Variable                    | Required? | Purpose                                                       |
| --------------------------- | --------- | ------------------------------------------------------------- |
| `GEMINI_API_KEY`            | Optional  | Enables `/api/gemini/judge`. Without it, the panel is hidden. |
| `GEMINI_MODEL`              | Optional  | Defaults to `gemini-2.5-flash`.                               |
| `ARCADEOPS_API_BASE_URL`    | Optional  | Enables the Live ArcadeOps backend proxy. Keep empty in public deployments. |
| `ARCADEOPS_DEMO_TOKEN`      | Optional  | Server-side bearer for the live proxy. Never reaches the browser. |
| `ARCADEOPS_DEMO_AGENT_ID`   | Optional  | Demo agent ID exposed by the ArcadeOps backend.               |
| `PORT`                      | Optional  | Defaults to `3000`. Override on shared hosts.                 |
| `HOSTNAME`                  | Optional  | Defaults to `0.0.0.0` so the container binds outside.         |

**Never commit a `.env` file.** Pass these via Vultr's environment-variable
UI, a Kubernetes Secret, or a `--env-file` flag at `docker run` time.

---

## Path A — Docker on a single Vultr VPS

```bash
# 1. Build the image locally (or use Vultr Container Registry)
docker build -t arcadeops-control-tower:latest .

# 2. (Optional) Tag and push to Vultr Container Registry
docker tag arcadeops-control-tower:latest \
  ewr.vultrcr.com/<your-namespace>/arcadeops-control-tower:latest
docker push ewr.vultrcr.com/<your-namespace>/arcadeops-control-tower:latest

# 3. Run on the VPS — replay only
docker run -d --name arcadeops-ct \
  --restart=always \
  -p 80:3000 \
  arcadeops-control-tower:latest

# 4. Run with the Gemini Reliability Judge enabled
docker run -d --name arcadeops-ct \
  --restart=always \
  -p 80:3000 \
  -e GEMINI_API_KEY="$(cat /etc/secrets/gemini-key)" \
  -e GEMINI_MODEL=gemini-2.5-flash \
  arcadeops-control-tower:latest
```

The container exposes a Docker `HEALTHCHECK` that probes `/api/health`
every 30 s. Add a load balancer or `nginx` front to terminate TLS.

---

## Path B — Plain Node 20 (no Docker)

The repo also runs as a standard Next.js project — useful if you prefer
not to use containers on Vultr.

```bash
git clone <repo-url> arcadeops-control-tower
cd arcadeops-control-tower
npm ci
npm run build
GEMINI_API_KEY=... npm run start
```

The output of `npm run build` includes the standalone bundle under
`.next/standalone/server.js`, which is also what the Dockerfile ships.

---

## Path C — Vultr Kubernetes Engine

A minimal Deployment / Service descriptor:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcadeops-ct
spec:
  replicas: 1
  selector:
    matchLabels: { app: arcadeops-ct }
  template:
    metadata:
      labels: { app: arcadeops-ct }
    spec:
      containers:
        - name: web
          image: ewr.vultrcr.com/<your-namespace>/arcadeops-control-tower:latest
          ports: [{ containerPort: 3000 }]
          env:
            - name: GEMINI_API_KEY
              valueFrom:
                secretKeyRef: { name: gemini, key: api-key }
          readinessProbe:
            httpGet: { path: /api/health, port: 3000 }
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /api/health, port: 3000 }
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: arcadeops-ct
spec:
  type: LoadBalancer
  selector: { app: arcadeops-ct }
  ports: [{ port: 80, targetPort: 3000 }]
```

---

## Health check

```bash
curl https://<your-host>/api/health
```

Expected response (no secrets — just capability flags):

```json
{
  "ok": true,
  "service": "arcadeops-control-tower-hackathon",
  "mode": "replay",
  "geminiConfigured": true,
  "arcadeopsLiveConfigured": false,
  "uptimeSeconds": 142
}
```

---

## Security notes

- The container runs as a non-root user (`nextjs:1001`).
- `.dockerignore` excludes `.env`, `.env.*`, `.git`, `node_modules`,
  `.next` build cache, and the `docs/` folder — none of those leak into
  the image.
- `GEMINI_API_KEY` is **only** read by `/api/gemini/judge` server-side;
  the value is never serialized into a server response or sent to the
  browser.
- `/api/capabilities` returns `gemini.available: true/false` without ever
  echoing the key or the model URL.
- The Live ArcadeOps backend proxy (`/api/arcadeops/run`) is **disabled
  by default** in public deployments — leave the three `ARCADEOPS_*`
  env vars empty.

---

## Limitations

- The current Dockerfile assumes a Linux x86_64 host. Apple Silicon
  builds work for local testing (`docker buildx --platform linux/amd64`).
- No autoscaling out of the box — replay traces are stateless and cheap,
  so a single small VPS is enough for a hackathon demo.
- Vultr Container Registry must exist in your account before pushing
  (`vultr-cli container-registry create ...` or via the dashboard).
