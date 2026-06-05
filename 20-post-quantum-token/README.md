# 20-post-quantum-token

**Student:** Amirarsalan Pajouhi  
**ID:** 220304109  
**Branch:** `students/220304109-amir-arsalan-pajouh`  
**Topic:** Post-Quantum Token (Topic 20)

---

## What This Is

A mini blockchain where transactions are signed with **CRYSTALS-Dilithium** instead of ECDSA.  
Dilithium is quantum-resistant — standardized by NIST as FIPS 204 (2024).  
Classical ECDSA can be broken by quantum computers using Shor's algorithm. Dilithium cannot.

---

## Structure

```
20-post-quantum-token/
├── original/
│   └── pq_token.py           # Original implementation
├── reference/
│   └── reference_pq_token.py # Reference implementation
├── compare.py                 # Runs both and compares
├── requirements.txt
└── README.md
```

---

## Setup

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304109-amir-arsalan-pajouh
cd 20-post-quantum-token
pip install -r requirements.txt
```

---

## Run Original

```bash
python3 original/pq_token.py
```

With custom inputs (0=Alice, 1=Bob, 2=Carol):
```bash
python3 original/pq_token.py 0 1 50  1 2 30  2 0 20
```

---

## Run Reference

```bash
python3 reference/reference_pq_token.py
```

Reference source: https://github.com/SnowVelda/pqc-dilithium-poc

---

## Run Comparison (Both Together)

```bash
python3 compare.py
```

With custom inputs:
```bash
python3 compare.py 0 1 50  1 2 30  2 0 20  0 2 10  1 0 15
```

Expected output:
```
  Alice balance   orig=475  ref=475.0  ✓ MATCH
  Bob balance     orig=305  ref=305.0  ✓ MATCH
  Carol balance   orig=220  ref=220.0  ✓ MATCH
  Chain valid     orig=True ref=True   ✓ MATCH
  Blocks          orig=2    ref=2      ✓ MATCH
  Key size        orig=1312 ref=1312   ✓ MATCH
  Sig size        orig=2420 ref=2420   ✓ MATCH
  ALL MATCH ✓
```

---

## Starting Balances

| Wallet | Start | After 5 txs |
|--------|-------|-------------|
| Alice  | 500   | 475         |
| Bob    | 300   | 305         |
| Carol  | 200   | 220         |

---

## Key Facts

| Property | Value |
|----------|-------|
| Algorithm | CRYSTALS-Dilithium2 (NIST FIPS 204) |
| Security | 128-bit post-quantum |
| Public key | 1312 bytes |
| Signature | 2420 bytes |
| ECDSA pubkey (old) | 33 bytes |
| ECDSA sig (old) | 64 bytes |
