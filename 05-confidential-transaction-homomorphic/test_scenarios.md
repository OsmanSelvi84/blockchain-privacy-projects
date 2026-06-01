# Test Scenarios - Confidential Transactions

## How to Run Tests
1. Go to https://remix.ethereum.org
2. Load ConfidentialTransactions.sol
3. Compile with Solidity 0.8.0+
4. Deploy using Remix VM (Cancun)
5. Run each test case below

---

## Test Case 1 - Basic Commit and Reveal
Function: commit(50, 7)
Expected: Returns id=0, green tick in Remix
Function: reveal(0, 50, 7)
Expected: Returns true

## Test Case 2 - Wrong Reveal Should Fail
Function: commit(100, 3)
Expected: Returns id=1
Function: reveal(1, 99, 3)
Expected: Returns false (wrong amount)

## Test Case 3 - Homomorphic Transfer Verification
Function: commit(30, 5) -> id=1
Function: commit(20, 2) -> id=2
Function: commit(50, 7) -> id=0
Function: verifyTransfer(1, 2, 0)
Expected: Returns true (30+20=50 verified