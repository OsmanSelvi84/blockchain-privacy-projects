# 📋 TEST.md

C-ITS Anonymous Attestation – Test Documentation

This document describes the test scenarios for the blockchain-based anonymous attestation system for C-ITS.

The testing approach covers Certification Authority (CA), RSU authorization, credential issuance, anonymous attestation creation, verification, and revocation mechanisms.

---

## ⚙️ Testing Environment

* Remix IDE ([https://remix.ethereum.org](https://remix.ethereum.org))
* Solidity version: ^0.5.16
* JavaScript VM / Injected Web3

---

## 🧠 Test Overview

The system is tested in the following sequence:

1. Certification Authority Deployment
2. Anonymous Attestation Deployment
3. RSU Registration
4. Credential Issuance
5. Attestation Creation
6. Attestation Verification
7. Revocation Handling
8. Security Constraints (Pseudonym, Access Control, Expiry)

---

# 🧪 CORE SYSTEM TESTS

---

## ✅ Test 1: Certification Authority Deployment

**Purpose:**
Verify that the CA contract is deployed correctly.

**Steps:**

* Deploy `CertificationAuthority.sol`
* Call `admin()`

**Expected Result:**

```text
admin = deployer address
```

---

## ✅ Test 2: Anonymous Attestation Deployment

**Purpose:**
Verify CA address is correctly linked.

**Steps:**

* Deploy `AnonymousAttestation.sol` with CA address
* Call `admin()`

**Expected Result:**

```text
admin = deployer address
```

---

## ✅ Test 3: RSU Registration

**Purpose:**
Verify RSU can be registered by admin.

**Steps:**

```solidity
registerRSU(
    RSU_ADDRESS,
    "RSU-1",
    "RSU001",
    "http://rsu1.com",
    [["TrafficService"]]
)
```

**Expected Result:**

```text
RSURegistered event emitted
```

---

## ❌ Test 4: Unauthorized RSU Registration

**Purpose:**
Ensure only admin can register RSUs.

**Steps:**

* Use non-admin account
* Call `registerRSU()`

**Expected Result:**

```text
revert: Only admin
```

---

## ✅ Test 5: RSU Authorization Check

```solidity
isRSUAuthorized(RSU_ADDRESS)
```

**Expected:**

```text
true
```

For invalid RSU:

```text
false
```

---

## ✅ Test 6: Credential Issuance

```solidity
issueAttestationCredential("CRED001")
```

**Expected:**

```text
success
```

Check:

```solidity
isCredentialValid("CRED001") → true
```

---

## ❌ Test 7: Unauthorized Credential Issuance

```solidity
issueAttestationCredential("CRED002")
```

**Expected:**

```text
revert: Not RSU
```

---

## ✅ Test 8: Attestation Creation

```solidity
createAttestation(
 "ATT001",
 "VEH123",
 "CRED001",
 "SIG001",
 "EmergencyAlert",
 "Accident on highway",
 "2026-05-30T12:00:00"
)
```

**Expected:**

```text
AttestationCreated event emitted
```

---

## ❌ Test 9: Invalid Credential

```solidity
createAttestation(... "FAKE001")
```

**Expected:**

```text
revert: Invalid credential
```

---

## ❌ Test 10: Duplicate ID Prevention

```solidity
createAttestation("ATT001", ...)
```

**Expected:**

```text
revert: Already exists
```

---

## ❌ Test 11: Duplicate Pseudonym

```solidity
createAttestation(... "VEH123" again)
```

**Expected:**

```text
revert: Pseudonym used
```

---

## 🔍 Test 12: Attestation Verification

```solidity
verifyAttestation("ATT001")
```

**Expected Output:**

```text
VEH123
EmergencyAlert
RSU-1
RSU001
http://rsu1.com
false
```

---

## 🔁 Test 13: Revocation

```solidity
revokeAttestation("ATT001")
```

**Expected:**

```text
AttestationRevoked event emitted
```

---

## 🔍 Test 14: Verification After Revocation

```solidity
verifyAttestation("ATT001")
```

**Expected:**

```text
revoked = true
```

---

## ⏳ Test 15: Expiry Control

After expiry time passes:

```solidity
verifyAttestation("ATT001")
```

**Expected:**

```text
revert: Expired
```

---

# 📊 Final Coverage Summary

| Feature              | Status |
| -------------------- | ------ |
| CA Deployment        | ✔      |
| RSU Registration     | ✔      |
| Credential Issuance  | ✔      |
| Attestation Creation | ✔      |
| Verification         | ✔      |
| Revocation           | ✔      |
| Pseudonym Protection | ✔      |
| Access Control       | ✔      |
| Expiry Control       | ✔      |

---

# 🎯 Conclusion

This test suite validates a complete C-ITS blockchain-based anonymous attestation system including:

* Certification Authority trust model
* RSU-based authorization
* Credential-based access control
* Anonymous vehicle attestation
* Security constraints (pseudonym, expiry, revocation)

The system demonstrates a secure and privacy-preserving V2X communication model suitable for Cooperative Intelligent Transport Systems (C-ITS).


