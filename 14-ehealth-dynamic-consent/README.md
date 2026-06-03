# eHealth Dynamic Consent Smart Contract

## About the Project

This project is a simple smart contract system for managing patient consent in healthcare environments.

The main idea is to let patients control permissions for sharing their medical-related information with healthcare providers. A patient can give consent, update it later, or completely revoke it whenever they want.

The project was developed using Solidity and Hardhat as part of a blockchain privacy assignment.

---

# What the Contract Can Do

The smart contract allows patients to:

* give consent to a healthcare provider,
* update an existing consent,
* revoke consent,
* and check whether a consent is active.

Each consent stores:

* whether it is active,
* the purpose of the consent,
* the type of medical data,
* and the last update timestamp.

The contract does not store actual medical records. Only permission-related information is stored.

---

# Technologies Used

* Solidity
* Hardhat
* TypeScript
* Ethers.js
* Chai

---

# Project Structure

```text id="v1y8mb"
14-ehealth-dynamic-consent/
│
├── contracts/
│   └── DynamicConsent.sol
│
├── test/
│   └── DynamicConsent.ts
│
├── scripts/
│   └── deploy.ts
│
├── hardhat.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

# Installation

Clone the repository:

```bash id="3gn1yi"
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

Enter the repository:

```bash id="r1jvsf"
cd blockchain-privacy-projects
```

Switch to the assigned branch:

```bash id="kcgq7q"
git checkout students/220304119-mena-ghazowan-hamood
```

Open the project folder:

```bash id="5r4g2n"
cd 14-ehealth-dynamic-consent
```

Install dependencies:

```bash id="snr6gh"
npm install
```

---

# Compile the Contract

```bash id="q7e0gx"
npx hardhat compile
```

---

# Run Tests

```bash id="m9m3p2"
npx hardhat test
```

The project includes:

* functional tests,
* validation tests,
* and security-related checks.

Expected result:

```text id="5x2wbn"
10 passing
```

---

# Deploy the Contract

```bash id="svm6ph"
npx hardhat run scripts/deploy.ts
```

Example output:

```text id="7v4g4y"
DynamicConsent deployed to: 0x...
```

---

# Implemented Test Cases

## Main Tests

* giving consent,
* checking consent,
* updating consent,
* revoking consent,
* preventing unauthorized updates.

## Validation Tests

* invalid provider address,
* empty purpose field,
* empty data type field,
* revoking non-existing consent,
* updating inactive consent.

---

# Reference Project

The following project was used as a reference during research:

SC-DCMS
https://github.com/mlecjm/sc-dcms

It was mainly used to understand how blockchain-based dynamic consent systems are structured.

The implementation in this repository was written independently for this assignment.

---

# Notes

This project focuses on the consent management logic itself rather than storing medical records.

Keeping medical data directly on-chain would create privacy and storage problems, so only consent information is stored inside the smart contract.

---

# Future Improvements

Possible future improvements:

* provider roles,
* frontend interface,
* encrypted off-chain storage,
* IPFS integration,
* more advanced privacy mechanisms.

---

# Conclusion

This project demonstrates a simple example of how smart contracts can be used for managing dynamic patient consent in healthcare systems.

