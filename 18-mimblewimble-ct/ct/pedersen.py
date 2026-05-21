"""
Pedersen commitments and the transaction balance check.

A Pedersen commitment to value v with blinding factor r is the curve point

    C(v, r) = v*H + r*G

Convention (matches Grin / MimbleWimble):
    H is the "value" generator   (amount lives here)
    G is the "blinding" generator (randomness lives here)

Properties:

1. HIDING. Given C, v is unrecoverable without r. Since r is uniform in
   [0, ORDER), r*G ranges over the whole curve and perfectly masks v*H.

2. ADDITIVELY HOMOMORPHIC.
       C(v1, r1) + C(v2, r2)  =  (v1+v2)*H + (r1+r2)*G  =  C(v1+v2, r1+r2)

   This is what lets MimbleWimble verify amount balance without ever
   decommitting.

BALANCE / NO-INFLATION CHECK
A transaction has inputs (v_i, r_i), outputs (v_j, r_j), and a public fee f.
Non-inflating requires Σ v_i = Σ v_j + f. Then

    D := Σ C_i - Σ C_j - f*H
       = (Σ v_i - Σ v_j - f)*H  +  (Σ r_i - Σ r_j)*G
       = 0*H + excess*G                                    (when balanced)
       = excess * G

where  excess = Σ r_i - Σ r_j  is the kernel excess scalar.

D is a pure-G point. It is published as the kernel public key, and the
spender proves possession of `excess` via a Schnorr signature on D
(see schnorr.py). This proves no value was created from nothing.
"""

from ecdsa.ellipticcurve import PointJacobi
from ct.curve import G, H, ORDER


def commit(value: int, blinding: int) -> PointJacobi:
    """Pedersen commitment C = value*H + blinding*G."""
    raise NotImplementedError


def add(c1: PointJacobi, c2: PointJacobi) -> PointJacobi:
    """C1 + C2."""
    raise NotImplementedError


def sub(c1: PointJacobi, c2: PointJacobi) -> PointJacobi:
    """C1 - C2 (i.e. C1 + (-C2))."""
    raise NotImplementedError


def balance_excess(
    input_commitments: list[PointJacobi],
    output_commitments: list[PointJacobi],
    fee: int,
) -> PointJacobi:
    """
    Compute the kernel excess point  D = Σ C_in - Σ C_out - fee*H.

    For a balanced transaction, D = excess*G for some scalar excess.
    """
    raise NotImplementedError
