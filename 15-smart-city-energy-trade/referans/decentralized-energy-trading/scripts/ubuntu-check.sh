#!/bin/bash
# Quick health check — run from project root on Ubuntu
set -e
echo "=== Node ==="
command -v node && node -v || echo "FAIL: install nvm + node 10"
echo "=== Docker ==="
docker ps >/dev/null 2>&1 && docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'mongo|authority' || echo "FAIL: docker not running or no containers"
echo "=== Ports ==="
for p in 27011 27012 8545 8556 8566 4002 4003 4005; do
  ss -tlnp 2>/dev/null | grep -q ":$p " && echo "OK  $p" || echo "OFF $p"
done
echo "=== verifier.sol ==="
test -f contracts/verifier.sol && echo "OK  contracts/verifier.sol" || echo "MISSING — run: yarn prepare-verifier"
echo "=== Parity RPC ==="
curl -sf -X POST http://127.0.0.1:8545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' && echo || echo "FAIL: Parity authority0"
echo "=== Mongo H1 ==="
curl -sf http://127.0.0.1:27011 >/dev/null 2>&1 && echo "OK  mongo 27011" || echo "check: docker compose -f mongo/docker-compose.yml up -d"
echo "Done."
