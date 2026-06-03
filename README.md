# DID Management System

## Student Information

Branch: students/220304054-suden-bakan

Project: DID Management System

---

## Project Description

This project implements a simple Decentralized Identifier (DID) Management System in Python.

The system supports:

- DID Creation
- DID Update
- DID Revocation
- DID Resolution

The project demonstrates the basic concepts of Self-Sovereign Identity (SSI) and decentralized identity management.

---

## Privacy Concept

Self-Sovereign Identity (SSI)

Users maintain control over their own identifiers without relying on a centralized authority.

---

## Project Structure

```text
10-did-management/
│
├── app.py
├── README.md
├── reference.md
├── test_cases.txt
└── requirements.txt
```

---

## Requirements

- Python 3.x

No external libraries are required.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects
git checkout students/220304054-suden-bakan
cd 10-did-management
```

---

## Running the Project

Execute:

```bash
python app.py
```

---

## Sample Output

```text
DID created
{'data': {'name': 'Suden'}, 'active': True}

DID updated
{'data': {'name': 'Suden Bakan'}, 'active': True}

DID revoked
{'data': {'name': 'Suden Bakan'}, 'active': False}
```

---

## Supported Operations

### Create DID

Creates a new decentralized identifier.

### Update DID

Updates the information associated with a DID.

### Revoke DID

Marks a DID as inactive.

### Resolve DID

Retrieves DID information from the registry.

---

## Testing

Run:

```bash
python app.py
```

The included test cases demonstrate all required DID operations.

---

## Reference Implementation

See reference.md for comparison with an existing DID framework.

---

## Author

Suden Bakan
