# CoinShuffle Mixing Protocol

## Project Description

This project demonstrates a simplified implementation of the CoinShuffle protocol for blockchain privacy.

The main goal is to improve transaction privacy by breaking the direct link between senders and receivers through output address shuffling.

The implementation is written in Python and focuses on the educational demonstration of transaction unlinkability.

---

## Privacy Concept

CoinShuffle improves privacy by collecting output addresses from multiple users and randomly shuffling them.

This process makes it difficult to determine which sender corresponds to which receiver.

Privacy properties provided by the project:

* Transaction Unlinkability
* Sender-Receiver Privacy
* Output Address Mixing

---

## Features

* Simulates CoinShuffle participant registration
* Collects output addresses from users
* Randomly shuffles outputs
* Demonstrates transaction unlinkability
* Includes automated unit tests
* Provides sample execution output

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

## Sample Output

A sample execution output is provided in:

```txt
demo/sample_output.txt
```

The output demonstrates participant registration, shuffled output addresses, and the privacy-preserving mixing process.

---

## Reference vs Original Comparison

The reference implementation demonstrates a CoinShuffle-style approach with additional protocol details.

The original implementation developed for this project focuses on the core privacy mechanism of output shuffling and transaction unlinkability.

Compared to the reference implementation, this project is intentionally simplified for educational purposes while preserving the fundamental privacy concept.

---