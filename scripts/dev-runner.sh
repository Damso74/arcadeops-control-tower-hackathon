#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../runner"
python -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -r requirements.txt
exec uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
