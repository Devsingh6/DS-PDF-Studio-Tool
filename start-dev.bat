@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto :python_error
where node >nul 2>nul
if errorlevel 1 goto :node_error

echo Checking pinned React/Vite dependencies. Existing exact-version packages are reused without a registry request...
pushd frontend
node scripts\install-deps.mjs
if errorlevel 1 (popd & goto :error)
popd

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv
  if errorlevel 1 goto :error
)
echo Checking Python dependencies...
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto :error

start "DS PDF Studio Tool Python API" /D "%~dp0" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
start "DS PDF Studio Tool React UI" /D "%~dp0frontend" cmd /k "npm run dev"
echo.
echo DS PDF Studio Tool development services are starting.
echo React UI: http://localhost:5173
echo Python API: http://127.0.0.1:8000/docs
echo.
pause
exit /b 0

:python_error
echo ERROR: Install Python 3.10+ and enable the Windows Python Launcher (py).
goto :error
:node_error
echo ERROR: Install Node.js 20.19+ or 22.12+ (npm is included with Node.js).
goto :error
:error
echo Setup failed. Check the error above and review README.md.
pause
exit /b 1
