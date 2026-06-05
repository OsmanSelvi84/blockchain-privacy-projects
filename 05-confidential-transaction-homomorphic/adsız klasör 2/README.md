# Confidential Transactions (Homomorphic)

## Student
Onur Kart - 210304112

## Project Description
This project implements Confidential Transactions using Pedersen Commitment scheme in Solidity.
Transaction amounts are hidden using homomorphic encryption - balances can be verified without revealing actual amounts.

## Reference Implementation

Repository: https://github.com/christsim/pedersen-commitments

### How to Run Reference

Step 1 - Install Node.js from https://nodejs.org (download LTS version)

Step 2 - Open Terminal and run:
git clone https://github.com/christsim/pedersen-commitments
cd pedersen-commitments
npm install

Step 3 - Run tests:
node -e "const p=require('./src/pedersen');const EC=require('elliptic').ec;const ec=new EC('secp256k1');var H=p.generateH();var r1=p.generateRandom();var C1=p.commitTo(H,r1,50);console.log('Test1:',p.verify(H,C1,r1,50));var r2=p.generateRandom();var C2=p.commitTo(H,r2,100);console.log('Test2:',p.verify(H,C2,r2,100));console.log('Test3:',p.verify(H,C1,r1,99));var ra=p.generateRandom();var rb=p.generateRandom();var Ca=p.commitTo(H,ra,30);var Cb=p.commitTo(H,rb,20);var Cc=p.add(Ca,Cb);var rc=ra.add(rb).umod(ec.n);console.log('Test4:',p.verify(H,Cc,rc,50));var rd=p.generateRandom();var re=p.generateRandom();var Cd=p.commitTo(H,rd,70);var Ce=p.commitTo(H,re,30);var Cf=p.add(Cd,Ce);var rf=rd.add(re).umod(ec.n);console.log('Test5:',p.verify(H,Cf,rf,100));"

Expected Output:
Test1: true
Test2: true
Test3: false
Test4: true
Test5: true

## Original Implementation (Solidity)

### Requirements
- Browser only, no installation needed

### How to Run
1. Go to https://remix.ethereum.org
2. Create new file: ConfidentialTransactions.sol
3. Copy paste the code from ConfidentialTransactions.sol in this repo
4. Click Compile
5. Click Deploy

### Test Cases
Test 1 - commit(50, 7) then reveal(0, 50, 7) - Expected: true
Test 2 - commit(100, 3) then reveal(1, 100, 3) - Expected: true
Test 3 - reveal(1, 99, 3) wrong amount - Expected: false
Test 4 - commit(30,5) commit(20,2) commit(50,7) then verifyTransfer(1,2,0) - Expected: true
Test 5 - commit(70,9) commit(30,6) commit(100,3) then verifyTransfer(3,4,5) - Expected: true

## Privacy Concept
Pedersen Commitment: C = g^amount * h^blinding mod P
- Hiding: amount is never stored on-chain
- Binding: committed value cannot be changed
- Homomorphic: C1 * C2 = C3 proves amount1 + amount2 = amount3
- 
