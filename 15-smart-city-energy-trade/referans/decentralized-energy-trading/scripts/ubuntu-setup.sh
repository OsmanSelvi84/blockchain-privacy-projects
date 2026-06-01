#!/bin/bash
# One-time Ubuntu prep (run from project root). Does not start servers.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Checking Node 10 ==="
if ! command -v node >/dev/null; then
  echo "Install nvm, then: nvm install 10.24.1 && nvm use 10"
  exit 1
fi
node scripts/check-node.js

echo "=== Python for node-gyp (must be <= 3.10) ==="
bash scripts/install-python-for-nodegyp.sh

echo "=== yarn install (clean if previous install failed) ==="
rm -rf node_modules
yarn install

echo "=== Docker: Mongo + Parity ==="
docker compose -f mongo/docker-compose.yml up -d
(cd parity-authority && docker compose up -d authority0 authority1 authority2)

echo "Wait 15s for Parity..."
sleep 15

echo "=== Migrate (genesis contracts — no verifier.sol in contracts/) ==="
yarn migrate-contracts-authority

echo ""
echo "Setup done. Start 3 terminals:"
echo "  yarn run-netting-entity -i 60000"
echo "  yarn run-server -p 4002 -a 0x00aa... -P node1 -n authority_1 -d mongodb://127.0.0.1:27011 -h 127.0.0.1"
echo "  yarn run-server -p 4003 -a 0x002e... -P node2 -n authority_2 -d mongodb://127.0.0.1:27012 -h 127.0.0.1 -N http://127.0.0.1:4005"
