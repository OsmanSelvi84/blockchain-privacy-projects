# MimbleWimble Confidential Transactions

COMP4052 — Introduction to Blockchain and DLT — Final Project
Student: Ege Deniz (220304118)
Branch: `students/220304118-ege-deniz`

This project is an original Python implementation of the MimbleWimble protocol's
Confidential Transactions (CT) primitives — Pedersen commitments, kernel
signatures, and bit-commitment range proofs — wired together as a verifiable
CLI demo.

A separate reference implementation (`grinventions/mimblewimble-py`) is used
to cross-validate functional behavior on the same scenarios.

---

## 1. Quick start

Prereqs: macOS or Linux, Python 3.10+, git.

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
│   └── generate_solidity_vectors.py # produce test vectors for the on-chain verifier
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

### Run the differential comparison

```bash
# from this project's directory, with its venv active
PYTHONPATH=. python scripts/compare_with_reference.py
```

This runs five scenarios through both impls and prints a comparison table.
The instructor can vary the scenarios in `SCENARIOS` to test additional inputs.

---

## 3.5. Solidity on-chain verifier

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

## 3.5. Solidity on-chain verifier

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

## 4. What the implementation does

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

Additional scenarios can be added by editing `SCENARIOS` in
`scripts/compare_with_reference.py`.

---

## 8. Dependencies

| Package | Why |
|---|---|
| `ecdsa` | Pure-Python secp256k1 implementation. Exposes raw point operations (`ellipticcurve.PointJacobi`), unlike higher-level wrappers. Chosen for code transparency. |
| `pytest` | Test runner. |

No C extensions in the original implementation. Everything runs on stock
CPython 3.10+.

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
