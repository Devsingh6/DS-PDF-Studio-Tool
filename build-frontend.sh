#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND="$ROOT/frontend"

command -v node >/dev/null || { echo "Node.js 20.19+ or 22.12+ is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (!((a===20&&b>=19)||(a===22&&b>=12)||a>22)) process.exit(1)' || {
  echo "Vite 8 requires Node.js ^20.19.0 or ^22.12.0 and newer supported majors; found $(node --version)." >&2; exit 1;
}

cd "$FRONTEND"
node scripts/install-deps.mjs
npm run build:verify
test -s dist/index.html
test -s dist/BUILD-INFO.json

echo "Frontend production build succeeded: $FRONTEND/dist"
