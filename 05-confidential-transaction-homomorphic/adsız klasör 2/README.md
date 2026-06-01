# Confidential Transactions (Homomorphic)

## Student
Onur Kart - 210304112

## Project Description
This project implements Confidential Transactions using Pedersen Commitment scheme in Solidity.
Transaction amounts are hidden using homomorphic encryption - balances can be verified without revealing actual amounts.

## Reference Implementation
- Repository: https://github.com/christsim/pedersen-commitments
- Language: Node.js + JavaScript
- Topic: Pedersen Commitments with homomorphic properties

## Requirements
- Browser with internet access
- Remix IDE: https://remix.ethereum.org

## How to Run
1. Go to https://remix.ethereum.org
2. Create new file: ConfidentialTransactions.sol
3. Paste the contract code
4. Compile with Solidity 0.8.0+
5. Deploy using Remix VM (Cancun)

## How to Test
1. Call commit(50, 7) -> returns id=0
2. Call commit(30, 5) -> returns id=1
3. Call commit(20, 2) -> returns id=2
4. Call reveal(0, 50, 7) -> returns true
5. Call verifyTransfer(1, 2, 0) -> returns true (proves 30+20=50 without revealing amounts)

## Privacy Concept
Pedersen Commitment: C = g^amount * h^blinding mod P
- Hiding: amount is never stored on-chain
- Binding: committed value cannot be changed
- Homomorphic: C1 * C2 = C3 proves amount1 + amount2 = amount3