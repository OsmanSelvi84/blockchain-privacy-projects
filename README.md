# CoinShuffle Mixing Protocol

## Project Description

CoinShuffle is a privacy-focused protocol that helps reduce transaction traceability in blockchain systems. Instead of directly linking senders and receivers, multiple participants join a mixing pool and their output addresses are shuffled before transactions are finalized.

This project implements a simplified version of CoinShuffle using Solidity. Participants provide input and output addresses along with a transaction amount. The contract validates the mixing pool, performs the shuffle process, and creates new transaction mappings that make it harder to determine the original sender-receiver relationship.

The main goal of the project is to demonstrate transaction unlinkability and show how privacy can be improved through address mixing techniques in blockchain environments.

---

## Features

* Mixing pool implementation
* Multiple participant support
* Equal denomination validation
* Minimum participant validation
* Output address shuffling
* Transaction generation
* Solidity smart contract implementation

---

## How to Run

### Download the Repository

```bash
git clone -b students/220304027-hasan-yigit-kilinc https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

```bash
cd blockchain-privacy-projects/06-coinshuffle-mixing
```

### Open Remix IDE

https://remix.ethereum.org

### Compile the Contract

1. Create a new file named `CoinShuffle.sol`
2. Copy the contract code into the file
3. Open the Solidity Compiler tab
4. Select Solidity version `0.8.20`
5. Click **Compile CoinShuffle.sol**

### Deploy the Contract

1. Open **Deploy & Run Transactions**
2. Select **Remix VM**
3. Click **Deploy**

### Demo Steps

Add at least 3 participants using:

```text
User1
0x1111111111111111111111111111111111111111
0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
1
```

```text
User2
0x2222222222222222222222222222222222222222
0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB
1
```

```text
User3
0x3333333333333333333333333333333333333333
0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
1
```

Run:

```text
createShuffleTransaction()
```

Check results:

```text
getTransactionDetails(0)
getTransactionDetails(1)
getTransactionDetails(2)
```

Expected result:

```text
changed = true
valid = true
```

---

## Example Result

Before shuffle:

```text
User1 → OutputA
User2 → OutputB
User3 → OutputC
```

After shuffle:

```text
User1 → OutputC
User2 → OutputA
User3 → OutputB
```

This makes it difficult to determine which output address originally belonged to which participant.

---

## Reference

Reference implementation used for comparison:

coinshuffle_reference.py

https://github.com/atong01/coinshuffle
