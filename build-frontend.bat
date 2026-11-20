@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo DS PDF Studio Tool 1.7.0 - Frontend Production Build
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20.19+ or 22.12+ is required.
  goto :error
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is required. Reinstall Node.js with npm enabled.
  goto :error
)

node -e "const [a,b]=process.versions.node.split('.').map(Number); const ok=(a===20&&b>=19)||(a===22&&b>=12)||a>22; process.exit(ok?0:1)"
if errorlevel 1 (
  echo ERROR: Vite 8 requires Node.js ^20.19.0 or ^22.12.0 and newer supported majors.
  node --version
  goto :error
)

echo [1/3] Checking installed dependencies and npm cache...
pushd frontend
node scripts\install-deps.mjs
if errorlevel 1 (popd & goto :error)

echo [2/3] Building React application with Vite 8 / Rolldown...
call npm run build:verify
if errorlevel 1 (popd & goto :error)
popd

echo [3/3] Confirming real production assets and build manifest...
if not exist "frontend\dist\index.html" (
  echo ERROR: Vite did not create frontend\dist\index.html.
  goto :error
)
if not exist "frontend\dist\BUILD-INFO.json" (
  echo ERROR: Build verifier did not create BUILD-INFO.json.
  goto :error
)

echo.
echo FRONTEND PRODUCTION BUILD SUCCESSFUL.
echo Website bundle: frontend\dist\index.html
echo Verification manifest: frontend\dist\BUILD-INFO.json
echo Initial workspace loads PDF.js only when a PDF is opened.
echo.
if /i "%~1"=="/nopause" exit /b 0
pause
exit /b 0

:error
echo.
echo FRONTEND BUILD FAILED. Read the first error above.
echo For EAI_AGAIN, check DNS/network/proxy or run in an approved online build runner.
echo No production bundle is valid unless BUILD-INFO.json exists.
echo.
if /i "%~1"=="/nopause" exit /b 1
pause
exit /b 1
