# Quick local dev for runner without Docker (lancé depuis la racine du repo ou ce script).
Set-Location $PSScriptRoot\..\runner
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
