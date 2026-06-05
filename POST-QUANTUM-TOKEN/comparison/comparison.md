# Reference vs Original Implementation Comparison

This project was compared with a runnable reference implementation to verify that both implementations generate the same commitment hashes.

---

# Reference Implementation

Reference file:

```text
reference/reference_demo.js
```

Technologies:

- Node.js
- Ethers.js

The reference implementation generates commitment hashes using:

```javascript
ethers.solidityPackedKeccak256(
  ["address", "uint256", "string"],
  [receiver, amount, secret]
)
```

---

# Studied External Reference

Project:

```text
DDMixer
```

Repository:

```text
https://github.com/alibertay/DDMixer
```

DDMixer was studied to learn blockchain privacy concepts and mixer-based transaction privacy.

---

# Original Implementation

Original file:

```text
contracts/PrivacyToken.sol
```

The project generates commitment hashes using:

```solidity
keccak256(
    abi.encodePacked(
        receiver,
        amount,
        secret
    )
)
```

---

# Comparison Method

Both implementations use the same inputs:

- receiver
- amount
- secret

Reference implementation:

```bash
node reference/reference_demo.js
```

Original implementation:

```bash
npx hardhat run scripts/demo.js
```

Five test cases are executed and the outputs are compared.

---

# Result

All five test cases generate identical commitment hashes.

```text
Reference Implementation Output
=
Original Implementation Output
```

This confirms that both implementations behave equivalently for the tested scenarios.
