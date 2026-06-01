DID Management System

**Project description:**

This project is a Decentralized Identifier (DID) Management System built on the Ethereum blockchain. The idea behind it is that users own and control the their identities without depending on a central authority, and it is called **self-sovereign identity**.

Using a Solidity smart contract, this system lets users:
- Create their own digital identity (DID)
- Update it whenever they need to
- Revoke it if they no longer want it active
- Look it up (resolve it) at any time
  
Everything is stored on the blockchain, meaning no single authority controls the identity.



**Branch information:**

Name: Angelica Mwinkeu Bankumuna

Student ID: 220304129

Branch: students/220304129-angelica-mwinkeu-bankumuna



**Reference Implementation:**

For learning and comparison purposes, I studied the following open-source project:

*Repository:*
https://github.com/uport-project/ethr-did-registry

It is an official Ethereum DID Registry maintained by the Decentralized Identity Foundation. It is the industry standard for managing DIDs on Ethereum.
*How to run it:* Clone the repository and follow the setup instructions in their README file.



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
npx hardhat compile
```

**Expected output:**
Compiled 1 Solidity file successfully


**How to Deploy**

Start the local blockchain (keep this running):

```bash
npx hardhat node
```

Open a new terminal and deploy the contract:

```bash
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
