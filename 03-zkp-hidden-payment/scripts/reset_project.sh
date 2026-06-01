#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ -d build ]]; then
  find build -mindepth 1 -delete
fi

rm -rf circom
rm -f circuits/withdraw.wasm

find . -path './node_modules' -prune -o -type f \( \
  -name '*.r1cs' -o \
  -name '*.sym' -o \
  -name '*.ptau' -o \
  -name '*.zkey' -o \
  -name 'verification_key.json' -o \
  -name 'deployedAddresses.json' -o \
  -name 'deployedAddressees.json' \
\) -exec rm -f {} +