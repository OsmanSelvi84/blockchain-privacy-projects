# Social Recovery Wallet

**Name:** Norris
**Surname:** Nishimwe  
**Student ID:** 220304134 

---

## Project Description

A Social Recovery Wallet allows the owner of the wallet to regain access to their funds after losing their private key. 
There are different types of recoveris like seed phase recovery, which is different from this one. 

## How does Social recovery work?

The owner registers **N trusted guardians**. Those guardians might be close or trusted friends, family member or any person that they may trust. If the key is lost:
- Any guardian calls `initiateRecovery` with their ZK proof and a proposed new owner
- At least **T guardians** (the threshold) must call `supportRecovery` and cast their vote on the proposed owner. The threshold is defined by the owner if the wallet duting deployment. 
- One of the guardians calls `executeRecovery` once the threshold is reached.
- The owner can `cancelRecovery` at any time to stop a malicious attempt. 

---

## How to Clone and Run This Project

### Step 1 — Clone the Repository
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304134-norris-nishimwe
cd 02-social-recovery-wallet

### Step 2 — Run the Reference Implementation
cd reference-implementation
forge install
forge build
forge test

### Step 3 — Run My Implementation
cd ../my-implementation
npm install
npx hardhat compile
npx hardhat test
python src/social_recovery_wallet.py --test
python src/social_recovery_wallet.py --demo

## Reference Implementation

**Repository:** https://github.com/verumlotus/social-recovery-wallet  
**Author:** verumlotus  
**Building Tool:** Foundry  
---

## Required Software for Reference Implementation

**Git: used to clone the repository. find it at https://git-scm.com/download/win
**Git Bash: It's a terminal for Windows, it come together with Git(no need to download it aside)
**Foundry: used as a build and test tool. 

## Step 1 — Install Git

1. Go to **https://git-scm.com/download/win**
2. Download and install with all default settings
3. After install, open **Git Bash** from Start Menu
4. Verify:
```bash
git --version
```
Expected output: `git version 2.x.x`

---

## Step 2 — Install Foundry

Open **Git Bash** and run:

```bash
curl -L https://foundry.paradigm.xyz | bash
```

After it finishes, run:

```bash
foundryup
```

Wait for it to complete (takes 2-3 minutes). Then verify:

```bash
forge --version
```

Expected output: `forge 0.2.x`

If `foundryup` is not recognized, close Git Bash and reopen it, then run `foundryup` again.

---

## Step 3 — Clone the Reference Repository

```bash
cd Desktop
git clone https://github.com/verumlotus/social-recovery-wallet
cd social-recovery-wallet
```

---

## Step 4 — Install Dependencies

```bash
forge install
```

Expected output: Installing dependencies into lib/ folder.

---

## Step 5 — Build the Reference Contract

```bash
forge build
```

Expected output:
```
Compiling...
Compiler run successful
```

---

## Step 6 — Run Reference Tests

forge test


Expected output:

Running tests...
[PASS] testRecovery() ...
Test result: ok. 9 passed
---
##NOTICE: The reference project uses Foundry But I used Hardhat for my implementation because it's easier to me and more engaging. 

# — My Implementation Setup

## Required Software
**Node.js: preferably 18 or higher
**npm: it comes with Node.js
**Git: You can download it from https://git-scm.com
**Python: this is just for the demo, you don't need to open the demo of this implementation. 

---

## Step 1 — Install Python

1. Go to **https://python.org/downloads**
2. Download Python 3.11 or newer
3. **IMPORTANT:** During install check the box **"Add Python to PATH"**
4. Install with all defaults
5. Open Command Prompt and verify:


python --version

Expected output: `Python 3.11.x`

---

## Step 2 — Install Node.js

1. Go to **https://nodejs.org**
2. Download the **LTS version** (left button)
3. Install with all defaults
4. Open Command Prompt and verify:


node --version
npm --version


Expected output:

v22.x.x
10.x.x

---

## Step 4 — Open Terminal and Navigate to Project

Open Command Prompt:


cd "C:\Users\HP\Desktop\Social Recovery Wallet"


Verify you are in the right place:


dir


You should see: contracts, src, test, scripts, package.json, hardhat.config.js

---

## Step 5 — Install Node.js Dependencies

Run this once only:

npm install

Expected output: `added 577 packages`

Deprecation warnings are normal and can be ignored.

---

## Step 6 — Compile the Smart Contract

npx hardhat compile


Expected output:

Compiled 1 Solidity file successfully (evm target: paris).


---

# Running the Original Implementation

## Python Commands (No extra install needed)


# Run 13 automated tests
python src/social_recovery_wallet.py --test

# Run full end-to-end demo
python src/social_recovery_wallet.py --demo

# Interactive CLI menu
python src/cli.py


### Expected Output for --test:

  [PASS] Commitment derivation is deterministic
  [PASS] Valid proof passes verification
  [PASS] Tampered secret fails verification
  [PASS] Happy path recovery (t=2, n=3)
  [PASS] Recovery blocked below threshold
  [PASS] Spent nullifier rejected (anti-replay)
  [PASS] Unregistered guardian rejected
  [PASS] Owner can cancel recovery
  [PASS] Non-owner cannot cancel recovery
  [PASS] Different proposed owner rejected in supportRecovery
  [PASS] Deposit and execute external transaction
  [PASS] Guardian removal blocked before timelock
  [PASS] Guardian successfully swapped after timelock

  Results: 13 passed, 0 failed out of 13 tests


---

## Solidity / Hardhat Commands

# Run 22 smart contract tests
npx hardhat test


### Expected Output:

  SocialRecoveryWallet
    Deployment
      ✓ sets correct owner and threshold
      ✓ starts with zero guardians and not in recovery
    Guardian Management
      ✓ owner can add a guardian
      ✓ non-owner cannot add guardian
      ✓ cannot add duplicate commitment
      ✓ owner can queue and execute guardian removal
      ✓ guardian removal blocked before timelock
    ZK Commitment Helpers
      ✓ deriveCommitment matches JS computation
      ✓ verifyProof returns true for registered guardian
      ✓ verifyProof returns false for unregistered
    Recovery Flow
      ✓ guardian can initiate recovery
      ✓ second guardian can support recovery
      ✓ supportRecovery rejects different proposed owner
      ✓ unregistered guardian cannot initiate
      ✓ spent nullifier is rejected
      ✓ executes recovery when threshold is reached
      ✓ execution blocked below threshold
      ✓ owner can cancel recovery
      ✓ non-owner cannot cancel
    Wallet Operations
      ✓ receives ETH
      ✓ owner can execute external transaction
      ✓ non-owner cannot execute external transaction

  22 passing (2s)


---

## Deploy to Local Blockchain

Open TWO terminal windows:

**Terminal 1 — Start local blockchain:**

cd "C:\Users\HP\Desktop\Social Recovery Wallet"
npx hardhat node


Leave this running. You will see 20 test accounts with fake ETH.

**Terminal 2 — Deploy contract:**

cd "C:\Users\HP\Desktop\Social Recovery Wallet"
npx hardhat run scripts/deploy.js --network localhost


Expected output:

Deploying SocialRecoveryWallet...
  Deployer : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Threshold: 2

✓ Deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3


---

# Sample Inputs and Outputs (5 Test Cases)

## Test Case 1 — Guardian Registration

**Input:** Register a guardian with ZK commitment  
**Command:**

npx hardhat test --grep "owner can add a guardian"

**Expected output:** `✓ owner can add a guardian`

---

## Test Case 2 — Happy Path Recovery

**Input:** 3 guardians, threshold=2, 2 guardians approve, execute called  
**Command:**

npx hardhat test --grep "executes recovery when threshold is reached"

**Expected output:** `✓ executes recovery when threshold is reached`

Full demo:

python src/social_recovery_wallet.py --demo


---

## Test Case 3 — Replay Attack Blocked

**Input:** Guardian submits same nullifier twice  
**Command:**

npx hardhat test --grep "spent nullifier is rejected"

**Expected output:** `✓ spent nullifier is rejected`

---

## Test Case 4 — Below Threshold Blocked

**Input:** Only 1 guardian approves when threshold=2  
**Command:**

npx hardhat test --grep "execution blocked below threshold"

**Expected output:** `✓ execution blocked below threshold`

---

## Test Case 5 — Unregistered Guardian Blocked

**Input:** Random values not matching any registered commitment  
**Command:**

npx hardhat test --grep "unregistered guardian cannot initiate"

**Expected output:** `✓ unregistered guardian cannot initiate`

---


##MAIN IMPROVEMENTS FROM THE REFERENCE 

# Zero-Knowledge Proof 

## Commitment Scheme

Guardian keeps private:
    secret    = random 256-bit value
    nullifier = unique 256-bit tag

Guardian publishes to owner:
    commitment = keccak256(secret || nullifier)

To vote (prove guardianship):
    Reveal (secret, nullifier)
    Contract re-computes keccak256(secret || nullifier)
    Checks it equals the stored commitment  
    Marks nullifier as permanently spent    

## Why This Is Private

- Before voting: only the commitment is on-chain — guardian is completely anonymous
- After voting: secret is revealed but the nullifier prevents any reuse
- Hiding property: keccak256 is one-way — you cannot reverse a commitment
- Binding property: impossible to find two different inputs with the same commitment

## Nullifiers

A nullifier works like a unique serial number. Once spent, it is permanently recorded. Even if someone copies a revealed proof, they cannot submit it again.

---
### Privacy of the Reference

- Guardian stored as `keccak256(address)` which can be unsecure
- During votes, the guardian's Address is revealed which means that the identity can easily be revealed Never revealed

## Similarities 
- Recovery flow: initiate→support→execute 
- Guardian removal: 3-day timelock 
- Threshold scheme: T(threshold)-of-N(guardians)
