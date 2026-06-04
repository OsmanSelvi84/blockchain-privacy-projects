# 14-ehealth-dynamic-consent

## Project Description

This project is a blockchain-based Dynamic Consent Management System for healthcare environments.

The main idea is to let patients control which healthcare provider can access their medical information. A patient can give consent, update it later, or revoke it completely.

The contract also stores the purpose of access and the type of medical data, such as Blood Test, MRI, or X-Ray.

## Main Features

* Give consent to a healthcare provider
* Update consent purpose and data type
* Revoke consent
* Check if consent is active
* View full consent details
* Record actions through blockchain events

## Technologies Used

* Solidity
* Hardhat
* Ethereum Smart Contracts
* JavaScript

## How to Run the Project

First, open the project folder:

```bash
cd 14-ehealth-dynamic-consent
```

Install dependencies:

```bash
npm install
```

Compile the smart contract:

```bash
npx hardhat compile
```

Run automated tests:

```bash
npx hardhat test
```

Expected result:

```bash
10 passing
```

## Manual Testing with Hardhat Console

Open Hardhat console:

```bash
npx hardhat console
```

### Step 1: Load the smart contract

```js
const DynamicConsent = await ethers.getContractFactory("DynamicConsent")
```

### Step 2: Deploy the contract

```js
const contract = await DynamicConsent.deploy()
```

### Step 3: Get test accounts

```js
const [patient, provider] = await ethers.getSigners()
```

Here:

* `patient` represents the patient account.
* `provider` represents the healthcare provider account.

### Step 4: Give consent

```js
await contract.giveConsent(provider.address, "Treatment", "Blood Test")
```

This means the patient gives the provider permission to access Blood Test data for treatment.

### Step 5: Check if consent is active

```js
await contract.checkConsent(patient.address, provider.address)
```

Expected result:

```js
true
```

### Step 6: Get full consent information

```js
await contract.getConsent(patient.address, provider.address)
```

Expected result includes:

```js
true
"Treatment"
"Blood Test"
timestamp
```

### Step 7: Update consent

```js
await contract.updateConsent(provider.address, "Research", "MRI")
```

This changes the purpose from Treatment to Research and the data type from Blood Test to MRI.

### Step 8: Check updated consent details

```js
await contract.getConsent(patient.address, provider.address)
```

Expected result includes:

```js
true
"Research"
"MRI"
timestamp
```

### Step 9: Revoke consent

```js
await contract.revokeConsent(provider.address)
```

This makes the consent inactive.

### Step 10: Check consent after revocation

```js
await contract.checkConsent(patient.address, provider.address)
```

Expected result:

```js
false
```

To exit the console:

```js
.exit
```

## Smart Contract Functions

### giveConsent(provider, purpose, dataType)

Creates a consent record between the patient and provider.

### updateConsent(provider, newPurpose, newDataType)

Updates an existing active consent.

### revokeConsent(provider)

Revokes an active consent.

### checkConsent(patient, provider)

Returns `true` if the consent is active, otherwise returns `false`.

### getConsent(patient, provider)

Returns the full consent information.

## Events

The contract uses events to keep a record of consent actions:

* `ConsentGiven`
* `ConsentUpdated`
* `ConsentRevoked`

These events help create an audit trail on the blockchain.

## Reference

Reference project:

SC-DCMS Reference Project: https://github.com/mlecjm/sc-dcms

The reference project has a larger healthcare privacy architecture. My project focuses on the dynamic consent management part in a simpler and more practical way.

