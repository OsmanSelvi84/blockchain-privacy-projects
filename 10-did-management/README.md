DID Management System

**Branch information:**

Name: Angelica Mwinkeu Bankumuna

Student ID: 220304129

Branch: students/220304129-angelica-mwinkeu-bankumuna


**Project description:**

This project is a Decentralized Identifier (DID) Management System built on the Ethereum blockchain. The idea behind it is that users own and control the their identities without depending on a central authority, and it is called **self-sovereign identity**.

Using a Solidity smart contract, this system lets users:
- Create their own digital identity (DID)
- Update it whenever they need to
- Revoke it if they no longer want it active
- Look it up (resolve it) at any time

Because in today's world, my identity is controlled by others:
- Facebook owns my Facebook identity
- Google owns my Gmail identity
- Governments own my national ID
- Banks own my financial identity

This means they can delete your account, sell your data, or deny my access at any time.

This project solves this by putting my identity on the **blockchain** where:
- Nobody can delete it
- Nobody can modify it without your permission
- Nobody controls it except YOU
- It exists forever

This concept is called **Self-Sovereign Identity (SSI)**Everything is stored on the blockchain, meaning no single authority controls the identity.

The concept behind the **Self-Sovereign Identity** is I own and control my identity with 3 key principles: control, Portability and privacy.

**Reference Implementation:**

For learning and comparison purposes, I studied the following open-source project:

*Repository:*
https://github.com/uport-project/ethr-did-registry

It is an official Ethereum DID Registry maintained by the Decentralized Identity Foundation. It is the industry standard for managing DIDs on Ethereum.
- **How to run it:**
```bash
git clone https://github.com/uport-project/ethr-did-registry.git
cd ethr-did-registry
npm install
npx hardhat compile
npx hardhat test
```
**Result:* 54 tests passing



**My Project Structure:**

10-did-management/

├── contracts/

      └── DIDRegistry.sol        # The main smart contract
      
├── scripts/

     └── deploy.js              # Script to deploy the contract
     
├── test/

     └── DIDRegistry.test.ts    # Tests for the smart contract

├── hardhat.config.ts           # Hardhat configuration

├── package.json                # Project dependencies

└── README.md               


https://github.com/OsmanSelvi84/blockchain-privacy-projects/tree/students/220304129-angelica-mwinkeu-bankumuna
**Required software tools:**

a. [Node.js](https://nodejs.org) v22 or higher

b. npm v10 or higher

c. [Git](https://git-scm.com)


**How to Install:**

*Step1* — Clone the repository and switch to my branch

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304129-angelica-mwinkeu-bankumuna
cd 10-did-management
```

*Step2* — Install dependencies

```bash
npm install
```

**How to Compile:**

```bash
npx hardhat clean
npx hardhat compile
```

**Expected output:**
Compiled 1 Solidity file successfully


**How to Deploy**

```bash
npx hardhat node
```

Open a new terminal and deploy the contract:

```bash
cd C:\Users\gykmw\blockchain-privacy-projects\10-did-management
npx hardhat run scripts/deploy.js
```

**Expected output:**
Deploying DIDRegistry to default
DIDRegistry deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3


**Testing instructions:**

```bash
node --test test/DIDRegistry.test.ts
```

*Expected output:*
✔ Should create and resolve a DID
✔ Should update a DID
✔ Should revoke a DID
pass 3 / fail 0


**Smart Contract Functions:**

| Function | Description |

| `createDID(did, document)` | Creates a new DID and stores its document |

| `updateDID(did, newDocument)` | Updates the document of an existing DID |

| `revokeDID(did)` | Revokes a DID so it can no longer be used |

| `resolveDID(did)` | Returns the full details of a DID |

| `getDIDsByOwner(address)` | Returns all DIDs owned by a given address |

*Example Usage*

# Creating a DID
Input:  createDID("did:example:123", '{"name":"Angelica"}')
Result: DID is created and stored on the blockchain

# Resolving a DID
Input:  resolveDID("did:example:123")
Result: Returns owner address, document, creation date, last updated, and active status

# Revoking a DID
Input:  revokeDID("did:example:123")
Result: DID is marked as inactive and can no longer be updated 
