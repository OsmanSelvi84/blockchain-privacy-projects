# CoinShuffle Mixing Protocol

## Goal

Break transaction traceability using coin mixing.

---

## Requirements

* Implement a mixing pool
* Shuffle inputs and outputs
* Prevent linking sender to receiver

---

## Privacy Concept

Transaction unlinkability.

CoinShuffle improves privacy by collecting output addresses from multiple participants and randomly shuffling them before creating the final transaction.

This makes it difficult to determine which sender belongs to which receiver.

---

## Project Description

This project is a simplified implementation of the CoinShuffle protocol written in Python.

Participants join a mixing pool, their output addresses are collected, shuffled, and then used to create a mixed transaction.

The project demonstrates the core privacy idea of CoinShuffle without implementing a full blockchain network.

---

## Project Structure

```text
06-coinshuffle-mixing/
│
├── original/
│   ├── coinshuffle.py
│   ├── test_coinshuffle.py
│   └── requirements.txt
│
├── demo/
│   └── sample_output.txt
│
├── reference/
│   └── README.md
│
└── README.md
```

---

## Features

* MixingPool implementation
* Multiple participant support
* Output shuffling
* Equal denomination validation
* Minimum participant validation
* Transaction creation
* Automated tests

---

## Requirements

The project was developed and tested using:

* Python 3.9+
* pytest

Install pytest if needed:

```bash
pip3 install pytest
```

---

## Run
# 1. Download the Repository

```bash
git clone -b students/220304027-hasan-yigit-kilinc https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
```

# 2. Enter the Project Folder

```bash
cd blockchain-privacy-projects/06-coinshuffle-mixing
```

# 3. Install pytest

```bash
pip3 install pytest
```

# 4. Run the CoinShuffle Simulation

```bash
python3 original/coinshuffle.py
```

# 5. Run the Tests

```bash
python3 -m pytest original/test_coinshuffle.py
```

Expected result:

```text
7 passed
```


---

## Example Output

```text
============================================================
FINAL MIXED TRANSACTION
============================================================

Slot  Input Address       Output Address              Valid
-----------------------------------------------------------
0     wallet_input_A      wallet_output_B_private     yes
1     wallet_input_B      wallet_output_E_private     yes
2     wallet_input_C      wallet_output_C_private     yes
3     wallet_input_D      wallet_output_D_private     yes
4     wallet_input_E      wallet_output_A_private     yes

Privacy Goal:
Break the direct link between input addresses and output addresses.
```

Note:

The output order changes because the addresses are shuffled randomly during each execution.

---

## Testing

The project includes automated tests for:

* MixingPool validation
* Minimum participant validation
* Equal denomination validation
* Output preservation after shuffle
* Transaction generation

Run:

```bash
python3 -m pytest original/test_coinshuffle.py
```

Expected result:

```text
7 passed
```

---

## Reference

This project was inspired by the CoinShuffle implementation created by Alexander Tong.

Reference repository:

https://github.com/atong01/coinshuffle
