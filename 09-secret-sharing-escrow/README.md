# Secret Sharing Escrow Project

## What is this project?

This is my implementation of a decentralized escrow system using **Shamir's Secret Sharing (SSS)**. The main goal is to split a secret (like a private wallet key) among multiple trustees so that no single person has full control.

## 🎯 How I Met the Project Requirements

1. **Implement Shamir Secret Sharing:** I used the `secrets.js-grempe` Node.js library to securely implement the mathematical SSS algorithm over a Galois Field.
2. **Require threshold for reconstruction:** The system is configured with a strict threshold (`k=3`). Exactly this many shares are required to reconstruct the original secret.
3. **Prevent single-party access:** As demonstrated in Scenario A of the test script, attempting recovery with only 2 shares produces garbage data — the system mathematically fails.
4. **Distributed trust model:** The secret is split among 5 independent trustees (Aytunc, Selin, Zeynep, Polat, Esref), eliminating any central authority.

## Why Distributed Trust?

In traditional systems, a single server or escrow provider creates a **Single Point of Failure (SPOF)**. If that authority is hacked or goes offline, assets are lost forever. By dividing the secret into pieces, we distribute trust and remove central risk — a core principle of Web3.

## System Design: On-chain vs Off-chain

Private keys cannot be stored on a public blockchain. To solve this:

- **Off-Chain (Cryptography):** The actual splitting and combining of the secret happens locally using `escrow.js`.
- **On-Chain (Smart Contract):** The blockchain manages the process — storing the list of authorized trustees and logging when a recovery is initiated and approved.

## How the Threshold Model Works

This project implements a `(k, n)` threshold model with `n=5` trustees and `k=3` threshold.

- The secret is split into 5 shares, one per trustee.
- To reconstruct the secret, at least **3 trustees** must combine their shares (via Lagrange Interpolation).
- Any fewer than 3 shares produces mathematically incorrect output.

---

## 📁 Project Structure

```
09-secret-sharing-escrow/
├── escrow.js          # Off-chain Shamir Secret Sharing (original implementation)
├── reference.js       # Reference implementation from secrets.js-grempe examples
├── Escrow.sol         # On-chain Solidity smart contract
├── package.json       # Node.js dependencies
└── README.md          # This file
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `secrets.js-grempe` | latest | Shamir's Secret Sharing over GF(2^8) |

---

## 🚀 How to Run — Original Implementation (Off-Chain)

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)

### Steps

**1. Clone the repository and switch to your branch:**
```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/210304020-aytunc-emre-ozkan
cd 09-secret-sharing-escrow
```

**2. Install dependencies:**
```bash
npm install
```

**3. Run with default secret:**
```bash
node escrow.js
```

**4. Run with custom secret:**
```bash
node escrow.js "YourSecretHere"
```

### Expected Output

```
------------------------------------------------------------
 SETUP: SECRET SHARING ESCROW SYSTEM
------------------------------------------------------------
  Secret   : 0xABC123Def456Ghi789PrivateWalletKeyBBSSE
  Shares   : 5 parties
  Threshold: 3 parties required for reconstruction
  Any 3 of 5 trustees can reconstruct.
  Fewer than 3 reveal ZERO information.
------------------------------------------------------------
 PHASE 1: Splitting secret into shares
------------------------------------------------------------
  Each trustee receives one share:
  [Share 1] Aytunc: 801xxxxxxxxxxxxxxxxx...
  [Share 2] Selin : 802xxxxxxxxxxxxxxxxx...
  [Share 3] Zeynep: 803xxxxxxxxxxxxxxxxx...
  [Share 4] Polat : 804xxxxxxxxxxxxxxxxx...
  [Share 5] Esref : 805xxxxxxxxxxxxxxxxx...
  Individual shares are mathematically meaningless alone.
------------------------------------------------------------
 PHASE 2: Blockchain Escrow (Escrow.sol)
------------------------------------------------------------
  Escrow.sol enforces the trust model on-chain:
  1. Owner deploys contract with threshold=3 and 5 trustee addresses.
  2. Owner calls initiateRecovery() to start a recovery session.
  3. Each trustee calls approveRecovery() -- recorded on-chain.
  4. When approvalCount >= 3, contract emits RecoverySuccess().
  5. Off-chain: approved trustees combine shares to reconstruct the secret.
------------------------------------------------------------
 PHASE 3: Reconstruction Scenarios
------------------------------------------------------------
  [SCENARIO A] 2 trustees attempt reconstruction (below threshold)
  Parties: Aytunc, Selin | Shares: 2 | Required: 3
  Result: FAILED (expected)
  Reason: Shamir produces cryptographic garbage with insufficient shares.
  On-chain: approvalCount=2 < threshold(3). Contract rejects.

  [SCENARIO B] 3 trustees reconstruct (meets threshold)
  Parties: Zeynep, Polat, Esref | Shares: 3 | Required: 3
  Result: SUCCESS
  Recovered: 0xABC123Def456Ghi789PrivateWalletKeyBBSSE
  On-chain: approvalCount=3 >= threshold(3). RecoverySuccess() emitted.

  [SCENARIO C] 4 trustees reconstruct (exceeds threshold)
  Parties: Aytunc, Selin, Polat, Esref | Shares: 4 | Required: 3
  Result: SUCCESS
  Recovered: 0xABC123Def456Ghi789PrivateWalletKeyBBSSE
  Extra shares do not change result -- threshold already met.
------------------------------------------------------------
 SUMMARY
------------------------------------------------------------
  Shamir Secret Sharing (3-of-5):
  Shares available   |  Reconstruct?
  1 of 5             |  NO  -- random noise
  2 of 5             |  NO  -- random noise
  3 of 5 (threshold) |  YES -- exact secret
  4 of 5             |  YES -- exact secret
  5 of 5             |  YES -- exact secret

  Privacy concept: Distributed Trust Model
  - No single party holds the complete secret.
  - Blockchain (Escrow.sol) enforces threshold rule transparently.
```

---

## 📎 Reference Implementation

**Library:** `secrets.js-grempe`
**Repository:** https://github.com/grempe/secrets.js
**npm:** https://www.npmjs.com/package/secrets.js-grempe

The `reference.js` file runs the official examples from the `secrets.js-grempe` library for direct comparison with the original implementation.

### Run the Reference Implementation

```bash
node reference.js
```

**With custom input:**
```bash
node reference.js "YourSecretHere"
```

### Expected Output

```
=== REFERENCE IMPLEMENTATION ===
Source: https://github.com/grempe/secrets.js

[TEST 1] Split a password with threshold 3-of-5
Original : <<PassWord123>>
Shares   : 5
2 shares match: false
3 shares match: true

[TEST 2] Split a 512-bit random key with threshold 5-of-10
4 shares match: false
5 shares match: true

=== END REFERENCE ===
```

### Comparison: Reference vs Original

| Feature | Reference (reference.js) | Original (escrow.js) |
|---------|--------------------------|----------------------|
| Algorithm | Shamir's Secret Sharing | Shamir's Secret Sharing |
| Threshold | Configurable (k,n) | Fixed (3,5) |
| Custom input | Yes (process.argv) | Yes (process.argv) |
| Below threshold | Returns false | Detects and reports garbage |
| At threshold | Returns true | Full recovery + verification |
| Blockchain | None | Escrow.sol on-chain enforcement |
| Scenarios | 2 test cases | 3 scenarios (A, B, C) |

Both implementations use the same underlying cryptographic algorithm and produce equivalent results for the same inputs.

---

## 🔗 How to Test the Smart Contract (On-Chain)

### Step 1 — Open Remix IDE

Go to [https://remix.ethereum.org](https://remix.ethereum.org)

### Step 2 — Load the Contract

- Create a new file named `Escrow.sol`
- Paste the contents of `Escrow.sol` from this repository

### Step 3 — Compile

- Go to the **Solidity Compiler** tab
- Set compiler version to `0.8.0`
- Click **Compile Escrow.sol**

### Step 4 — Deploy

- Set **Environment** to `Remix VM (Osaka)`
- `_threshold`: `3`
- `_initialTrustees`:
```
["0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2","0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db","0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB","0x617F2E2fD72FD9D5503197092aC168c91465E7f2"]
```
- Click **Deploy**

### Step 5 — Test the Contract Functions

| Step | Function | Who calls it | Expected Result |
|------|----------|-------------|-----------------|
| 1 | `initiateRecovery()` | Owner account | `RecoveryStarted` event emitted |
| 2 | `approveRecovery()` | Trustee account #1 | `approvalCount` becomes 1 |
| 3 | `approveRecovery()` | Trustee account #2 | `approvalCount` becomes 2 |
| 4 | `approveRecovery()` | Trustee account #3 | `approvalCount` becomes 3, `RecoverySuccess` emitted |
| 5 | `isReadyForReconstruction()` | Anyone | Returns `true` |

---

## 📚 References

- [Shamir's Secret Sharing — Wikipedia](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing)
- [secrets.js-grempe GitHub](https://github.com/grempe/secrets.js)
- [secrets.js-grempe npm](https://www.npmjs.com/package/secrets.js-grempe)
- [Remix IDE Documentation](https://remix-ide.readthedocs.io/)