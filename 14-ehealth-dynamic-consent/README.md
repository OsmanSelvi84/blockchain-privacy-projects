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



Clone the Repository
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
Enter the Repository Folder
cd blockchain-privacy-projects
Switch to the Student Branch
git checkout students/220304119-mena-ghazowan-hamood

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


## Reference Implementations

During the project, I checked two different reference implementations.

I used one reference for understanding the healthcare dynamic consent architecture, and another reference as a runnable smart contract access-control example.

---

### 1. Healthcare Dynamic Consent Reference

Reference repository:

```text
https://github.com/mlecjm/sc-dcms
```

# SC-DCMS Reference Implementation Manual

## 1. Project Description

This project is the reference implementation for a Smart Contract-based Dynamic Consent Management System. It contains three Solidity smart contracts:

* `UserProfileMgr.sol`: Manages user profiles and user roles.
* `PersonalDataMgr.sol`: Manages personal dataset metadata.
* `ConsentMgr.sol`: Manages consent requests, consent agreements, and consent validity.

The purpose of using this reference implementation is to compare its behavior with my own implementation during evaluation.

## 2. Environment

The project was tested locally on macOS using:

* Node.js / npm
* Hardhat
* Solidity compiler version 0.7.6

## 3. Installation Steps

First, clone the repository:

```bash
git clone https://github.com/mlecjm/sc-dcms.git
cd sc-dcms
```

Initialize npm:

```bash
npm init -y
```

Install Hardhat and the Hardhat toolbox compatible with Hardhat 2:

```bash
npm install --save-dev hardhat@2.22.19
npm install --save-dev @nomicfoundation/hardhat-toolbox@hh2
```

## 4. Hardhat Configuration

Create a `hardhat.config.js` file:

```bash
touch hardhat.config.js
```

Add the following configuration:

```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
```

## 5. Required Code Fixes

Because the reference implementation is written in an older Solidity style, two small compatibility fixes were required.

### Fix 1: Missing owner variable in `PersonalDataMgr.sol`

Inside `PersonalDataMgr.sol`, the contract uses `owner`, but the variable was not declared. The following code was added near the beginning of the contract:

```solidity
address public owner;

constructor() {
    owner = msg.sender;
}
```

### Fix 2: Replace deprecated `now`

In `ConsentMgr.sol`, the deprecated keyword `now` was replaced with:

```solidity
block.timestamp
```

Original:

```solidity
if(now >= ConsentAgreements[_agrNum].endDateTime){
```

Updated:

```solidity
if(block.timestamp >= ConsentAgreements[_agrNum].endDateTime){
```

## 6. Compile the Contracts

To compile the contracts:

```bash
npx hardhat compile
```

Expected result:

```bash
Compiled 3 Solidity files successfully
```

## 7. Run the Tests

A test file was created under:

```bash
test/scdcms-test.js
```

The tests check the main behavior of the reference implementation:

* Deploying `UserProfileMgr`
* Creating a user profile
* Deploying `PersonalDataMgr`
* Adding a dataset
* Deploying `ConsentAgreementMgr`
* Creating a consent request
* Creating a consent agreement
* Checking whether the consent agreement is valid

Run the tests using:

```bash
npx hardhat test
```

Expected output:

```bash
SC-DCMS Reference Contracts
  ✔ should deploy UserProfileMgr and create a user profile
  ✔ should deploy PersonalDataMgr and add a dataset
  ✔ should deploy ConsentAgreementMgr and create consent request/agreement

3 passing
```

## 8. Conclusion

The reference implementation was successfully compiled and tested locally using Hardhat. The main smart contract functions are runnable and can be used for comparison with my own implementation during evaluation.


### 2. Runnable Access Control Reference

Reference repository:

```text
https://github.com/OpenZeppelin/openzeppelin-contracts
```

Since the healthcare dynamic consent reference could not be compiled without modifying its source code, I also used OpenZeppelin AccessControl as a runnable smart contract reference.

This reference is not healthcare-specific, but it is related to the core blockchain mechanism used in my project: permission and access control.

My project controls whether a healthcare provider has permission to access a patient's medical data. OpenZeppelin AccessControl also focuses on permission checking, granting, revoking, and validating access.

#### How to run the runnable reference

```bash
cd ~/Desktop
rm -rf reference-access-control
git clone https://github.com/OpenZeppelin/openzeppelin-contracts.git reference-access-control
cd reference-access-control
npm install
npm test -- --grep "AccessControl"
```

Expected result:

```text
181 passing
```

This confirms that the runnable reference project can be installed and tested successfully.

#### Why this reference is useful

OpenZeppelin AccessControl helped me understand how access permissions are tested in smart contracts.

The tested features include:

* checking whether an account has permission
* granting permission
* revoking permission
* rejecting unauthorized users
* testing invalid access attempts

These ideas are similar to my project because my contract checks whether a healthcare provider has active consent from a patient.

---

### Reference Comparison Summary

| Part      | Healthcare Dynamic Consent Reference | Runnable Access Control Reference     | My Project                       |
| --------- | ------------------------------------ | ------------------------------------- | -------------------------------- |
| Topic     | Healthcare consent system            | Smart contract access control         | Healthcare dynamic consent       |
| Runnable  | Not without modifying source code    | Yes                                   | Yes                              |
| Main idea | Consent requests and agreements      | Grant/revoke/check permissions        | Give/update/revoke/check consent |
| Used for  | Architecture understanding           | Runnable comparison and testing style | Final implementation             |

My final implementation was developed independently. The references were only used for understanding system design, permission management, and testing structure.

