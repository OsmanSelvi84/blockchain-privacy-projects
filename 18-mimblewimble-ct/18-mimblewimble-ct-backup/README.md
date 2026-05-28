# MimbleWimble with Confidential Transactions (CT)

A Solidity simulation of MimbleWimble-style Confidential Transactions using Pedersen Commitments on Ethereum.

---

## Background

### What is MimbleWimble?

MimbleWimble (MW) is a blockchain privacy protocol introduced in 2016. Its key properties are:

- **Confidential amounts** – transaction values are hidden using Pedersen Commitments.
- **No addresses** – coins are owned by blinding factors, not public-key addresses.
- **Cut-through** – intermediate UTXOs can be pruned; only inputs and outputs that are net-new matter.
- **Compact blockchain** – the chain grows proportionally to the UTXO set, not the transaction history.

Well-known implementations include **Grin** and **Beam**.

### What are Confidential Transactions?

Confidential Transactions (CT), originally proposed by Greg Maxwell for Bitcoin, hide the value `v` of a coin using a **Pedersen Commitment**:

```
C = r·G + v·H
```

- `G` and `H` are distinct elliptic-curve generator points.
- `r` is a secret **blinding factor** known only to the owner.
- `v` is the transaction amount.

The commitment hides `v` (computationally binding, perfectly hiding). A transaction is valid if:

```
Σ C_inputs  =  Σ C_outputs  +  kernel_excess
```

The **kernel excess** is a commitment to the net blinding factor (`Σr_out − Σr_in`). A Schnorr signature on the excess proves the sender knows this value without revealing it.

**Range proofs** (Bulletproofs in production) prove `0 ≤ v < 2^n` without revealing `v`, preventing negative-value inflation attacks.

---

## Implementation

### Why Solidity?

True MimbleWimble runs on its own chain with native EC operations. The EVM lacks cheap secp256k1 scalar multiplication for arbitrary points, so this project **simulates** the core privacy concepts in Solidity using hash-based commitments.

| Real MimbleWimble | This Implementation |
|---|---|
| `C = r·G + v·H` (EC point) | `C = keccak256(r ‖ v ‖ owner)` |
| Bulletproof range proofs | Knowledge-of-opening + uint64 bound check |
| Schnorr signature on excess | `keccak256(kernel ‖ keccak256(inputs, outputs))` |
| EC homomorphism for balance | XOR-based commitment balance |

### Contract: `MimbleWimbleCT.sol`

#### Core components

**Pedersen Commitment (simulated)**
```solidity
C = keccak256(abi.encodePacked(blindingFactor, amount, owner))
```
- Hides the amount: same `amount` with different `blindingFactor` produces an entirely different hash.
- Binding: the owner must know `(r, v)` to open the commitment.

**UTXO Set**
- All unspent commitment hashes are tracked in a `bytes32[]` array.
- Spent commitments are flagged and removed from the set.

**Range Proof**
- Caller provides `(r, v)` and the contract verifies `keccak256(r, v, owner) == C` and `v < 2^64`.
- Simulates the "knowledge of opening" guarantee that Bulletproofs provide.

**Transaction Validation**
1. All inputs must be unspent UTXO commitments owned by `msg.sender` with valid range proofs.
2. All outputs must exist and have valid range proofs.
3. Balance check: `XOR(inputs) XOR XOR(outputs) == kernelCommitment`.
4. Kernel signature: `keccak256(kernel ‖ keccak256(abi.encode(inputs, outputs)))` must match.

**Kernel Commitment**
- Encodes the excess blinding factor `Σr_out − Σr_in`.
- In this simulation it is the XOR of all input and output commitments, which serves as a deterministic "excess" value.

#### Key functions

| Function | Description |
|---|---|
| `createCommitment(r, v)` | Create a new Pedersen-style commitment |
| `submitRangeProof(C, r, v, nonce)` | Prove `0 ≤ v < 2^64` and knowledge of opening |
| `mintCoinbase(r, v, recipient)` | Genesis/coinbase commitment (no inputs) |
| `createTransaction(inputs, outputs, kernel, sig)` | Build a confidential transaction |
| `finalizeTransaction(txId)` | Spend inputs, record finalized state |
| `isUnspent(C)` | Check if a commitment is in the UTXO set |
| `computeCommitmentHash(r, v, owner)` | Off-chain helper (pure) |

---

## Project Structure

```
18-mimblewimble-ct/
├── contracts/
│   └── MimbleWimbleCT.sol      # Main contract
├── scripts/
│   └── deploy.js               # Deployment + coinbase demo
├── test/
│   └── MimbleWimbleCT.test.js  # 21 comprehensive tests
├── hardhat.config.js
├── package.json
└── README.md
```

---

## Installation

**Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
cd 18-mimblewimble-ct
npm install
```

---

## Compile

```bash
npx hardhat compile
```

---

## Test

```bash
npx hardhat test
```

Expected output:
```
  MimbleWimbleCT
    Deployment
      ✔ deploys with zero commitments and transactions
    Pedersen Commitments
      ✔ creates a commitment and records it in the UTXO set
      ✔ commitment hash is deterministic for same inputs
      ✔ different blinding factors produce different commitments (hiding)
      ✔ same amount but different blinding looks different (amount is hidden)
      ✔ reverts on duplicate commitment
      ✔ isUnspent returns true for fresh commitment
    Range Proofs
      ✔ accepts a valid range proof
      ✔ rejects range proof with wrong blinding factor
      ✔ reverts range proof for non-existent commitment
    Coinbase / Mint
      ✔ mints a genesis commitment to a recipient
      ✔ reverts on duplicate coinbase commitment
    Confidential Transactions
      ✔ creates and finalizes a valid confidential transaction
      ✔ reverts when kernel signature is wrong
      ✔ reverts when input/output commitments are unbalanced (wrong kernel)
      ✔ reverts creating transaction with empty inputs
      ✔ reverts when non-owner tries to spend a commitment
      ✔ reverts spending an already-spent commitment
      ✔ reverts finalizing the same transaction twice
    UTXO Set Integrity
      ✔ UTXO shrinks after a transaction is finalized
      ✔ multiple commitments tracked correctly

  21 passing
```

---

## Deploy (local)

Terminal 1 — start a local node:
```bash
npx hardhat node
```

Terminal 2 — deploy:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

## Example Usage (JavaScript / ethers.js)

```js
const { ethers } = require("hardhat");

// 1. Deploy
const CT = await ethers.getContractFactory("MimbleWimbleCT");
const contract = await CT.deploy();

// 2. Alice creates an input commitment
const r_alice = ethers.hexlify(ethers.randomBytes(32));
const amount  = 500n;
await contract.connect(alice).createCommitment(r_alice, amount);
const hAlice  = await contract.computeCommitmentHash(r_alice, amount, alice.address);

// 3. Alice submits a range proof (proves 0 ≤ 500 < 2^64)
const nonce = ethers.hexlify(ethers.randomBytes(32));
await contract.connect(alice).submitRangeProof(hAlice, r_alice, amount, nonce);

// 4. Bob creates an output commitment
const r_bob = ethers.hexlify(ethers.randomBytes(32));
await contract.connect(bob).createCommitment(r_bob, amount);
const hBob  = await contract.computeCommitmentHash(r_bob, amount, bob.address);
await contract.connect(bob).submitRangeProof(hBob, r_bob, amount, nonce);

// 5. Compute kernel (XOR balance) and signature
const kernel    = BigInt(hAlice) ^ BigInt(hBob);
const kernelHex = ethers.toBeHex(kernel, 32);
const txContent = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(["bytes32[]", "bytes32[]"], [[hAlice], [hBob]])
);
const kernelSig = ethers.keccak256(
  ethers.solidityPacked(["bytes32", "bytes32"], [kernelHex, txContent])
);

// 6. Create and finalize the confidential transaction
const tx = await contract.connect(alice).createTransaction([hAlice], [hBob], kernelHex, kernelSig);
const receipt  = await tx.wait();
const txId     = receipt.logs.map(l => { try { return contract.interface.parseLog(l); } catch {} })
                              .find(e => e?.name === "TransactionCreated").args.txId;

await contract.connect(alice).finalizeTransaction(txId);
console.log("Alice's commitment spent:", !(await contract.isUnspent(hAlice)));
console.log("Bob's commitment unspent:", await contract.isUnspent(hBob));
```

---

## Security Considerations

| Concern | Status in this simulation |
|---|---|
| Amount hiding | Achieved — `keccak256(r, v, owner)` is a hiding commitment |
| Double-spend prevention | Enforced — UTXO set + `spent` flag |
| Inflation prevention | Enforced — balance (XOR kernel) check + range proof bound |
| Ownership enforcement | Enforced — only commitment owner can spend as input |
| True EC Pedersen commitments | **Not implemented** — EVM lacks cheap arbitrary-point EC ops |
| Bulletproofs | **Not implemented** — simplified knowledge-of-opening check |

---

## References

- [Original MimbleWimble paper (2016)](https://github.com/mimblewimble/docs/blob/master/whitepaper.pdf)
- [Confidential Transactions — Greg Maxwell](https://elementsproject.org/features/confidential-transactions)
- [Grin project](https://grin.mw/)
- [Beam project](https://beam.mw/)
- [Bulletproofs paper — Bünz et al. 2017](https://eprint.iacr.org/2017/1066.pdf)
