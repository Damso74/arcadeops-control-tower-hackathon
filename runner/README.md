# Runner Vultr FastAPI

Runner minimal pour ArcadeOps Control Tower. Le Lot 1 expose uniquement `/health` et `/run-agent` avec une trace mockee. L'integration Gemini live commence au Lot 2 apres validation du plan.

## Docker

```powershell
docker compose up
```

## Local Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health` retourne le statut du runner.
- `POST /run-agent` retourne `app/fixtures/mock-trace.json`.

## Variables

- `GEMINI_API_KEY` : requis a partir du Lot 2.
- `CORS_ALLOWED_ORIGINS` : origines autorisees, separees par des virgules.
