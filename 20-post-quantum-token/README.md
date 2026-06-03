# Blockchain Privacy Projects: Post-Quantum Token (PQ-ERC20)

**Student:** Elif Kuş / 210304003 
**Course:** COMP4052 Introduction to Blockchain and Distributed Ledger Technology  
**Branch:** 210304003-elif-kus  

## 📌 Project Description
This project implements a **Quantum-Resistant Token (PQ-ERC20)** on the Ethereum Virtual Machine (EVM). Standard blockchain transactions use ECDSA signatures, which are vulnerable to Shor's algorithm on quantum computers. To mitigate this risk, this project replaces standard signatures with the **Lamport One-Time Signature (OTS)** algorithm. It utilizes Hash-Based Cryptography (`keccak256`) to verify transactions on-chain securely.



## 🔗 Reference Implementation
As per the project requirements, a reference implementation was studied before developing this original contract:
* **Reference Repository:** https://github.com/Tetration-Lab/lamport-solidity
* **Conceptual Paper:** "Constructing digital signatures from a one-way function" by Leslie Lamport (1979).
* **Comparison:** While the reference provides a generalized Lamport library verifying signatures mathematically, this original implementation integrates the Lamport signature scheme directly into an ERC20-like token transfer function (`pqTransfer`). It handles balance states, nonce-based replay attack protections, and public key renewals from scratch.

---

## Running the Reference Implementation
To run and test the reference implementation, follow these steps (Requires Foundry):
```bash
git clone https://github.com/Tetration-Lab/lamport-solidity.git
cd lamport-solidity
forge install
forge build
forge test
```

Expected Output (Reference Project):
```text
[⠊] Compiling...
No files changed, compilation skipped

Ran 3 tests for test/Lamport.t.sol:LamportTest
[PASS] test_verify_0() (gas: 1447426)
[PASS] test_verify_1() (gas: 1544729)
[PASS] test_verify_random() (gas: 1515207)
Suite result: ok. 3 passed; 0 failed; 0 skipped; finished in 6.20ms (14.25ms CPU time)
```
---

## ⚙️ Original Project Setup Instructions

To run and test this original project, you need to have Node.js (v18 or higher) installed on your system

### 1. Installation

Clone the course repository, checkout to the specific student branch, and install the required Hardhat dependencies:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/210304003-elif-kus
cd 20-post-quantum-token
npm install
```
## 🛠️ Troubleshooting (NVM / Node): 
If you encounter a command not found: npm or npx error, your Node Version Manager (NVM) might be inactive in your current terminal session. You can activate it and select the correct Node version by running:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24
```

### 2. Build / Compile
To compile the original Post-Quantum Token smart contract, run:

```bash
npx hardhat compile
```

Expected Output:
```text
Compiled 1 Solidity file successfully or Nothing to compile
```

### 🧪 Testing & Evaluation Scenarios
The project includes 5 comprehensive test scenarios (written in JavaScript using Hardhat and Chai) to evaluate the on-chain verification, off-chain Lamport signature generation, and the business logic required for the final evaluation. Run the tests using the following command:

```bash
npx hardhat test
```

Expected Output(Original Project):

```text
  Post-Quantum Token (PQ-ERC20) Tests
    ✔ 1. Successful Registration
    ✔ 2. Successful Transfer with Valid Signature
    ✔ 3. Reject Transfer with Invalid Signature (79ms)
    ✔ 4. Replay Attack Prevention (143ms)
    ✔ 5. Insufficient Balance Check (174ms)

  5 passing (1s)
```

Developed for COMP4052 Final Evaluation.
