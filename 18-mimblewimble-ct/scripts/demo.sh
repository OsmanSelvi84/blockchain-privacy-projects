#!/usr/bin/env bash
# Live presentation demo driver for 18-mimblewimble-ct.
#
# Walks through the four things to show, pausing between each so you can talk:
#   1. Part A  — reference vs my implementation on 5 inputs   (the 50 points)
#   2. Verify  — build/verify a real transaction              (the prover)
#   3. Tamper  — flip one byte, verification fails            (proves it's real)
#   4. On-chain— the Solidity verifier (Hardhat)              (my own solution)
#
# Usage:
#   bash scripts/demo.sh                  # uses the 5 built-in scenarios
#   bash scripts/demo.sh inputs.json      # Part A on the instructor's inputs
#
# Pauses are skipped automatically when output is not a terminal, or set
# DEMO_NOPAUSE=1 to run straight through.

set -u
# Run Hardhat non-interactively so its first-run prompts (telemetry AND the
# "install the VS Code extension?" one) never interrupt the live demo.
# CI=true skips both; HARDHAT_DISABLE_TELEMETRY_PROMPT is belt-and-suspenders.
export CI=true
export HARDHAT_DISABLE_TELEMETRY_PROMPT=true
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT"

SCENARIOS="${1:-}"

if [ -t 1 ]; then BOLD='\033[1m'; CYAN='\033[1;36m'; GREEN='\033[0;32m'; NC='\033[0m'
else BOLD=''; CYAN=''; GREEN=''; NC=''; fi

pause() {
    if [ -n "${DEMO_NOPAUSE:-}" ] || [ ! -t 0 ]; then return; fi
    echo
    printf "${CYAN}   [Enter] for the next step...${NC}"
    read -r _
}

header() {
    echo
    echo -e "${BOLD}===============================================================${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${BOLD}===============================================================${NC}"
}

# Activate the project venv.
# shellcheck disable=SC1091
source .venv/bin/activate 2>/dev/null || { echo "venv missing: python3 -m venv .venv && pip install -r requirements.txt"; exit 1; }

header "1/4  PART A  —  reference vs my implementation  (the 50 points)"
echo "Both implementations run the same scenarios; the verdicts must agree."
if [ -n "$SCENARIOS" ]; then
    echo "Using the instructor's inputs: $SCENARIOS"
    PYTHONPATH=. python scripts/compare_with_reference.py --scenarios "$SCENARIOS"
else
    PYTHONPATH=. python scripts/compare_with_reference.py
    echo
    echo -e "${GREEN}To run the instructor's 5 inputs: bash scripts/demo.sh his_inputs.json${NC}"
fi
pause

header "2/4  VERIFY  —  a real confidential transaction  (the prover)"
echo "\$ python -m ct.cli verify examples/01_simple.json"
PYTHONPATH=. python -m ct.cli verify examples/01_simple.json
pause

header "3/4  TAMPER  —  flip one byte, verification must fail"
TAMPERED="/tmp/mw_demo_tampered.json"
python3 -c "
import json
tx = json.load(open('examples/01_simple.json'))
c = tx['outputs'][0]['commitment']
tx['outputs'][0]['commitment'] = c[:-1] + ('0' if c[-1] != '0' else 'f')
json.dump(tx, open('$TAMPERED','w'))
print('Flipped the last hex digit of the first output commitment.')
"
echo "\$ python -m ct.cli verify /tmp/mw_demo_tampered.json"
PYTHONPATH=. python -m ct.cli verify "$TAMPERED" || echo -e "${GREEN}-> correctly REJECTED (exit code 1).${NC}"
pause

header "4/4  ON-CHAIN  —  the Solidity verifier  (my own solution)"
echo "From-scratch secp256k1 EC verification on the EVM."
echo "\$ cd solidity && npx hardhat test"
( cd solidity && npx hardhat test )

echo
echo -e "${GREEN}${BOLD}Demo complete.${NC}"
