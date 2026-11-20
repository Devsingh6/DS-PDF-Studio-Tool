@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo DS PDF Studio Tool 1.7.0 - Full Production Build
echo ============================================================

call build-frontend.bat /nopause
if errorlevel 1 goto :error

where py >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python Launcher (py) is required for the API backend.
  goto :error
)

if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Creating Python virtual environment...
  py -m venv .venv
  if errorlevel 1 goto :error
) else (
  echo [1/4] Reusing Python virtual environment...
)

echo [2/4] Installing Python backend dependencies...
.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 goto :error

echo [3/4] Verifying frontend asset manifest and SHA-256 hashes...
.venv\Scripts\python.exe backend\verify_frontend.py
if errorlevel 1 goto :error

echo [4/4] Compiling backend and running API/production smoke tests...
.venv\Scripts\python.exe -m compileall -q backend tests
if errorlevel 1 goto :error
.venv\Scripts\python.exe -m unittest discover -s tests -v
if errorlevel 1 goto :error

echo.
echo FULL PRODUCTION BUILD SUCCESSFUL.
echo Frontend: frontend\dist\index.html
echo Manifest: frontend\dist\BUILD-INFO.json
echo Start: start-production.bat
echo URL: http://127.0.0.1:8000
echo.
pause
exit /b 0

:error
echo.
echo FULL PRODUCTION BUILD FAILED. Read the first error above and check README.md.
echo The React bundle may still be available if the frontend build step succeeded.
echo.
pause
exit /b 1
