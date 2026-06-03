# eHealth Dynamic Consent Smart Contract

## 1. Project Description

### Goal

The purpose of this project is to create a simple blockchain-based healthcare consent management system using Solidity and Hardhat.

In many healthcare systems, patients do not have direct control over how their data permissions are managed. This project focuses on giving patients the ability to manage their own consent dynamically through a smart contract.

The system allows a patient to:

* give consent to a healthcare provider,
* update an existing consent,
* revoke consent at any time,
* and allow providers to verify whether consent is active.

The project stores only consent-related information on-chain such as:

* consent status,
* purpose,
* data type,
* and timestamps.

Actual medical records are NOT stored on the blockchain.

---

### Requirements

* Solidity smart contract implementation
* Dynamic consent management
* Consent validation checks
* Automated testing with Hardhat
* Deployment script
* Reference implementation comparison
* Permission control using `msg.sender`

---

### Privacy Concept

The project focuses on patient-controlled permissions.

Instead of storing sensitive medical records directly on-chain, the blockchain is only used to store consent information. This reduces privacy risks and unnecessary storage costs while still providing transparency and integrity for consent management.

Only the patient who created the consent can update or revoke it.

---

### How It Works

1. A patient gives consent to a healthcare provider.
2. The consent stores:

   * provider address,
   * purpose,
   * data type,
   * timestamp,
   * active status.
3. The provider can check whether consent exists.
4. The patient can later:

   * update the consent,
   * or revoke it completely.
5. Validation checks prevent invalid or unauthorized actions.

---

# 2. Branch Information 

Repository:
https://github.com/OsmanSelvi84/blockchain-privacy-projects.git

Branch:
`students/220304119-mena-ghazowan-hamood`

Project Folder:
`14-ehealth-dynamic-consent`

---

# 3. Requirements (software/tools) 

* Node.js
* npm
* Hardhat
* Solidity
* TypeScript

---

# 4. Installation 

Clone the repository:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Enter the repository:

```bash
cd blockchain-privacy-projects
```

Switch to the assigned branch:

```bash
git checkout students/220304119-mena-ghazowan-hamood
```

Open the project folder:

```bash
cd 14-ehealth-dynamic-consent
```

Install dependencies:

```bash
npm install
```

---

# 5. How to Run (step by step)

### Step 1: Compile the smart contract

```bash
npx hardhat compile
```

---

### Step 2: Run the automated tests

```bash
npx hardhat test
```

Expected result:

```text
10 passing
```

---

### Step 3: Deploy the contract

```bash
npx hardhat run scripts/deploy.ts
```

Example output:

```text
DynamicConsent deployed to: 0x...
```

---

# 6. Reference

Reference project used during research:
SC-DCMS
https://github.com/mlecjm/sc-dcms

The reference implementation was used only to understand how blockchain based dynamic consent systems are structured.
This project was independently implemented using Solidity and Hardhat.


# 7. Project Structure 

```text
14-ehealth-dynamic-consent/
│
├── contracts
│   └── DynamicConsent.sol
│
├── test
│   └── DynamicConsent.ts
│
├── scripts
│   └── deploy.ts
│
├── hardhat.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

# 8. Test Cases 

### Functional Tests

* Patient gives consent
* Provider checks consent
* Patient updates consent
* Patient revokes consent
* Unauthorized user update rejection

### Validation Tests

* Invalid provider address rejection
* Empty purpose rejection
* Empty data type rejection
* Revoking non-existing consent rejection
* Updating inactive consent rejection

---

# 9. Notes 

This project intentionally avoids storing real healthcare data on-chain.
The blockchain is used only for consent verification and permission management.
The focus of the implementation is:
* dynamic consent logic,
* validation/security checks,
* and blockchain-based transparency.

---

# 10. References 
* Hardhat Documentation: https://hardhat.org/docs
* SC-DCMS Reference Project: https://github.com/mlecjm/sc-dcms
