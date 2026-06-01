#!/bin/bash
# ZoKrates workflow only. Do NOT copy into contracts/ — Verifier is Solidity 0.6
# and breaks Truffle 0.5.2 compile. Authority migrate uses genesis verifier at 0x45.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/zokrates-code"

SRC=""
[[ -f verifier.sol ]] && SRC=verifier.sol
[[ -z "$SRC" && -f verifier.sol.backup ]] && SRC=verifier.sol.backup

if [[ -z "$SRC" ]]; then
  echo "ERROR: No verifier source. Run: yarn setup-zokrates" >&2
  exit 1
fi

if [[ ! -f verifier.sol ]] || [[ "$SRC" == "verifier.sol.backup" ]]; then
  cp "$SRC" verifier.sol
  echo "Ready: zokrates-code/verifier.sol (from $SRC)"
else
  echo "Ready: zokrates-code/verifier.sol"
fi
