#!/bin/bash

set -e

PROJECT_ROOT=$(git rev-parse --show-toplevel)
ZOKRATES_BIN="${HOME}/.zokrates-0.6.4/bin/zokrates"
ZOKRATES_CLI="${PROJECT_ROOT}/scripts/zokrates-cli.sh"

if [[ ! -x "${ZOKRATES_BIN}" ]]; then
  echo "ZoKrates 0.6.4 not installed. Running install_zokrates.sh..."
  "${PROJECT_ROOT}/scripts/install_zokrates.sh"
fi

chmod +x "${ZOKRATES_CLI}"

cd "${PROJECT_ROOT}/zokrates-code"

"${ZOKRATES_CLI}" compile -i settlement-check.zok --light
"${ZOKRATES_CLI}" setup --light
"${ZOKRATES_CLI}" export-verifier

cp ./verifier.sol ../contracts/verifier.sol

echo "Verifier written to contracts/verifier.sol"
echo "For netting, use: alias zokrates='${ZOKRATES_CLI}'"
