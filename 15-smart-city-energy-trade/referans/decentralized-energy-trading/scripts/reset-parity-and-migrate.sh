#!/bin/bash
# Full Parity reset + migrate. Run from project root with Node 10.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/check-node.js

echo "=== Stop and wipe Parity chain data ==="
cd parity-authority
docker compose down -v
docker compose up -d authority0 authority1 authority2
cd ..

echo "Waiting 20s for Parity..."
sleep 20

echo "=== RPC check (HTTP 8545) ==="
curl -sf -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  || { echo "FAIL: Parity not on 8545"; exit 1; }
echo ""

echo "=== Compile + migrate (HTTP, no truffle migrate) ==="
yarn migrate-contracts-authority

echo "=== Done ==="
