# CoinShuffle Mixing Protocol

## Goal

Break transaction traceability using coin mixing.

## Requirements

- Implement mixing pool
- Shuffle inputs and outputs
- Prevent linking sender to receiver

## Privacy Concept

Transaction unlinkability.
---

## Project Description

This project is a simple simulation of the CoinShuffle protocol used for blockchain privacy.

The main idea is to collect output addresses from multiple users and randomly shuffle them. By doing this, it becomes difficult to determine which sender belongs to which receiver.

The project was developed in Python for educational purposes and demonstrates the basic concept of transaction unlinkability.

---

## How It Works

1. Users join the mixing process.
2. Each user provides an output address.
3. Output addresses are shuffled randomly.
4. A transaction is created using the shuffled outputs.
5. The direct link between sender and receiver becomes harder to identify.

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

## Requirements

* Python 3.9+
* pytest

Required dependency:

```txt
pytest>=8.0.0
```

---

## Demo Output

Example execution:

```txt
FINAL MIXED TRANSACTION

Slot   Input Address      Output Address      Valid
--------------------------------------------------
0      wallet_input_A     wallet_output_B_private   yes
1      wallet_input_B     wallet_output_E_private   yes
2      wallet_input_C     wallet_output_A_private   yes
3      wallet_input_D     wallet_output_C_private   yes
4      wallet_input_E     wallet_output_D_private   yes

Privacy Goal:
Break the direct link between input addresses and output addresses.
```

Test result:

```txt
7 passed
```
