"""
secp256k1 curve setup and the two generator points G and H.

secp256k1 is the elliptic curve y² = x³ + 7 (mod p) with
p = 2²⁵⁶ - 2³² - 977. Its standard generator G has large prime order n.

For Pedersen commitments we need a second generator H such that no scalar k
with H = k*G is known. Otherwise commitments could be forged. H is a
"nothing-up-my-sleeve" point derived deterministically from a public seed.

Try-and-increment derivation of H:
    1. Hash seed || counter to get a candidate x mod p.
    2. Compute t = x³ + 7 mod p.
    3. If t is a quadratic residue mod p, set y = sqrt(t) mod p and return (x, y).
       (Even-y branch by convention.)
       Else increment counter and retry.

QR test on Fp:  t is a QR iff t^((p-1)/2) ≡ 1 (mod p)  (Euler's criterion).
Square root on Fp when p ≡ 3 mod 4:  y = t^((p+1)/4) mod p.
secp256k1's p satisfies p ≡ 3 mod 4, so this closed form applies.
"""

import hashlib

from ecdsa.curves import SECP256k1
from ecdsa.ellipticcurve import PointJacobi

# Curve parameters exposed by `ecdsa`.
CURVE = SECP256k1.curve
G: PointJacobi = SECP256k1.generator
ORDER: int = SECP256k1.order
P: int = CURVE.p()

# Public seed for the nothing-up-my-sleeve derivation of H.
H_SEED = b"MimbleWimble-CT/H/v1"


def derive_H() -> PointJacobi:
    """Derive H deterministically from H_SEED via try-and-increment."""
    counter = 0
    while True:
        # Hash the seed with a counter to get a candidate x-coordinate.
        h = hashlib.sha256(H_SEED + counter.to_bytes(4, "big")).digest()
        x = int.from_bytes(h, "big") % P

        # Check that x³ + 7 mod p is a quadratic residue (Euler's criterion).
        t = (pow(x, 3, P) + 7) % P
        if pow(t, (P - 1) // 2, P) == 1:
            # Compute y = sqrt(t) mod p using the closed form for p ≡ 3 mod 4.
            y = pow(t, (P + 1) // 4, P)
            # Pick the even-y branch by convention so the derivation is unique.
            if y % 2 != 0:
                y = P - y
            return PointJacobi(CURVE, x, y, 1, ORDER)
        counter += 1


# H is computed once at import time so all modules share the same instance.
H: PointJacobi = derive_H()
