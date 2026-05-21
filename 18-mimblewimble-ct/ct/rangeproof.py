"""
Bit-commitment range proof: prove 0 <= v < 2^N without revealing v.

Pedersen commitments are additively homomorphic, so a maliciously crafted
negative amount could inflate value (commit to -5 and +100, "balance" with
+95, gain 5 from nothing). A range proof rules this out by showing each
committed amount lies in [0, 2^N).

CONSTRUCTION (classical, pre-Bulletproofs)
Given C(v, r) = v*H + r*G with v an N-bit integer (N = 64 typical):

1. Write v in binary:  v = Σ_{i=0..N-1}  b_i * 2^i   where each b_i ∈ {0, 1}.

2. Commit to each bit:  C_i = b_i*H + r_i*G   for i = 0..N-1.

3. Pick r_i so they weight-sum to r:
       Σ_{i=0..N-1}  2^i * r_i  ≡  r   (mod ORDER)
   Pick r_0 ... r_{N-2} freely; solve for r_{N-1}. Then
       Σ 2^i * C_i = (Σ 2^i b_i)*H + (Σ 2^i r_i)*G = v*H + r*G = C.

4. For each C_i, run a Σ-protocol OR-proof showing b_i ∈ {0, 1}:
       Prove:  "I know x such that C_i = x*G"          (case b_i = 0)
          OR  "I know x such that C_i - H = x*G"       (case b_i = 1)

   Fiat-Shamir OR-proof structure (Cramer-Damgård-Schoenmakers):
       Let A_0 = C_i,  A_1 = C_i - H,  j = b_i  (the true branch).
       Pick witness k random scalar (for true branch).
       Pick e_{1-j}, s_{1-j} random (simulated false branch).
       T_j      = k*G
       T_{1-j}  = s_{1-j}*G - e_{1-j}*A_{1-j}
       e   = sha256(C_i || T_0 || T_1) mod ORDER
       e_j = (e - e_{1-j}) mod ORDER
       s_j = (k + e_j * r_i) mod ORDER
       Output (e_0, e_1, s_0, s_1).

   Verifier:
       T_0 = s_0*G - e_0*A_0
       T_1 = s_1*G - e_1*A_1
       Check  e_0 + e_1 ≡ sha256(C_i || T_0 || T_1)  (mod ORDER).

VERIFICATION OF FULL RANGE PROOF
- For each i, OR-proof verifies on C_i  (proves b_i ∈ {0, 1}).
- Σ 2^i C_i  ==  C   (proves the bits compose to the committed value).

Together these prove C commits to some v ∈ [0, 2^N) without revealing v.
"""

import hashlib
import secrets
from dataclasses import dataclass
from ecdsa.ellipticcurve import PointJacobi
from ct.curve import G, H, ORDER


@dataclass
class RangeProof:
    bit_commitments: list[PointJacobi]
    or_proofs: list[tuple[int, int, int, int]]  # (e_0, e_1, s_0, s_1) per bit
    n_bits: int


def _or_prove_bit(bit: int, blinding: int, commitment: PointJacobi) -> tuple[int, int, int, int]:
    """OR-proof that `commitment` opens to 0 or 1 under `blinding`."""
    raise NotImplementedError


def _or_verify_bit(commitment: PointJacobi, proof: tuple[int, int, int, int]) -> bool:
    """Verify a single bit's OR-proof."""
    raise NotImplementedError


def prove(value: int, blinding: int, n_bits: int = 64) -> RangeProof:
    """Construct a bit-commitment range proof for C(value, blinding)."""
    raise NotImplementedError


def verify(commitment: PointJacobi, proof: RangeProof) -> bool:
    """Verify a range proof against `commitment`."""
    raise NotImplementedError
