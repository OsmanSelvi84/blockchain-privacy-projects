## Reference Implementation Details
Repository: https://github.com/maethlucky/ABAC-Simulator.git


* **Reference Prototype Design:** Multi-Domain Attribute-Based Access Control (ABAC) Simulator

* **Setup and Study Context:** The reference implementation executes a Python-based ABAC parsing engine (`myabac.py`). It reads external declarative policy constraint frameworks (`.abac` files) and validates real-time contextual transaction vectors (`-requests.txt` files) across healthcare and university schemas. It was heavily analyzed to study granular request-to-policy evaluation mappings.

* **Execution for Comparison:** Navigate to the reference directory and execute the simulation model directly via console using standard Python execution paths:
  ```bash
  python myabac.py university.abac university-requests.txt 
  ```

* **📉 Reference Simulator Production Output (University Schema)**
When executing the reference script, the engine evaluates domain-specific constraints and outputs the following logical state vector:
* csStu1,cs101gradebook,addScore: DENY          -> Role mismatch (Student cannot modify instructor assets)
* csStu1,cs101gradebook,readMyScores: PERMIT    -> Attribute match (Student can read own course data)
* csStu2,cs601gradebook,addScore: DENY          -> Role mismatch (Unauthorized write attempt)
* csStu2,cs602gradebook,addScore: DENY          -> Role mismatch (Unauthorized write attempt)
* csStu3,cs602gradebook,readMyScores: PERMIT    -> Attribute match (Graduate student reads matching course data)

* **🧠 Comparative Architecture Mapping**
original decentralized digital agency implementation successfully transitions and compiles these high-level Python attribute rules (PERMIT / DENY) into unalterable, cryptographically enforced on-chain ledger constraints (GRANT / REVERT) using Solidity, Hardhat, and Keccak-256 secure envelopes.

