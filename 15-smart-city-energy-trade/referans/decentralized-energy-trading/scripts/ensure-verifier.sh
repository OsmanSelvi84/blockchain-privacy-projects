#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f contracts/verifier.sol ]]; then
  echo "contracts/verifier.sol already exists."
  exit 0
fi

if [[ -f zokrates-code/verifier.sol.backup ]]; then
  cp zokrates-code/verifier.sol.backup contracts/verifier.sol
  echo "Copied zokrates-code/verifier.sol.backup -> contracts/verifier.sol"
  exit 0
fi

if [[ -f zokrates-code/verifier.sol ]]; then
  cp zokrates-code/verifier.sol contracts/verifier.sol
  echo "Copied zokrates-code/verifier.sol -> contracts/verifier.sol"
  exit 0
fi

echo "ERROR: No verifier.sol source found. Run: yarn setup-zokrates" >&2
exit 1
