@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Create the virtual environment and install backend requirements first.
  echo py -m venv .venv
  echo .venv\Scripts\activate
  echo py -m pip install -r backend\requirements.txt
  pause
  exit /b 1
)
.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
