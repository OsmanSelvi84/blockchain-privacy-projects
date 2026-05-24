#!/usr/bin/env bash
# Kill stale demo processes and print start commands.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Stopping old processes on 3002, 3003, 3005..."
lsof -ti:3002,3003,3005 2>/dev/null | xargs kill 2>/dev/null || true
sleep 1

echo ""
echo "Start these in SEPARATE terminals (nvm use 10):"
echo ""
echo "  cd $ROOT && yarn run-netting"
echo "  cd $ROOT && yarn run-gateway-h1"
echo "  cd $ROOT && yarn run-gateway-h2"
echo ""
echo "UI (dashboard folder):"
echo "  cd $ROOT/dashboard && yarn start:h1"
echo "  cd $ROOT/dashboard && yarn start:h2"
echo ""
echo "Then BOTH households: Test 1 -> Netting'e gönder, wait 60s"
echo "Check: curl -s http://127.0.0.1:3005/transfers/0x00aa39d30f0d20ff03a22ccfc30b7efbfca597c2?from=0"
