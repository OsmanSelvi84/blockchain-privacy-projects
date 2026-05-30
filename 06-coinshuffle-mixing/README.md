# CoinShuffle Mixing Protocol

## Project Description

This project demonstrates a simplified implementation of the CoinShuffle protocol for blockchain privacy.

The main goal is to improve transaction privacy by breaking the direct link between senders and receivers through output address shuffling.

The implementation is written in Python and focuses on the educational demonstration of transaction unlinkability.

---

## Privacy Concept

CoinShuffle improves privacy by collecting output addresses from multiple users and randomly shuffling them.

This process makes it difficult to determine which sender corresponds to which receiver.

---

## Project Structure

```txt
06-coinshuffle-mixing/
│
├── original/
│   ├── coinshuffle.py
│   ├── test_coinshuffle.py
│   └── requirements.txt
│
├── reference/
│   └── README.md
│
├── demo/
│   └── sample_output.txt
│
└── README.md
```

---

## Demo Result

Example output:

```txt
User1 -> wallet_A
User2 -> wallet_B
User3 -> wallet_C
User4 -> wallet_D
User5 -> wallet_E

Shuffled Outputs:
wallet_output_C_private
wallet_output_A_private
wallet_output_E_private
wallet_output_B_private
wallet_output_D_private

Privacy Goal:
Break the direct link between input addresses and output addresses.
```

---
