# Social Recovery Wallet

This project is a Solidity implementation of a guardian-based social recovery 
wallet system. It is based on the private-key recovery problem defined in 
Section III-B of Bernal Bernabe et al. (2019), *Privacy-Preserving Solutions 
for Blockchain: Review and Challenges*, IEEE Access, and draws from the 
consensus-based recovery mechanism of uPort [20].

---

## Branch Information

Student branch: `students/220304016-begum-gunaydin`

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304016-begum-gunaydin
```

---

## Required Software

| Tool | Version | Purpose |
|---|---|---|
| Foundry (forge) | latest | build & test |
| Git | any | clone repo |

---

## Installation

Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
```

Install dependencies:

```bash
forge install
```

---

## Build

```bash
forge build
```

Expected output:
Compiler run successful!

---

## Run Tests

```bash
forge test -v
```
<img width="748" height="161" alt="image" src="https://github.com/user-attachments/assets/04d271a4-1c35-439c-b929-6c9bf687ae35" />

Expected output:
[PASS] test_owner()
[PASS] test_start_recovery()
[PASS] test_change_owner()
[PASS] test_cancel_recovery()
[PASS] test_non_guardian()
[PASS] test_double_vote()
6 tests passed, 0 failed

---

## Project Structure
src/SocialRecoveryWallet.sol   → main contract
test/WalletTest.t.sol          → 6 test scenarios
foundry.toml                   → foundry config

---

## How It Works

1. Contract is deployed with 3 guardian addresses
2. Any guardian calls `start_recovery(newOwner)` to initiate recovery
3. A second guardian calls `cast_vote()` to approve
4. When 2 votes are reached, owner is automatically changed
5. If the owner still has access, they can call `cancel_recovery()`

---

## Sample Inputs / Outputs

**Deploy:**
guardians: [0xABC..., 0xDEF..., 0x123...]
owner: 0xORIGINAL...

**start_recovery(0xNEW...):**
recovery_cond → true
candidate_owner → 0xNEW...
vote_count → 1

**cast_vote() by second guardian:**
vote_count → 2
owner → 0xNEW...
recovery_cond → false

**cancel_recovery() by owner:**
recovery_cond → false
candidate_owner → 0x000...
vote_count → 0

---

## Test Scenarios

| Test | Description |
|---|---|
| test_owner | Checks owner is set correctly after deploy |
| test_start_recovery | Guardian starts recovery successfully |
| test_change_owner | Owner changes after 2 guardian votes |
| test_cancel_recovery | Owner cancels an active recovery |
| test_non_guardian | Non-guardian cannot start recovery |
| test_double_vote | Same guardian cannot vote twice |

---

## Reference Implementation

This project was developed by studying the following reference implementation:

**Repository:** https://github.com/verumlotus/social-recovery-wallet

**Setup instructions for reference project:**

```bash
git clone https://github.com/verumlotus/social-recovery-wallet.git
cd social-recovery-wallet
forge install
mkdir -p src/test/utils
touch src/test/utils/console.sol
```

After you should write into `src/test/utils/console.sol` file :

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
library console {
    function log(string memory) internal pure {}
    function log(uint256) internal pure {}
    function log(address) internal pure {}
    function log(bool) internal pure {}
}
```

after execute:

```bash
forge build
forge test -v
```
**Expected output after `forge test -v`:**

<img width="726" height="214" alt="image" src="https://github.com/user-attachments/assets/5cd1caf0-1873-48f0-9a37-3d10dc4bc98d" />

**Dependencies:**
- Foundry (forge)
- Solmate (installed via `forge install transmissions11/solmate`)
- Node.js + Yarn (for package.json dependencies)

**Comparison notes:**

| Feature | Reference (verumlotus) | This Project |
|---|---|---|
| Guardian identity | Hashed (keccak256), hidden until recovery | Hashed (keccak256), hidden until recovery |
| Guardian count | Dynamic, set at deploy | Fixed at 3 |
| Threshold | Dynamic, set at deploy | Fixed at 2 |
| Guardian removal | 3-day time delay required | Not implemented |
| Guardian transfer | Guardian can transfer to new guardian | Not implemented |
| Recovery round tracking | Yes, currRecoveryRound counter | Not implemented |
| Recovery cancellation | Owner can cancel | Owner can cancel ✅ |
| External transactions | executeExternalTx() with reentrancy guard | send_money() without reentrancy guard |
| ERC721/ERC1155 support | Yes, receiver standards implemented | Not implemented |
| Dependencies | Solmate (ReentrancyGuard, ERC interfaces) | None, pure Solidity |
| Guardian reveal | Guardian can optionally reveal identity | Not implemented |

**Advantages over reference implementation:**

- **No external dependencies:** Pure Solidity implementation without Solmate 
  or any external library, making it easier to audit and deploy.

- **Recovery cancellation:** Owner can cancel an active recovery process via 
  `cancel_recovery()`. The reference implementation also has this feature, 
  but this project's implementation resets all votes and recovery state 
  completely via `_clear_recovery()`, ensuring a clean slate for future 
  recovery attempts.

- **Simplified deployment:** Fixed guardian count and threshold removes the 
  risk of misconfiguration at deploy time. No need to calculate threshold 
  values or manage dynamic guardian arrays.

- **Automatic execution:** When the second guardian calls `cast_vote()`, 
  ownership transfers automatically without requiring a separate 
  `executeRecovery()` call. This reduces the number of transactions needed 
  and lowers gas costs.

- **Cleaner codebase:** Focused solely on the core recovery mechanism defined 
  in Bernal Bernabe et al. (2019) Section III-B, without ERC721/ERC1155 
  receiver standards or guardian transfer logic that are outside the scope 
  of the academic paper.



## Academic Reference

This project is based on:

> Bernal Bernabe et al. (2019), *Privacy-Preserving Solutions for Blockchain: 
> Review and Challenges*, IEEE Access.
> Section III-B: Private-Keys Management and Recovery
> uPort [20]: consensus-based recovery mechanism

| Paper Concept | Code Implementation |
|---|---|
| Threshold cryptography | `MIN_APPROVALS = 2` |
| Consensus mechanism | `cast_vote()` |
| Private key recovery | `start_recovery()` |
| Guardian-based trust | `isguardian` mapping |
