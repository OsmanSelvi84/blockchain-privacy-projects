# Reference Implementation

## Selected Reference Implementation

reference/reference_demo.js

## Why This Reference Was Selected

The original Solidity implementation generates commitment hashes using:

```solidity
keccak256(
    abi.encodePacked(
        receiver,
        amount,
        secret
    )
)
```

The reference implementation uses the equivalent Ethers.js function:

```javascript
ethers.solidityPackedKeccak256(
  ["address", "uint256", "string"],
  [receiver, amount, secret]
)
```

Both implementations use the same inputs and produce identical commitment hashes.

This makes the reference implementation suitable for direct comparison during evaluation.

---

## Technologies Used

- Node.js
- JavaScript
- Ethers.js

---

## Reference Implementation Purpose

The purpose of the reference implementation is to generate commitment hashes off-chain using the same logic as the Solidity smart contract.

This allows verification that the original implementation behaves correctly.

---

## Comparison With My Project

### Reference Implementation

- JavaScript based
- Uses Ethers.js
- Generates commitment hashes
- Executes 5 comparison test cases

### Original Implementation

- Solidity based
- Uses Hardhat
- Generates commitment hashes
- Executes the same 5 comparison test cases

Both implementations generate identical outputs.

---

## Running the Reference Implementation

Install dependencies:

```bash
npm install
```

Run:

```bash
node reference/reference_demo.js
```

Expected Result:

```text
TEST 1
Commitment: 0x16d8eeb6913f20c1db9b2a0a3796b577659c79bf39d2ffba1ee598e808d17dd4

TEST 2
Commitment: 0xf7a60bda82ba8671534d6ecdeb0586380288f0ebbe1eb9b453d289102351bc6b

TEST 3
Commitment: 0xb1e438b0531f0a57e0da643ddbee8c8aefb42a2f5855fec4c59d14ec0334fff4

TEST 4
Commitment: 0x5a041850fddea7f427258bf88121c623b793570bb10b0ce2ec87ae2e4891e699

TEST 5
Commitment: 0x490e6db72ffb2582a39b995e0bbfae31891eab95c78c5c93e40585221150f2de
```
