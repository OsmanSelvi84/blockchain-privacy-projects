#!/bin/bash
# Print chain / docker state before migrate (project root).
set -e

echo "=== Docker ==="
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'authority|mongo' || true

echo ""
echo "=== RPC 8545 ==="
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' || echo "NO RESPONSE"

echo ""
echo "=== dUtility owner (0x42) ==="
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x0000000000000000000000000000000000000042","data":"0x8da5cb5b"},"latest"],"id":1}'

echo ""
echo ""
echo "If owner is 0x00bd... → migrate not done or reset needed."
echo "If owner is 0x0044 → migrate already ran; re-migrate will fail on setVerifier."
echo "Fix: bash scripts/reset-parity-and-migrate.sh"
