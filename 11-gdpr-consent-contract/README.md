# Topic 11: GDPR Consent Contract (Blockchain Privacy Project)

This repository contains both the **Reference Implementation** and the **Original Enhanced Implementation** for the GDPR Privacy-Preserving Consent Contract on Ethereum. 

Both implementations have been modernized and structurally aligned to run seamlessly under a single compiler version, ensuring identical input/output behaviors for the evaluation.

---

## 📋 Project Structure
Inside this folder, the smart contracts are structured as follows:
* `CollectionConsent_Ref.sol` -> Reference Main Contract
* `ProcessingConsent_Ref.sol` -> Reference Sub-Contract
* `CollectionConsent.sol` -> Original Enhanced Main Contract
* `ProcessingConsent.sol` -> Original Enhanced Sub-Contract

---

## 🛠️ Environment & Setup Instructions

To avoid local OS dependency issues and guarantee a successful dry run, the official **Remix IDE** is utilized for execution and testing.

1. Open your browser and navigate to [remix.ethereum.org](https://remix.ethereum.org).
2. Upload all 4 smart contract files into your workspace directory (e.g., `contracts/`).
3. Navigate to the **Solidity Compiler** tab on the left sidebar.
4. Select Compiler Version: **`0.8.20`** (or any `0.8.x` stable release).
5. Click **Compile CollectionConsent.sol** and **Compile CollectionConsent_Ref.sol**. Ensure the green checkmark appears.

---

## 🚀 Step-by-Step Test Execution Scenario (Instructor Guidelines)

The instructor will evaluate the functional equivalence using 5 distinct test scenarios. Follow these exact steps to reproduce the required outputs for both implementations:

### Phase 1: Deployment (Initialization)
1. Go to the **Deploy & Run Transactions** tab. Set Environment to `Remix VM (Cancun)`.
2. **Account 1 (`0x5B3...`)** acts as the **Data Subject (User)**.
3. **Account 2 (`0xAb8...`)** acts as the **Data Controller (Hospital/Company)**. Copy this address.
4. Switch back to **Account 1** to deploy.
5. Select `CollectionConsent` (or `CollectionConsent_Ref`) from the Contract dropdown.
6. Click the dropdown arrow next to **Deploy** and enter the following deployment parameters:
   * `_dataController`: `0xAb823b970114094144312657371d7Eba11513040` (Account 2 Address)
   * `_recipients`: `["0xAb823b970114094144312657371d7Eba11513040"]`
   * `_data`: `12345`
   * `duration`: `86400`
   * `_defaultPurposes`: `[1, 2]`
7. Click **Deploy**.

---

### 🎯 Evaluation Test Cases (50 Points)

#### Test Case 1: Initial Consent Verification (Logic Equivalence)
* **Action:** Expand the deployed contract instance and click the blue **`verify`** button using **Account 1**.
* **Expected Output (Ref & Original):** `bool: false`
* **Reasoning:** The user initialized the contract, but the Data Controller has not signed/approved yet.

#### Test Case 2: Granting Controller Consent (State Transition)
* **Action:** Switch the active account to **Account 2 (`0xAb8...`)**. Click the orange **`grantConsent`** button.
* **Expected Output (Ref & Original):** Transaction succeeds (Green checkmark in terminal).

#### Test Case 3: Post-Approval Active Verification
* **Action:** Switch back to **Account 1 (`0x5B3...`)**. Click the blue **`verify`** button again.
* **Expected Output (Ref & Original):** `bool: true`
* **Reasoning:** Both parties have now authorized the data processing agreement.

#### Test Case 4: Data Erasure Request (Right to be Forgotten)
* **Action:** Using **Account 1**, click the orange **`eraseData`** button.
* **Expected Output (Ref & Original):** Transaction executes successfully, triggering privacy state modifications.

#### Test Case 5: Verification of Revocation Flow
* **Action:** Using **Account 1**, click the orange **`revokeConsent`** button to withdraw permissions. Then click **`verify`**.
* **Expected Output (Ref & Original):** `bool: false`
