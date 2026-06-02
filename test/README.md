# Comprehensive Testing & Evaluation Guide

This document provides step-by-step instructions for the instructor to independently test and execute both the **Original Implementation** and the **Academic Reference Implementation** under identical functional scenarios.

---

## 🛠️ Test Setup Parameters (Identical for Both)
To execute the tests, please use two different accounts from the Remix Account dropdown:
* **Account 1 (Data Subject / User):** `0x5B38Da6a701c568545dCfcB03FcB875f56beddC4`
* **Account 2 (Data Controller / Hospital):** `0xAb843b970116094144312657371d7Eba11513040`

### 📥 Exact Deploy Input Parameters:
When clicking Deploy, paste the following parameters directly into the deployment fields:
* `_dataController`: `0xAb843b970116094144312657371d7Eba11513040` (Account 2)
* `_recipients`: `["0xAb843b970116094144312657371d7Eba11513040"]`
* `_data`: `12345`
* `duration`: `86400`
* `_defaultPurposes`: `[1, 2]`

---

## 🧪 Scenario A: Testing the Original Implementation (Solidity 0.8.20)

1. Select `CollectionConsent.sol` and compile using version **0.8.20**.
2. Switch to **Account 1** and click **Deploy** with the parameters above.
3. **State 1 (Initial Verification):** Click `verify()`. Output will be **`false`** (Controller signature is missing).
4. **State 2 (Granting Consent):** Switch to **Account 2** (Controller). Click `grantConsent()`.
5. **State 3 (Active State):** Switch back to **Account 1**. Click `verify()`. Output will now be **`true`**.
6. **State 4 (Right to be Forgotten):** Click `eraseData()`. The operational flags will update.
7. **State 5 (Revocation):** Click `revokeConsent()`. Click `verify()` again. Output will return to **`false`**.

---

## 🧪 Scenario B: Testing the Reference Implementation (Solidity 0.6.12)

1. Select `CollectionConsent_Ref.sol` and compile using version **0.6.12** (Ensure SPDX warning is ignored or resolved).
2. Switch to **Account 1** and click **Deploy** using the exact same parameters.
3. **State 1 (Initial Verification):** Under Deployed Contracts, expand the instance and click `verify()`. Output will be **`false`**.
4. **State 2 (Granting Consent):** Switch to **Account 2** (Controller). Click `grantConsent()`.
5. **State 3 (Active State):** Switch back to **Account 1**. Click `verify()`. Output will match and return **`true`**.
6. **State 4 & 5 (Data Subject Control):** Click `eraseData()` or `revokeConsent()`. Click `verify()`. Output cleanly resets to **`false`**.

---

## 🎯 Functional Equivalence Verdict
Both smart contracts respond identically to the same state changes and actor signatures, completely satisfying .
