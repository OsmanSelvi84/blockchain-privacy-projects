# CoinShuffle Mixing Protocol — Project 06

**Course:** COMP4052 — Introduction to Blockchain and DLT
**Instructor:** Osman Selvi
**Student:** Mert Mirzanli
**Term:** 2025–2026 Fall
**Project topic:** Project 06 — CoinShuffle Mixing Protocol

---

## 1. Project description

Bitcoin and most public blockchains advertise pseudo-anonymity, but every
transaction is recorded in a public ledger where input and output addresses
remain linkable. This project implements **CoinShuffle**, a decentralized
mixing protocol proposed by Ruffing, Moreno-Sanchez, and Kate (ESORICS 2014),
which breaks the link between sender and receiver addresses *without*
requiring a trusted third party.

### Goals (from the assignment brief)

- **Goal:** Break transaction traceability using coin mixing.
- **Requirements:**
  1. Implement a mixing pool *contract*.
  2. Shuffle inputs and outputs.
  3. Prevent linking sender to receiver.
- **Privacy concept:** Transaction unlinkability.

### How the implementation maps to the requirements

| Assignment requirement | Where it lives in the code |
|---|---|
| Mixing pool contract | `MixingPool` class in `coinshuffle_mixing.py` |
| Shuffle inputs and outputs | `MixingPool.shuffle_phase()` |
| Prevent linking sender → receiver | `build_onion()` + layered decryption inside `shuffle_phase()` |
| Transaction unlinkability | Demonstrated by `unlinkability_report()` and verified by `test_compare.py` |

---

## 2. Repository contents

```
coinshuffle-mixing-project/
├── coinshuffle_mixing.py      # ORIGINAL implementation (written from scratch)
├── coinshuffle_reference.py   # REFERENCE: Python 3 port of atong01/coinshuffle
├── naive_mixer.py             # BASELINE: centralized mixer (pre-CoinShuffle era)
├── test_compare.py            # Automated three-way comparison test
└── README.md                  # This file
```

### Roles of each implementation

| File | Authored by | Academic role |
|---|---|---|
| `coinshuffle_mixing.py` | Mert Mirzanli (student) | **Original implementation** — designed and written from scratch based on the CoinShuffle paper |
| `coinshuffle_reference.py` | Alexander Tong (atong01), Python 3 port by Mert Mirzanli | **Reference implementation** — adapted from an open-source 2017 CoinShuffle project |
| `naive_mixer.py` | Mert Mirzanli (student) | **Baseline** — represents the pre-CoinShuffle centralized-mixer approach |
| `test_compare.py` | Mert Mirzanli (student) | Test runner — verifies functional equivalence across all three implementations |

---

## 3. Required software and dependencies

- **Python 3.10 or newer** (tested on Python 3.14 on Windows 11, Python 3.12 on Ubuntu 24.04)
- **`cryptography` library**

### Install (Windows)

```bash
python -m pip install cryptography
```

### Install (Ubuntu / Linux)

```bash
sudo apt install python3 python3-pip git
python3 -m pip install cryptography
```

If you see an "externally-managed-environment" error on Ubuntu, use:
```bash
python3 -m pip install --user cryptography
```

---

## 4. Installation and run instructions

### Step 1 — Clone the repository

```bash
git clone https://github.com/MertMirzanli/coinshuffle-mixing-project.git
cd coinshuffle-mixing-project
```

### Step 2 — Install the single dependency

**Windows:**
```bash
python -m pip install cryptography
```

**Ubuntu / Linux:**
```bash
python3 -m pip install cryptography
```

### Step 3 — Run the original implementation

**Windows:**
```bash
python coinshuffle_mixing.py
python coinshuffle_mixing.py <num_players> <amount> <seed>
```

**Ubuntu / Linux:**
```bash
python3 coinshuffle_mixing.py
python3 coinshuffle_mixing.py <num_players> <amount> <seed>
```

### Step 4 — Run the reference implementation

```bash
python coinshuffle_reference.py        # Windows
python3 coinshuffle_reference.py       # Ubuntu / Linux
```

### Step 5 — Run the baseline

```bash
python naive_mixer.py                  # Windows
python3 naive_mixer.py                 # Ubuntu / Linux
```

### Step 6 — Run the automated comparison test

```bash
python test_compare.py                 # Windows
python3 test_compare.py                # Ubuntu / Linux
```

Expected output ends with:

```
RESULT: 5 passed, 0 failed (out of 5)
```

## 5. Sample input and output

### Input

Every script accepts the same three positional arguments:

| Argument | Meaning | Default |
|---|---|---|
| `num_players` | Number of participants in the mixing round | 3 |
| `amount` | Coin amount each player mixes | 1 |
| `seed` | Random seed for deterministic reproduction | 42 |

### Output (truncated example from `coinshuffle_mixing.py`)

```json
{
  "status": "SUCCESS",
  "test_input": {"num_players": 3, "amount": 1, "seed": 42},
  "input_addresses": ["INPUT_001", "INPUT_002", "INPUT_003"],
  "output_addresses_shuffled": [
    "0x2a716e3e54f60c458253",
    "0x6996dc547984414cd0ad",
    "0x29a9c482a0fdd76aa0c3"
  ],
  "unlinkability": {
    "anonymity_set_size": 3,
    "possible_input_output_mappings": 6,
    "observer_can_link": false
  }
}
```

The output is fully structured JSON so all three implementations can be
programmatically compared.

---

## 6. Testing instructions

`test_compare.py` runs all three implementations against the same five test
inputs and checks **functional equivalence**:

| Check | Pass criterion |
|---|---|
| All three status `SUCCESS` | Yes |
| Same set of output addresses across all three | Set equality (order may differ) |
| Same input/output counts | All implementations agree |
| Total amount preserved | `sum(inputs) == sum(outputs)` everywhere |

### The five test cases

| # | Scenario | Players | Amount | Seed |
|---|---|---|---|---|
| 1 | Minimum group | 2 | 1 | 7 |
| 2 | Typical small mix | 3 | 1 | 42 |
| 3 | Medium group | 5 | 1 | 100 |
| 4 | Larger amount | 4 | 10 | 999 |
| 5 | Bigger group | 6 | 5 | 2024 |

All five tests pass.

The test output also surfaces the central academic finding of the project:

```
privacy: original.observer_can_link=False | reference.observer_can_link=False | baseline.mixer_can_link=True
```

All three implementations produce the same *set* of shuffled outputs, but
only the CoinShuffle-based ones (original and reference) hide the
input-to-output permutation from every party. The baseline gets the same
result only by trusting a central mixer that knows everything.

---

## 7. Reference implementation details

### `coinshuffle_reference.py` — Python 3 port of `atong01/coinshuffle`

The reference implementation is a **Python 3 port** of the open-source
CoinShuffle implementation by Alexander Tong (`atong01`):

- **Upstream:** https://github.com/atong01/coinshuffle
- **Upstream file:** `coin_shuffle.py`
- **Upstream year:** 2017
- **License:** See upstream repository

### Why a port was necessary

The upstream code from 2017 is **not directly runnable** today:

1. **Python 2.** It uses Python 2 syntax (`iteritems()`, parenthesis-less `print`).
2. **Deprecated cryptography.** It depends on `pycrypto`, deprecated in 2018, not installable on Python 3.10+.
3. **External helper module.** Depends on a separate `util.py`.
4. **Numpy dependency** for `np.random.permutation` only.
5. **Distributed transport.** Uses HTTP via `requests`, requires multiple Flask servers and shell scripts.

### Adaptation changes (deliberately minimal)

| # | Change | Reason |
|---|---|---|
| 1 | `pycrypto` → `cryptography` library | `pycrypto` is unmaintained |
| 2 | `numpy.random.permutation` → `random.shuffle` | One less dependency |
| 3 | HTTP request chain → in-process method calls | Single-executable side-by-side testing |
| 4 | Python 2 syntax → Python 3 | Required |
| 5 | Same class and method names preserved | Line-for-line traceability to upstream |

The protocol logic, encryption-layering order, shuffle step, and final
transaction assembly are **identical to upstream**.

### Other sources studied (not used as the runnable reference)

| Source | Why not chosen |
|---|---|
| Ruffing et al., 2014 — ESORICS paper | The original specification, not itself runnable code |
| `decred/cspp` (https://github.com/decred/cspp) | Modern, but Go and CoinShuffle++ variant (different protocol family); cited for context only |

---

## 8. Baseline: `naive_mixer.py`

`naive_mixer.py` is **not** the assignment's reference implementation — it
is an extra comparison point representing the historical state of the art
**before** CoinShuffle was proposed (services like Bitcoin Fog and
BitLaundry, 2011–2014). It uses a trusted central server.

### Why include the baseline?

To make the value of CoinShuffle **measurable**:

| Property | `naive_mixer.py` (baseline) | `coinshuffle_*.py` (original + reference) |
|---|---|---|
| Architecture | Centralized coordinator | Fully decentralized |
| Encryption during shuffling | None | Layered (onion) RSA-OAEP + AES |
| Trusted third party required | **Yes** | **No** |
| Mixer learns sender → receiver mapping | **Yes** | **No** |
| External observer learns mapping | No | No |
| Funds at risk from a malicious mixer | **Yes** | No (all participants must sign) |

---

## 9. Cryptographic primitives used

| Primitive | Where | Why |
|---|---|---|
| RSA-2048 with OAEP padding | Layered encryption of output addresses | Standard, well-supported in `cryptography` |
| AES-128 (via Fernet) | Hybrid encryption payload | RSA alone has a small message-size limit |
| RSA-PSS with SHA-256 | Transaction signatures (original) | Modern provably secure RSA signature scheme |
| SHA-256 | Output address derivation | Standard cryptographic hash |

The Ruffing et al. paper uses ECDSA (secp256k1) and ECIES because they
target Bitcoin specifically. This project uses RSA-based equivalents
because:

1. The privacy properties are identical (layered public-key encryption + signed transactions).
2. `cryptography`'s RSA support is more stable cross-platform.

---

## 10. What this implementation does *not* do (scope)

The assignment brief lists three concrete requirements. The project sticks
to that scope. Deliberately *not* included:

- **Blame phase** for malicious participants (paper §3.4).
- **On-chain integration.** No real Bitcoin or Ethereum interaction.
- **Network protocol.** Players are simulated in the same Python process.
- **Solidity smart contract.** CoinShuffle's privacy mechanism must execute
  off-chain — running layered encryption on-chain would publish all
  ciphertexts and break unlinkability.

---

## 11. Submission information

- **Personal repository:** https://github.com/MertMirzanli/coinshuffle-mixing-project
- **Course repository branch:** `students/<student-branch>/06-coinshuffle-mixing` on https://github.com/OsmanSelvi84/blockchain-privacy-projects (to be pushed after this version is finalized).

---

## 12. References

1. Ruffing, T., Moreno-Sanchez, P., Kate, A. (2014). *CoinShuffle: Practical Decentralized Coin Mixing for Bitcoin.* ESORICS 2014.
2. Chaum, D. (1981). *Untraceable Electronic Mail, Return Addresses, and Digital Pseudonyms.* Communications of the ACM, 24(2).
3. Maxwell, G. (2013). *CoinJoin: Bitcoin privacy for the real world.*
4. Tong, A. (2017). `atong01/coinshuffle` — https://github.com/atong01/coinshuffle. Source for `coinshuffle_reference.py` (Python 3 port).
5. Decred Project. `decred/cspp` — https://github.com/decred/cspp. Contextual reference.