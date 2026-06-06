# Post-Quantum Token (PQT)
 
**Course:** Blockchain Privacy  
**Branch:** `students/220304142-waren-moudoumi-moustafa-konate`  
**Folder:** `20-post-quantum-token`
 
A hybrid ERC-20 token on Ethereum that uses **Lamport one-time signatures** to protect transfers against quantum computer attacks (Shor's algorithm).
 
---
 
## Reference Implementation
 
| | |
|---|---|
| **Repository** | https://github.com/Tetration-Lab/lamport-solidity |
| **Licence** | MIT |
| **Toolchain** | Foundry (`forge`) |
 
This project builds on the reference by adding a full ERC-20 token layer, a gas-efficient commitment scheme, cross-chain replay protection, and mandatory on-chain key rotation.
 
**Run the reference:**
```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
git clone https://github.com/Tetration-Lab/lamport-solidity.git
cd lamport-solidity && forge install && forge test -v
```
 
---
 
## Prerequisites
 
- **Node.js >= 18** → https://nodejs.org (LTS)
- **Git** → https://git-scm.com
---
 
## Installation
 
```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304142-waren-moudoumi-moustafa-konate
cd 20-post-quantum-token
npm install
```
 
---
 
## Commands
 
| Command | Description |
|---|---|
| `npm run compile` | Compile all contracts |
| `npm test` | Run all 28 tests |
| `npm run node` | Start local blockchain (Terminal 1) |
| `npm run deploy:local` | Deploy to local node (Terminal 2) |
| `npm run compare` | Run 5-case reference comparison (Terminal 2) |
| `npm run generate-keys` | Generate Lamport key pairs |
 
---
 
## Run Tests
 
```bash
npm test
```
 
Expected:
```
  PostQuantumToken
    1 · Deployment           3 passing
    2 · Standard ERC-20      8 passing
    3 · Minting              4 passing
    4 · PQ Key Registration  5 passing
    5 · PQ Transfer          6 passing
    6 · Security Cases       6 passing
    7 · Cryptographic        3 passing
 
  28 passing (~45s)
```
 
---
 
## Deploy Locally
 
```bash
# Terminal 1
npm run node
 
# Terminal 2
npm run deploy:local
```
 
---
 
## Comparison Script (Evaluation)
 
Runs the same 5 test inputs the instructor uses and compares outputs:
 
```bash
# Terminal 1 running — then:
npm run compare
```
 
Expected:
```
  Test 1: PQ Key Registration        ✅  MATCH
  Test 2: Valid PQ Transfer          ✅  MATCH
  Test 3: Invalid Signature          ✅  MATCH
  Test 4: Second Transfer + Rotation ✅  MATCH
  Test 5: Old Key Reuse Rejected     ✅  MATCH
 
  Score : 5/5   Status : ✅  FULLY COMPATIBLE
```
 
---
 
## Sample Inputs & Outputs
 
| Test | Input | Expected Output |
|---|---|---|
| Key Registration | publicKey (256 hash pairs) | `hasPQKey=true`, `nonce=0` |
| Valid PQ Transfer | 100 PQT, valid signature | `bob.balance=100`, `nonce=1` |
| Invalid Signature | Wrong private key | Reverts: `InvalidSignature` |
| Second Transfer | 50 PQT, rotated key | `bob.balance=150`, `nonce=2` |
| Old Key Reuse | Already-rotated key | Reverts: `InvalidPublicKey` |
 
---
 
## How Lamport Signatures Work
 
```
Key generation:
  Private key : 256 random pairs  SK[i] = (sk[i][0], sk[i][1])
  Public key  : PK[i] = (keccak256(sk[i][0]), keccak256(sk[i][1]))
 
Signing message hash M:
  bit i == 0  →  reveal sk[i][0]
  bit i == 1  →  reveal sk[i][1]
 
Verification:
  bit i == 0  →  check keccak256(sig[i]) == PK[i][0]
  bit i == 1  →  check keccak256(sig[i]) == PK[i][1]
```
 
Security: forging a signature requires inverting `keccak256` — no known quantum speedup beyond Grover's sqrt(N), and the 256-bit output already compensates for that.
 
---
 
## Project Structure
 
```
20-post-quantum-token/
├── contracts/
│   ├── libraries/LamportVerifier.sol     Lamport verification library
│   ├── interfaces/IPostQuantumToken.sol  Contract interface
│   └── PostQuantumToken.sol              Main token contract
├── test/PostQuantumToken.test.js         28 test cases
├── scripts/
│   ├── deploy.js                         Deployment script
│   ├── generateKeys.js                   Key pair generator
│   └── compare.js                        Reference comparison
├── hardhat.config.js
├── package.json
└── .env.example
```
 
---
 
## References
 
1. Lamport (1979). *Constructing Digital Signatures from a One-Way Function*. SRI International.
2. Tetration-Lab. *lamport-solidity*. https://github.com/Tetration-Lab/lamport-solidity
3. NIST FIPS 205 — SPHINCS+. https://csrc.nist.gov/pubs/fips/205/final
 
