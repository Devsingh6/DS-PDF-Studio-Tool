@echo off
setlocal
cd /d "%~dp0"
if not exist "frontend\dist\index.html" (
  echo Production frontend is missing. Run build-production.bat first.
  pause
  exit /b 1
)
if not exist "frontend\dist\BUILD-INFO.json" (
  echo Production bundle has not passed verification. Run build-production.bat first.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Python environment missing. Run build-production.bat first.
  pause
  exit /b 1
)
echo Verifying production HTML, JavaScript, CSS and SHA-256 asset hashes...
.venv\Scripts\python.exe backend\verify_frontend.py
if errorlevel 1 (
  echo Production assets failed verification. Run build-production.bat again.
  pause
  exit /b 1
)
echo Starting verified DS PDF Studio Tool production server...
echo Open http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
