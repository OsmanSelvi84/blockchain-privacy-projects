#!/bin/bash
# Verifier is Solidity 0.6 — must NOT sit in contracts/ (breaks Truffle 0.5.2 compile).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"
removed=0
for f in verifier.sol _verifier.sol Verifier.sol; do
  if [[ -f "$f" ]]; then
    rm -f "$f"
    echo "Removed contracts/$f"
    removed=1
  fi
done
if [[ "$removed" -eq 0 ]]; then
  echo "No stray verifier contract in contracts/ (OK)."
fi
