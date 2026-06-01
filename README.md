# CoinShuffle Mixing 

## Goal

Break transaction traceability using coin mixing.

## Requirements

* Implement a mixing pool simulation
* Shuffle input and output addresses
* Prevent linking sender to receiver
* Demonstrate transaction unlinkability

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
Shuffled Outputs:

wallet_output_C_private
wallet_output_A_private
wallet_output_B_private
wallet_output_D_private
wallet_output_E_private

Privacy Goal:
Break the direct link between input addresses and output addresses.
```

Test result:

```txt
5 passed
```
