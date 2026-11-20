#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$ROOT/build-frontend.sh"

command -v python3 >/dev/null || { echo "Python 3.11+ is required for the API backend." >&2; exit 1; }
cd "$ROOT"
if [[ ! -x .venv/bin/python ]]; then python3 -m venv .venv; fi
.venv/bin/python -m pip install --disable-pip-version-check -r backend/requirements.txt
.venv/bin/python backend/verify_frontend.py
.venv/bin/python -m compileall -q backend tests
.venv/bin/python -m unittest discover -s tests -v

echo "Full build and tests succeeded. Start the production API with:"
echo ".venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
