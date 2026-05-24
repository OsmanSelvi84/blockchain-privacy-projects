#!/usr/bin/env bash
# H2 dashboard — http://localhost:3010 (requires gateway on 3003)
set -euo pipefail
cd "$(dirname "$0")/../dashboard"
export PORT=3010
export REACT_APP_HSS_PORT=3003
export BROWSER=none
if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  source ~/.nvm/nvm.sh 2>/dev/null || true
  nvm use 10 2>/dev/null || nvm use 18 2>/dev/null || true
fi
echo "H2 UI → http://localhost:3010 (API proxy → :3003)"
yarn start
