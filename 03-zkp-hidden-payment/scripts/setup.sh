#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_circom_v2() {
    local version
    version="$(circom --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)"

    if [[ -z "$version" ]]; then
        echo "Error: circom is not installed or is not on your PATH. Install Circom 2.x before running this script." >&2
        exit 1
    fi

    if [[ ! "$version" =~ ^2\. ]]; then
        echo "Error: Circom 2.x is required, but found '$version'." >&2
        echo "Install the current Circom 2 release, then rerun: https://docs.circom.io/getting-started/installation/" >&2
        exit 1
    fi
}

require_circom_v2

mkdir -p build

echo "[1/8] Compiling circuits/withdraw.circom ..."
circom circuits/withdraw.circom --O0 --r1cs --wasm --sym -o build/

echo "[2/8] Powers of tau — phase 1 (new) ..."
snarkjs powersoftau new bn128 15 pot15_0000.ptau -v

echo "[3/8] Powers of tau — phase 1 (contribute) ..."
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
    --name="contribution" -v -e="random entropy"

echo "[4/8] Powers of tau — prepare phase 2 ..."
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v

echo "[5/8] Groth16 setup (initial zkey) ..."
snarkjs groth16 setup build/withdraw.r1cs pot15_final.ptau withdraw_0000.zkey

echo "[6/8] zkey contribution (phase 2) ..."
snarkjs zkey contribute withdraw_0000.zkey withdraw_final.zkey \
    --name="contribution" -v -e="random entropy 2"

echo "[7/8] Exporting verification key ..."
snarkjs zkey export verificationkey withdraw_final.zkey verification_key.json

echo "[8/8] Exporting Solidity verifier and copying wasm ..."
snarkjs zkey export solidityverifier withdraw_final.zkey contracts/Verifier.sol
cp build/withdraw_js/withdraw.wasm circuits/withdraw.wasm

echo "Done. contracts/Verifier.sol and circuits/withdraw.wasm are ready."
