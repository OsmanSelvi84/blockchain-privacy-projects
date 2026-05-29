#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/zk"

if ! command -v zokrates >/dev/null 2>&1; then
  echo "Install ZoKrates 0.6.4 and ensure 'zokrates' is on PATH."
  exit 1
fi

zokrates compile -i settlement-check.zok
zokrates setup
zokrates export-verifier
cp verifier.sol ../contracts/verifier.sol
echo "ZoKrates setup complete. Run: yarn update-contract-bytecodes"
