@echo off
setlocal
cd /d "%~dp0frontend"
if not exist "node_modules\.bin\vite.cmd" (
  echo Checking npm registry and installing React/Vite dependencies...
  node scripts\install-deps.mjs
  if errorlevel 1 (
    echo Dependency setup failed. See the npm DNS/network guidance in the parent README.md.
    pause
    exit /b 1
  )
)
call npm run dev
