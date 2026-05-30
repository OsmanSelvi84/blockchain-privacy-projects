# 1. Project Description

## 🎯 Goal
The (Secret Sharing Escrow Project) splits a given secret into (N) shares using the Shamir Secret Sharing algorithm, and stores those shares on a blockchain smart contract (Ethereum via Hardhat). Later on, the secret can be reconstructed using only (K) shares, called (the threshold), not all of them. And if not enough shares are provided to reconstruct the secret, its going to give a wrong result or an error, which is the expected behavior.

The blockchain part acts as an escrow layer, the shares are locked on-chain, and only the deployer (owner) can delete them. This means no single party can access or control the full secret on their own.

## 📌 Requirements
- Implement Shamir Secret Sharing (custom Python implementation)
- Store shares on a smart contract (Solidity / Ethereum)
- Require threshold (K) for reconstruction
- Prevent single-party access
- Validate share submission (no duplicates, valid index range)

## 🔐 Privacy Concept
Distributed trust model. No single party holds the full secret. The shares are stored on-chain, so they are transparent but useless unless the threshold (K) is met. The deployer controls deletion, so shares stay locked until the owner decides to wipe them.

## ⚙️ How It Works
1. A secret (string) is converted to an integer, then split into (N) shares using a random polynomial over a finite field (Mersenne prime)
2. Each share is a point (index, value) on that polynomial curve
3. The shares are saved to the blockchain via the (SecretSharingEscrow) contract
4. Any (K) of the (N) shares are enough to reconstruct the polynomial using Lagrange interpolation
5. The reconstructed integer is converted back to the original secret string


# 2. Branch Information ⚠️
- Repository: https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
- Branch: students/220304110-ousama-jamal-eddin


# 3. Requirements (software/tools) 💻
- Python 3.12 (exact version required, reference library not compatible with 3.13+) ⚠️⚠️
- Node.js v24+
- npm
- WSL (Ubuntu 24)


# 4. Installation 🚀
### Clone the repo
- git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
- cd blockchain-privacy-projects
- git checkout students/220304110-ousama-jamal-eddin
- cd 09-secret-sharing-escrow

### Install node dependencies
- npm install

### Compile the smart contract
- npx hardhat compile

### Install python dependencies
- pip3 install web3 --break-system-packages


# 5. How to Run (step by step) -> IMPORTANT 🛑
### Step 1: Start Hardhat node (keep this terminal running)
- npx hardhat node

### Step 2: Open a new terminal and deploy the contract
- python3 scripts/deploy.py

(Enter your desired N and K when it asks for it)

### Step 3: Run the demo
- python3 scripts/demo.py

(Enter a secret, the script will split it, save all shares to the blockchain, then reconstruct)

### Step 4: Run the tests
- python3 tests/test.py

### Step 5: Run interactive Shamir demo (no blockchain needed)
- python3 main.py


# 6. Reference Implementation and Compareson 🔃
- Repository: https://github.com/shea256/secret-sharing
- ⚠️ Note: Reference library requires Python 3.12 or lower
### If on Python 3.13+ (run compare.py in venv)
- python3.12 -m venv venv
- source venv/bin/activate
- pip3 install secretsharing --break-system-packages
- Compare: python3 compare.py


# 7. Project Structure 🏗️
```
├── README.md
├── contracts
│   └── secret_sharing_escrow.sol     // Solidity smart contract (stores shares on-chain, validates them, controls deletion)
├── scripts
│   ├── deploy.py                     // Deploys the contract to Hardhat with (N, K) parameters
│   └── demo.py                       // Splits a secret, saves all shares to blockchain, then reconstructs
├── tests
│   └── test.py                       // 5 automated test cases against the contract
├── shamir.py                         // Core Shamir Secret Sharing implementation (pure Python)
├── main.py                           // Interactive demo, pure Python, no blockchain needed
├── compare.py                        // Compares our output with the reference implementation
├── contract_address.txt              // WILL BE ADDED ONCE WE RUN deploy.py
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```


# 8. Test Cases ✅
- **Test 1**: Normal split and reconstruct, secret matches after the full cycle
- **Test 2**: Not enough shares (K-1 shares used), reconstruction fails or gives wrong result (expected behavior)
- **Test 3**: Duplicate share submission, rejected by the contract
- **Test 4**: Invalid share index (0), rejected by the contract (index must be between 1 and N)
- **Test 5**: Unauthorized user tries to delete shares, action rejected (only the deployer/owner can delete)


# 9. Troubleshooting 🔧

### Reference library fails with `long is not defined`
This happens on Python 3.13+. Fix:
```bash
python3.12 -m venv venv
source venv/bin/activate
pip install secretsharing web3
find venv/lib/python3.12/site-packages/secretsharing/ -name "*.py" -exec sed -i 's/long(/int(/g' {} \;
find venv/lib/python3.12/site-packages/secretsharing/ -name "*.py" -exec sed -i 's/isinstance(\(.*\), (int, long))/isinstance(\1, int)/g' {} \;
```

### `No such file or directory: artifacts/...`
The contract hasn't been compiled yet. Fix:
```bash
npx hardhat compile
```

### `Connection failed` when running scripts
The Hardhat node is not running. Fix:
```bash
npx hardhat node
```
Keep that terminal open and use a new terminal for scripts.

### `contract_address.txt not found`
The contract hasn't been deployed yet. Fix:
```bash
python3 scripts/deploy.py
```

### `web3` or `secretsharing` not found
Dependencies not installed. Fix:
```bash
pip install web3 secretsharing
```


# 10. References 📃
- Shamir Secret Sharing: https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing
- Bernal Bernabe, J. et al. (2019). Privacy-Preserving Solutions for Blockchain: Review and Challenges. IEEE Access, 7, 164908-164940. DOI: 10.1109/ACCESS.2019.2950872
- Reference Implementation: https://github.com/shea256/secret-sharing
- Solidity Documentation: https://docs.soliditylang.org
- Web3.py Documentation: https://web3py.readthedocs.io
- Hardhat Documentation: https://hardhat.org/docs
