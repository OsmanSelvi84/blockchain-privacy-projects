# Post Quantum Privacy Token

This project is a simple blockchain privacy project developed with Solidity and Hardhat.

The purpose of the project is to create a basic privacy-focused token system using hash commitments.

The project was developed for the Blockchain Privacy Projects course.

---

# Project Topic

20 - Post Quantum Token

---

# Project Features

- Basic token transfer
- Privacy transfer mechanism
- Commitment hash generation
- Local blockchain deployment
- Smart contract testing
- Simple frontend demo
- Reference implementation comparison

---

# Privacy Mechanism

In this project, transaction information is not stored directly on chain.

Instead, a commitment hash is created using:

- receiver address
- transfer amount
- secret string

The commitment is generated with `keccak256`.

Example:

```text
commitment = hash(receiver + amount + secret)
```

# Folder Structure
```text
contracts/
test/
scripts/
frontend/
reference/
comparison/
README.md
```

# Branch Information

20-post-quantum-token

# Requirements

- Node.js v18 or v20 (v21 and above are not supported by Hardhat 2.x)

Check your version:

```bash
node --version
```

If you need to switch versions, use nvm:

```bash
nvm install 20
nvm use 20
```

# Installation

Clone repository:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Checkout project branch:

```bash
git checkout students/210304037-efe-ozturk
```

Go to project folder:

```bash
cd post-quantum-token
```

Install dependencies:

```bash
npm install
```

> **Important:** Always run all commands from inside the project folder.
> Running `npx hardhat` from outside the project folder will download the latest global Hardhat version, which may be incompatible with this project.

> **If you get a `Bus error` or strange install errors**, clean and reinstall:
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

# Compile Smart Contract

```bash
npx hardhat compile
```

Expected output:

```text
Compiled 1 Solidity file successfully
```

# Run Tests

```bash
npx hardhat test
```

Expected output:

```text
3 passing
```

> **Note:** Do not use `--network localhost` for tests. Hardhat runs tests on its built-in in-memory network by default. No separate node is needed for testing.

# Start Local Blockchain

Open a terminal and run:

```bash
npx hardhat node
```

Expected output:

```text
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

Keep this terminal open. The node must stay running while you deploy.

# Deploy Smart Contract

Open a **second terminal**, go to the project folder, and run:

```bash
cd post-quantum-token
npx hardhat run scripts/deploy.js --network localhost
```

Expected output:

```text
Contract deployed to: 0x...
```

> **Important:** The `hardhat node` terminal must be running before you deploy.
> Deploy and node commands must run in **separate terminals**.

# Frontend Demo

Open in browser:

```text
frontend/index.html
```

Enter receiver address, amount, and secret. Click "Create Commitment" to generate a keccak256 commitment hash.

The frontend works standalone and does not require the local node to be running.

# Smart Contract Functions

- transfer()
- createCommitment()
- privateTransfer()

# Reference Implementation

Reference project used for learning and comparison:

DDMixer

Repository:

https://github.com/alibertay/DDMixer

The reference implementation was:

- cloned locally
- dependency-installed
- executed successfully

Reference project technologies:

- Solidity
- Python
- Flask
- HTML
- JavaScript

# Comparison

```text
comparison/test-inputs.json
comparison/comparison.md
```

These files contain:

- 5 sample test inputs
- implementation comparison
- privacy mechanism explanations

# Demo Flow

1. Compile smart contract
2. Run tests
3. Start local blockchain (Terminal 1)
4. Deploy smart contract (Terminal 2)
5. Open frontend demo
6. Generate commitment hash

# Troubleshooting

**Bus error (core dumped) during test**

Node.js binary incompatibility in node_modules. Fix:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Cannot connect to localhost / ECONNREFUSED 127.0.0.1:8545**

The local node is not running. Start it first:

```bash
npx hardhat node
```

Then run deploy in a separate terminal.

**Wrong Hardhat version installed globally**

If you see `ERROR: You are using Node.js X which is not supported by Hardhat`, you ran `npx hardhat` from outside the project folder. Always `cd` into the project folder first so the local `node_modules/.bin/hardhat` is used instead of the global one.

**Port already in use (EADDRINUSE 8545)**

A `hardhat node` instance is already running. Either use that existing node, or kill it:

```bash
lsof -ti:8545 | xargs kill
```

# Notes

This project is a simplified educational privacy token implementation.

The project was developed for learning blockchain privacy concepts and demonstrating privacy-preserving transaction logic.

This implementation is not intended for production use.
