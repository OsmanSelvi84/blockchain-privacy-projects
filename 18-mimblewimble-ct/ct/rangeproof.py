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

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass

from ecdsa.ellipticcurve import PointJacobi
from ct.curve import G, H, ORDER
from ct.schnorr import _point_to_bytes


@dataclass
class RangeProof:
    bit_commitments: list[PointJacobi]
    or_proofs: list[tuple[int, int, int, int]]  # (e_0, e_1, s_0, s_1) per bit
    n_bits: int


def _bit_challenge(C: PointJacobi, T0: PointJacobi, T1: PointJacobi) -> int:
    """e = sha256(C || T_0 || T_1) mod ORDER  — the Fiat-Shamir challenge."""
    h = hashlib.sha256(_point_to_bytes(C) + _point_to_bytes(T0) + _point_to_bytes(T1)).digest()
    return int.from_bytes(h, "big") % ORDER


def _or_prove_bit(bit: int, blinding: int, commitment: PointJacobi) -> tuple[int, int, int, int]:
    """OR-proof that `commitment` opens to 0 or 1 under `blinding`."""
    # A_0 corresponds to the bit==0 branch (commitment = r*G).
    # A_1 corresponds to the bit==1 branch (commitment - H = r*G).
    A0 = commitment
    A1 = commitment + (-H)

    # j = the true branch (= the actual bit value).
    j = bit

    # Real witness for the true branch.
    k = secrets.randbelow(ORDER - 1) + 1

    # Simulated challenge and response for the false branch.
    e_false = secrets.randbelow(ORDER - 1) + 1
    s_false = secrets.randbelow(ORDER - 1) + 1

    if j == 0:
        T0 = k * G
        # T1 = s_false*G - e_false*A1   (use scalar negation to avoid -INFINITY)
        T1 = s_false * G + ((ORDER - e_false) % ORDER) * A1
        e = _bit_challenge(commitment, T0, T1)
        e_true = (e - e_false) % ORDER
        s_true = (k + e_true * blinding) % ORDER
        e0, s0 = e_true, s_true
        e1, s1 = e_false, s_false
    else:
        T1 = k * G
        T0 = s_false * G + ((ORDER - e_false) % ORDER) * A0
        e = _bit_challenge(commitment, T0, T1)
        e_true = (e - e_false) % ORDER
        s_true = (k + e_true * blinding) % ORDER
        e0, s0 = e_false, s_false
        e1, s1 = e_true, s_true

    return (e0, e1, s0, s1)


def _or_verify_bit(commitment: PointJacobi, proof: tuple[int, int, int, int]) -> bool:
    """Verify a single bit's OR-proof."""
    e0, e1, s0, s1 = proof
    # Reject malformed scalars.
    for v in (e0, e1, s0, s1):
        if not (0 <= v < ORDER):
            return False
    A0 = commitment
    A1 = commitment + (-H)
    # Reconstruct T_0 and T_1 from the proof.
    T0 = s0 * G + ((ORDER - e0) % ORDER) * A0
    T1 = s1 * G + ((ORDER - e1) % ORDER) * A1
    # Check the Fiat-Shamir consistency: e_0 + e_1 == H(C || T_0 || T_1).
    expected = _bit_challenge(commitment, T0, T1)
    return (e0 + e1) % ORDER == expected


def prove(value: int, blinding: int, n_bits: int = 64) -> RangeProof:
    """Construct a bit-commitment range proof for C(value, blinding)."""
    if value < 0 or value >= (1 << n_bits):
        raise ValueError(f"value {value} not in [0, 2^{n_bits})")

    # Decompose value into bits, least significant first.
    bits = [(value >> i) & 1 for i in range(n_bits)]

    # Pick fresh blinding factors for bits 0..n_bits-2, then solve for the
    # last one so that  Σ 2^i * r_i  ≡  blinding  (mod ORDER).
    r = [secrets.randbelow(ORDER - 1) + 1 for _ in range(n_bits - 1)]
    weighted_sum = sum((1 << i) * r[i] for i in range(n_bits - 1)) % ORDER
    # r_{n-1} = (blinding - weighted_sum) * inverse(2^{n-1})  (mod ORDER)
    inv = pow(1 << (n_bits - 1), -1, ORDER)
    r_last = ((blinding - weighted_sum) * inv) % ORDER
    r.append(r_last)

    # Commit to each bit and run an OR-proof on it.
    bit_commitments = [bits[i] * H + r[i] * G for i in range(n_bits)]
    or_proofs = [_or_prove_bit(bits[i], r[i], bit_commitments[i]) for i in range(n_bits)]

    return RangeProof(bit_commitments=bit_commitments, or_proofs=or_proofs, n_bits=n_bits)


def verify(commitment: PointJacobi, proof: RangeProof) -> bool:
    """Verify a range proof against `commitment`."""
    if len(proof.bit_commitments) != proof.n_bits:
        return False
    if len(proof.or_proofs) != proof.n_bits:
        return False

    # Check every bit commitment is a commitment to 0 or 1.
    for C_i, p_i in zip(proof.bit_commitments, proof.or_proofs):
        if not _or_verify_bit(C_i, p_i):
            return False

    # Check the weighted sum of bit commitments equals the original commitment.
    total = (1 << 0) * proof.bit_commitments[0]
    for i in range(1, proof.n_bits):
        total = total + (1 << i) * proof.bit_commitments[i]
    return (total.x(), total.y()) == (commitment.x(), commitment.y())
