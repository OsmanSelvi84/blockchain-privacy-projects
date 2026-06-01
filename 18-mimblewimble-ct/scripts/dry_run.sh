#!/usr/bin/env bash
# Pre-presentation dry run for 18-mimblewimble-ct.
# Runs every step the instructor would run and prints a pass/fail summary.
#
# Run from the project root:
#     bash scripts/dry_run.sh

set -u

# Run Hardhat non-interactively so its first-run prompts (telemetry AND the
# VS Code extension one) never block the dry run. CI=true skips both.
export CI=true
export HARDHAT_DISABLE_TELEMETRY_PROMPT=true

# Resolve paths relative to this script's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ANSI colors (gracefully no-op when piped).
if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BOLD=''; NC=''
fi

# Step tracking.
declare -a STEP_NAMES
declare -a STEP_RESULTS

run_step() {
    local name="$1"; shift
    echo
    echo -e "${BOLD}===  $name  ===${NC}"
    if "$@"; then
        STEP_NAMES+=("$name")
        STEP_RESULTS+=("OK")
        echo -e "${GREEN}[OK] $name${NC}"
    else
        STEP_NAMES+=("$name")
        STEP_RESULTS+=("FAIL")
        echo -e "${RED}[FAIL] $name${NC}"
    fi
}

# ----- 1. Python venv -----
python_check() {
    cd "$PROJECT"
    if [ ! -d .venv ]; then
        echo "Python venv not found at .venv — run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
        return 1
    fi
    # shellcheck disable=SC1091
    source .venv/bin/activate
    python3 --version
}

# ----- 2. pytest -----
pytest_run() {
    cd "$PROJECT"
    PYTHONPATH=. pytest tests/ -q
}

# ----- 3. CLI build + verify a fresh tx -----
cli_roundtrip() {
    cd "$PROJECT"
    mkdir -p examples
    PYTHONPATH=. python -m ct.cli build \
        --in 100,3141 --in 50,2718 \
        --out 140,1618 --fee 10 \
        --output examples/dry_run.json
    PYTHONPATH=. python -m ct.cli verify examples/dry_run.json
}

# ----- 4. Verify every committed example -----
examples_verify() {
    cd "$PROJECT"
    local any_failed=0
    for f in examples/*.json; do
        [ -f "$f" ] || continue
        # Only verify transaction files; skip non-tx JSON like the
        # scenarios template (an input list, not a built transaction).
        if ! python3 -c "import json,sys; d=json.load(open('$f')); sys.exit(0 if isinstance(d,dict) and 'kernel' in d else 1)" 2>/dev/null; then
            echo "--- $f (skipped: not a transaction) ---"
            continue
        fi
        echo "--- $f ---"
        if ! PYTHONPATH=. python -m ct.cli verify "$f"; then
            any_failed=1
        fi
    done
    return "$any_failed"
}

# ----- 5. Tamper test (must fail) -----
tamper_test() {
    cd "$PROJECT"
    local src="examples/dry_run.json"
    local bad="/tmp/dry_run_tampered.json"
    [ -f "$src" ] || { echo "missing $src — run the CLI roundtrip first"; return 1; }
    # Flip one hex character in the first output's commitment.
    python3 -c "
import json, sys
tx = json.load(open('$src'))
c = tx['outputs'][0]['commitment']
flipped = c[:-1] + ('0' if c[-1] != '0' else 'f')
tx['outputs'][0]['commitment'] = flipped
json.dump(tx, open('$bad', 'w'))
"
    if PYTHONPATH=. python -m ct.cli verify "$bad" >/dev/null 2>&1; then
        echo "tampered tx unexpectedly verified — this is a bug"
        return 1
    else
        echo "tampered tx correctly rejected"
        return 0
    fi
}

# ----- 6. Solidity test vectors -----
solidity_vectors() {
    cd "$PROJECT"
    PYTHONPATH=. python scripts/generate_solidity_vectors.py
}

# ----- 7. Hardhat compile + test -----
hardhat_test() {
    cd "$PROJECT/solidity"
    if [ ! -d node_modules ]; then
        echo "node_modules missing — run: cd solidity && npm install"
        return 1
    fi
    npx hardhat compile
    npx hardhat test
}

# Resolve the reference repo: $MW_REFERENCE_PATH, else a sibling directory.
resolve_reference() {
    if [ -n "${MW_REFERENCE_PATH:-}" ] && [ -d "$MW_REFERENCE_PATH" ]; then
        ( cd "$MW_REFERENCE_PATH" && pwd ); return 0
    fi
    local base name
    for base in "$PROJECT/.." "$PROJECT/../.."; do
        for name in "reference-mimblewimble-py" "mimblewimble-py"; do
            if [ -d "$base/$name" ]; then
                ( cd "$base/$name" && pwd ); return 0
            fi
        done
    done
    return 1
}

# ----- 8. Reference impl sanity check -----
reference_check() {
    local ref
    if ! ref="$(resolve_reference)"; then
        echo "reference impl not found (set MW_REFERENCE_PATH) — skipping (expected for the prof, not required for tests)"
        return 0
    fi
    echo "using reference: $ref"
    # Run in a subshell so activating the reference venv does not leak into
    # later steps, which need this project's venv.
    (
        if [ -f "$ref/.venv/bin/activate" ]; then
            # shellcheck disable=SC1091
            source "$ref/.venv/bin/activate"
        fi
        PYTHONPATH="$ref" python3 -c "from mimblewimble.wallet import Wallet; w = Wallet.initialize(); print('slatepack:', w.getSlatepackAddress(path='m/0/1/0'))"
    )
}

# ----- 9. Differential comparison vs reference (the matching-output check) -----
differential_compare() {
    cd "$PROJECT"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    # compare_with_reference.py locates the reference itself and shells out to
    # its venv. It exits 0 if every verdict agrees, or if no reference is found
    # (original-only run); it exits non-zero only on a genuine mismatch.
    PYTHONPATH=. python3 scripts/compare_with_reference.py
}

# ===== run all steps =====
run_step "1. Python venv + interpreter" python_check
run_step "2. Python pytest suite" pytest_run
run_step "3. CLI build + verify roundtrip" cli_roundtrip
run_step "4. Verify all committed examples" examples_verify
run_step "5. Tamper test (must reject)" tamper_test
run_step "6. Generate Solidity test vectors" solidity_vectors
run_step "7. Hardhat compile + test" hardhat_test
run_step "8. Reference implementation sanity check" reference_check
run_step "9. Differential comparison vs reference" differential_compare

# ===== summary =====
echo
echo -e "${BOLD}===  Summary  ===${NC}"
fail_count=0
for i in "${!STEP_NAMES[@]}"; do
    if [ "${STEP_RESULTS[$i]}" = "OK" ]; then
        echo -e "  ${GREEN}[OK]${NC}   ${STEP_NAMES[$i]}"
    else
        echo -e "  ${RED}[FAIL]${NC} ${STEP_NAMES[$i]}"
        fail_count=$((fail_count + 1))
    fi
done
echo
if [ "$fail_count" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All steps passed. Ready for presentation.${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}$fail_count step(s) failed — fix before presenting.${NC}"
    exit 1
fi
