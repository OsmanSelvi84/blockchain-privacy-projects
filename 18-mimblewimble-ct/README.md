# MimbleWimble Confidential Transactions

COMP4052 — Introduction to Blockchain and DLT — Final Project
Student: Ege Deniz (220304118)
Branch: `students/220304118-ege-deniz`

This is the **original solution** for the *MimbleWimble Confidential
Transactions* topic. Per the course guidance — "present an existing
implementation (any language); propose your own solution, Solidity preferred" —
it has two original parts:

1. **A Solidity on-chain verifier** (`solidity/`) — the proposed own solution.
   It verifies a CT transaction on Ethereum: the kernel Schnorr signature
   (proves ownership) and the Pedersen commitment balance (proves no value was
   inflated). See §3.5.
2. **A from-scratch Python implementation of the full CT protocol** (`ct/`) —
   Pedersen commitments, bit-commitment range proofs, and the Schnorr kernel.
   It is the prover that builds transactions and the layer that cross-validates
   against the reference. See §4.

The **existing/reference implementation** is
[`grinventions/mimblewimble-py`](https://github.com/grinventions/mimblewimble-py)
(the Grin community's Python implementation). The reference and the original
are run on the same inputs for the output-matching evaluation — see §3.

---

## 0. How this maps to the evaluation

| Course requirement | Where it lives |
|---|---|
| Existing/reference implementation (any language) | `grinventions/mimblewimble-py` (Grin, Python) — §3 |
| Own proposed solution (**Solidity preferred**) | `solidity/MimbleWimbleVerifier.sol` on-chain verifier — §3.5 |
| Original from-scratch implementation | Full CT protocol in `ct/` (Python) — prover + cross-validation — §4 |
| Output-matching on the instructor's 5 inputs (50 pts) | `scripts/compare_with_reference.py [--scenarios FILE]` runs both impls and compares — §3 |
| Runnable by the instructor end-to-end | `bash scripts/dry_run.sh` runs every step and prints a pass/fail summary |

---

## 1. Quick start

Prereqs: macOS or Linux, Python 3.9+, git.

```bash
# clone this project
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304118-ege-deniz
cd 18-mimblewimble-ct

# install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# run the tests
PYTHONPATH=. pytest tests/ -v

# build and verify a sample transaction
PYTHONPATH=. python -m ct.cli build \
    --in 100,3141 --in 50,2718 \
    --out 140,1618 \
    --fee 10 \
    --output examples/tx_simple.json
PYTHONPATH=. python -m ct.cli verify examples/tx_simple.json
```

Expected output of `verify`:

```
[OK] commitments balance
[OK] all 1 range proofs valid
[OK] kernel signature valid
```

### Run the full demo (copy-paste, in order)

One command runs everything — the reference comparison, a verify, a tamper
test, and the Solidity tests (macOS / Linux, with the venv active):

```bash
bash scripts/demo.sh
```

Or step by step (works on any OS):

```bash
# 1. Part A — reference vs this implementation on 5 scenarios
PYTHONPATH=. python scripts/compare_with_reference.py

# 2. Verify a confidential transaction
PYTHONPATH=. python -m ct.cli verify examples/01_simple.json

# 3. The on-chain Solidity verifier
cd solidity && npm install && npx hardhat test && cd ..
```

To run the instructor's own inputs through both implementations, see §3
("Supplying your own test inputs").

---

## 2. Project layout

```
18-mimblewimble-ct/
├── README.md                       # this file
├── requirements.txt                # ecdsa, pytest
├── ct/                             # the original implementation
│   ├── __init__.py
│   ├── curve.py                    # secp256k1 setup; H derivation
│   ├── pedersen.py                 # Pedersen commitments + balance check
│   ├── schnorr.py                  # Schnorr signature
│   ├── rangeproof.py               # bit-commitment OR-proof range proof
│   ├── transaction.py              # tx assembly + verify
│   └── cli.py                      # `python -m ct.cli build|verify`
├── tests/                          # pytest test suite
│   ├── conftest.py
│   ├── test_curve.py
│   ├── test_pedersen.py
│   ├── test_schnorr.py
│   ├── test_rangeproof.py
│   └── test_transaction.py
├── examples/                       # sample transaction JSON files
├── scripts/
│   ├── compare_with_reference.py   # differential test vs reference impl
│   ├── reference_driver.py         # reference-side balance check (runs in reference venv)
│   ├── generate_solidity_vectors.py # produce test vectors for the on-chain verifier
│   ├── dry_run.sh                  # one-command pre-presentation sanity check
│   └── demo.sh                     # guided live presentation walkthrough
├── slides/                         # presentation deck (MimbleWimble_Presentation.pdf)
└── solidity/                       # on-chain verifier (Hardhat project)
    ├── contracts/
    │   └── MimbleWimbleVerifier.sol
    ├── test/
    │   ├── MimbleWimbleVerifier.test.js
    │   └── vectors.json            # generated from Python prover
    ├── hardhat.config.js
    └── package.json
```

---

## 3. Reference implementation

This project's reference is **[grinventions/mimblewimble-py](https://github.com/grinventions/mimblewimble-py)** — a pure-Python implementation of the MimbleWimble protocol, used by the Grin community. It is wallet-level (slatepacks, BIP39, full protocol), while this project's original implementation focuses on the underlying CT primitives.

### Install the reference

The reference depends on `secp256k1-zkp-mw`, a native binding that **compiles
the libsecp256k1-zkp C library from source**, so a C toolchain and the autotools
must be present *before* `pip install`:

```bash
# Build prerequisites for the native secp256k1-zkp extension:
#   macOS:        brew install autoconf automake libtool pkg-config
#   Debian/Ubuntu: sudo apt-get install build-essential autoconf automake libtool pkg-config
```

Then build the reference in its own virtualenv:

```bash
cd <some-sibling-dir>
git clone https://github.com/grinventions/mimblewimble-py.git
cd mimblewimble-py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install .
```

Sanity-check (should print a Grin slatepack address):

```bash
python -c "from mimblewimble.wallet import Wallet; w=Wallet.initialize(); print(w.getSlatepackAddress(path='m/0/1/0'))"
```

If the native build cannot be completed on your machine, the differential
script below still runs the original implementation alone and says so, and the
Solidity suite (§3.5) independently demonstrates the same accept/reject
behavior — so the project remains fully runnable without the reference.

### Run the differential comparison

The reference needs its own native dependencies, so it lives in its own
virtualenv. `scripts/compare_with_reference.py` runs in *this* project's venv
and shells out to the reference's venv (via `scripts/reference_driver.py`) — the
two environments never mix. Point at the reference with `MW_REFERENCE_PATH`
(it is also auto-detected in a sibling directory):

```bash
# from this project's directory, with its venv active
MW_REFERENCE_PATH=/path/to/mimblewimble-py \
    PYTHONPATH=. python scripts/compare_with_reference.py
```

This runs five scenarios through both impls and prints a comparison table.
Each scenario is built and verified by both implementations; the script exits
non-zero unless every verdict agrees. The comparison is at the Pedersen
commitment-balance level (the no-inflation check both impls share): the
reference uses the audited libsecp256k1-zkp commitments, this project uses the
pure-Python `ecdsa` curve. If the reference is not found, the script runs the
original implementation alone and says so.

**Supplying your own test inputs (Part A — output matching).** No code editing
is needed: pass a JSON file of inputs with `--scenarios`:

```bash
MW_REFERENCE_PATH=/path/to/mimblewimble-py \
    PYTHONPATH=. python scripts/compare_with_reference.py --scenarios inputs.json
```

```json
[
  {"name": "case1", "inputs": [[100, 161]], "outputs": [[95, 177]], "fee": 5, "should_be_valid": true},
  {"name": "case2", "inputs": [[50, 7], [75, 9]], "outputs": [[120, 13]], "fee": 5, "should_be_valid": true},
  {"name": "case3", "inputs": [[100, 5]], "outputs": [[200, 6]], "fee": 0, "should_be_valid": false}
]
```

`inputs`/`outputs` are `[value, blinding]` pairs; `should_be_valid` is optional
(omit it if the expected verdict is unknown — the script still checks that the
two implementations agree). The script exits non-zero on any disagreement. A
ready-to-edit template lives at `examples/scenarios_template.json` (running it
reproduces the default table).

---

## 3.5. Original solution: Solidity on-chain verifier (preferred)

This is the proposed own solution (Solidity preferred per the course guidance).
A Hardhat project under `solidity/` deploys a smart contract that verifies
MimbleWimble transactions on Ethereum. It validates two things:

1. **Kernel Schnorr signature** — that the spender knows the kernel excess
   scalar (proves ownership of input blinding factors).
2. **Commitment balance** — that `Σ C_in − Σ C_out − fee·H == kernelExcess`,
   proving no value was inflated.

Range proofs stay off-chain: the classical bit-commitment construction would
cost tens of millions of gas per output to verify on EVM, since secp256k1
has no native elliptic-curve precompile on Ethereum (only `ecrecover`).

### Install and test

```bash
cd solidity
npm install            # installs Hardhat + ethers + chai

# Generate fresh test vectors from the Python prover (one-time):
cd ..
source .venv/bin/activate
PYTHONPATH=. python scripts/generate_solidity_vectors.py

# Compile + test the contract:
cd solidity
npx hardhat compile
npx hardhat test
```

Expected output:

```
  MimbleWimbleVerifier
    verifyKernelSignature
      ✔ accepts a valid Schnorr signature [simple_message]
      ✔ accepts a valid Schnorr signature [empty_message]
      ✔ accepts a valid Schnorr signature [fee_8_bytes]
      ✔ rejects a tampered signature
      ✔ rejects a tampered message
    verifyBalance
      ✔ accepts a balanced transaction [one_in_one_out]
      ✔ accepts a balanced transaction [split]
      ✔ accepts a balanced transaction [combine]
      ✔ accepts a balanced transaction [zero_fee]
      ✔ rejects an unbalanced transaction (wrong fee)

  10 passing
```

### Contract interface

```solidity
function verifyKernelSignature(
    uint256 px, uint256 py,   // kernel excess point P
    uint256 rx, uint256 ry,   // signature nonce point R
    uint256 s,                // signature scalar
    bytes calldata message    // signed message (e.g. the fee)
) external view returns (bool);

function verifyBalance(
    uint256[] calldata inX, uint256[] calldata inY,
    uint256[] calldata outX, uint256[] calldata outY,
    uint256 fee,
    uint256 kernelExcessX, uint256 kernelExcessY
) external view returns (bool);
```

The two generators `G` and `H` are hardcoded as `internal constant` values
in the contract. `H` is derived from the public seed
`"MimbleWimble-CT/H/v1"` via try-and-increment in `ct/curve.py`; the
on-chain constant must match the off-chain derivation byte-for-byte.

### Gas characteristics

Each `verifyKernelSignature` call runs two `ecMul` plus an `ecAdd`. With
secp256k1 EC arithmetic implemented in pure Solidity (no native precompile),
this is in the millions of gas — fine for a demo on a local node or a
testnet, prohibitive on mainnet without optimizations. The contract is
deliberately straightforward (affine coordinates, no Jacobian, no wNAF) so
each line maps to a textbook formula.

---

## 4. Original implementation: the CT protocol in Python

The `ct/` package is a from-scratch implementation of the full MimbleWimble CT
protocol. It is the prover (it builds the transactions whose points feed the
Solidity verifier and the differential comparison) and verifies the range
proofs that stay off-chain.

### Pedersen commitment

A Pedersen commitment to value `v` with blinding factor `r` is the curve point

```
C(v, r) = v·H + r·G
```

where `G` is secp256k1's standard generator and `H` is a second generator
derived deterministically via try-and-increment from the public seed
`b"MimbleWimble-CT/H/v1"`. No one knows a scalar `k` such that `H = k·G`
(nothing-up-my-sleeve construction), which is what makes commitments binding.

Commitments are additively homomorphic:

```
C(v₁, r₁) + C(v₂, r₂)  =  C(v₁ + v₂, r₁ + r₂)
```

This is the property that lets MimbleWimble check transaction balance
without ever decommitting amounts.

### Transaction balance and kernel excess

For a balanced transaction (`Σ v_in = Σ v_out + fee`):

```
Σ C_in − Σ C_out − fee·H  =  (Σ r_in − Σ r_out) · G  =  excess · G
```

The excess scalar `excess = Σ r_in − Σ r_out` is published indirectly as a
public key `D = excess · G` (the "kernel excess point"), and the spender
proves they know `excess` by signing the transaction with a Schnorr signature
under that public key. This proves no value was created from nothing.

### Range proof

Pedersen commitments are homomorphic, which means a maliciously-crafted
negative amount could be used to inflate value (commit to `−5` and `+100`,
"balance" with `+95`, gain `5` from nowhere). A range proof shows each
committed amount is in `[0, 2⁶⁴)` so this attack fails.

This project uses the classical bit-commitment OR-proof construction
(pre-Bulletproofs, ~150 lines):

1. Decompose value into 64 bits.
2. Commit to each bit separately, with blinding factors chosen so that
   `Σ 2ⁱ · C_i = C(v, r)`.
3. For each bit commitment `C_i`, run a Σ-protocol OR-proof showing
   `b_i ∈ {0, 1}`.

Bulletproofs would be more compact, but the classical construction is
more transparent and easier to verify step-by-step.

### Kernel Schnorr signature

The kernel signature is a standard Schnorr signature on secp256k1:

```
Sign(x, msg):
    k ← secrets.randbelow(ORDER)          # CSPRNG nonce
    R = k·G
    e = sha256(R ∥ P ∥ msg) mod ORDER     # Fiat-Shamir challenge, P = x·G
    s = (k + e·x) mod ORDER
    return (R, s)

Verify(P, msg, R, s):
    e = sha256(R ∥ P ∥ msg) mod ORDER
    return s·G == R + e·P
```

The "private key" `x` is the kernel excess scalar; the "public key" `P` is
the kernel excess point computed from commitment balance.

---

## 5. CLI usage

### Build a transaction

```bash
PYTHONPATH=. python -m ct.cli build \
    --in VALUE,BLINDING [--in VALUE,BLINDING ...] \
    --out VALUE,BLINDING [--out VALUE,BLINDING ...] \
    --fee N \
    [--output PATH | -o PATH]
```

Writes a JSON transaction to stdout (or `--output`).

### Verify a transaction

```bash
PYTHONPATH=. python -m ct.cli verify PATH       # from file
PYTHONPATH=. python -m ct.cli verify -          # from stdin
```

Exit code `0` if valid, `1` otherwise.

### JSON transaction format

```json
{
  "fee": 5,
  "inputs":  [{"commitment": "<hex 33B>"}, ...],
  "outputs": [
    {"commitment": "<hex 33B>",
     "range_proof": {
       "bit_commitments": ["<hex 33B>", ...],
       "or_proofs": [[e0, e1, s0, s1], ...],
       "n_bits": 64}},
    ...],
  "kernel": {
    "excess": "<hex 33B>",
    "sig_R":  "<hex 33B>",
    "sig_s":  "<hex 32B>"}
}
```

---

## 6. Testing

```bash
PYTHONPATH=. pytest tests/ -v
```

For a comprehensive pre-presentation sanity check that runs the Python tests,
the CLI round-trip, all committed examples, a tamper test, and the Hardhat
Solidity suite:

```bash
bash scripts/dry_run.sh
```

For a guided live walkthrough that pauses between steps — the Part A
comparison, a transaction verify, a tamper test, and the on-chain verifier:

```bash
bash scripts/demo.sh                  # built-in scenarios
bash scripts/demo.sh inputs.json      # the instructor's 5 test inputs
```

Test suite covers:

| File | Coverage |
|---|---|
| `test_curve.py` | `H` derivation is on-curve, deterministic, ≠ G |
| `test_pedersen.py` | Commitments deterministic, homomorphic, balance check |
| `test_schnorr.py` | Sign-then-verify; rejects tampered sig/msg/key |
| `test_rangeproof.py` | Valid proof verifies for `v ∈ {0, 12345, 2⁶⁴−1}`; rejects proof against wrong commitment |
| `test_transaction.py` | 1-in-1-out, split, combine, zero-fee; rejects tampered commitment/sig |

---

## 7. Sample scenarios (for grading)

The five scenarios used in `scripts/compare_with_reference.py` are:

| # | Description | Inputs | Outputs | Fee | Should validate? |
|---|---|---|---|---|---|
| 1 | Simple 1-in-1-out | `(100, r₁)` | `(95, r₂)` | 5 | Yes |
| 2 | Split 1-in-2-out | `(100, r₁)` | `(60, r₂), (35, r₃)` | 5 | Yes |
| 3 | Combine 2-in-1-out | `(50, r₁), (75, r₂)` | `(120, r₃)` | 5 | Yes |
| 4 | Zero-fee | `(100, r₁)` | `(100, r₂)` | 0 | Yes |
| 5 | Inflating tx | `(100, r₁)` | `(200, r₂)` | 0 | No (rejected) |

These are the defaults. The instructor supplies the 5 evaluation inputs at
grading time — pass them with `--scenarios inputs.json` (see §3, "Supplying
your own test inputs") so no code editing is required.

---

## 8. Dependencies

| Package | Why |
|---|---|
| `ecdsa` | Pure-Python secp256k1 implementation. Exposes raw point operations (`ellipticcurve.PointJacobi`), unlike higher-level wrappers. Chosen for code transparency. |
| `pytest` | Test runner. |

No C extensions in the original implementation. Everything runs on stock
CPython 3.9+.

---

## 9. Security notes

This is a demo for an academic project. **Do not use in production.**

- Nonces use `secrets.randbits()` (CSPRNG), not `random` (PRNG).
  Reusing a nonce across two signatures leaks the private key.
- The `ecdsa` library is pure Python and not constant-time. Side-channel
  attacks are out of scope here but would matter in production.
- The classical bit-commitment range proof is correct but produces large
  proofs (~64 × 4 × 32 bytes ≈ 8 KB per output). Production systems use
  Bulletproofs for compactness.
- `H` is derived from a fixed public seed and the derivation is documented
  in `ct/curve.py`. Anyone can re-derive it; no trusted setup required.

---

## 10. References

- Tom Elvis Jedusor, *"MIMBLEWIMBLE"* (the original 2016 paper).
  https://download.wpsoftware.net/bitcoin/wizardry/mimblewimble.txt
- Andrew Poelstra, *"MimbleWimble"* (2016 writeup).
  https://download.wpsoftware.net/bitcoin/wizardry/mimblewimble.pdf
- Greg Maxwell, *"Confidential Transactions"* (CT origins).
  https://elementsproject.org/features/confidential-transactions/investigation
- Grin documentation. https://docs.grin.mw/
- Reference implementation: https://github.com/grinventions/mimblewimble-py
