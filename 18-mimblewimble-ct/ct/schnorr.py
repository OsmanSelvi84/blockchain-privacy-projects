"""
Schnorr signature on secp256k1, used for the MimbleWimble kernel signature.

Schnorr is simpler than ECDSA and is linear in the key, which is what makes
the kernel-excess construction work cleanly across multiple parties.

PROTOCOL
Public params: curve generator G, group order n.
Keys:          private x (scalar), public P = x*G.

Sign(x, msg):
    k <- secure random scalar in [1, n-1]      (must never be reused)
    R = k*G
    e = sha256(R || P || msg) mod n             (Fiat-Shamir challenge)
    s = (k + e*x) mod n
    return (R, s)

Verify(P, msg, R, s):
    e = sha256(R || P || msg) mod n
    Check s*G == R + e*P
    (since s*G = (k + e*x)*G = k*G + e*x*G = R + e*P)

USE IN MIMBLEWIMBLE
The kernel "private key" is the excess scalar (Σ r_in - Σ r_out). The kernel
"public key" P is the excess point computed from commitment balance
(pedersen.balance_excess). Signing the fee message under P proves the
signer knows the excess and therefore owns all input blinding factors.

Nonce k MUST come from `secrets` (CSPRNG). Reusing k across two signatures
under the same key leaks the key.
"""

import hashlib
import secrets

from ecdsa.ellipticcurve import PointJacobi
from ct.curve import G, ORDER


def _point_to_bytes(point: PointJacobi) -> bytes:
    """
    Serialize a curve point to compressed 33-byte SEC1 form:
    0x02 || x  if y is even,  0x03 || x  if y is odd.
    """
    x = point.x()
    y = point.y()
    prefix = b"\x02" if y % 2 == 0 else b"\x03"
    return prefix + x.to_bytes(32, "big")


def challenge_hash(R: PointJacobi, P: PointJacobi, msg: bytes) -> int:
    """e = sha256(R_bytes || P_bytes || msg) mod ORDER."""
    h = hashlib.sha256(_point_to_bytes(R) + _point_to_bytes(P) + msg).digest()
    return int.from_bytes(h, "big") % ORDER


def sign(private_key: int, msg: bytes) -> tuple[PointJacobi, int]:
    """Schnorr-sign `msg` with `private_key`; returns (R, s)."""
    # Pick a fresh secure-random nonce in [1, ORDER-1]. NEVER reuse this.
    k = secrets.randbelow(ORDER - 1) + 1
    R = k * G
    P_pub = private_key * G
    e = challenge_hash(R, P_pub, msg)
    s = (k + e * private_key) % ORDER
    return R, s


def verify(public_key: PointJacobi, msg: bytes, R: PointJacobi, s: int) -> bool:
    """Verify (R, s) on `msg` under `public_key`: s*G == R + e*public_key."""
    # Reject malformed signatures: s must be in [0, ORDER).
    if not (0 <= s < ORDER):
        return False
    e = challenge_hash(R, public_key, msg)
    lhs = s * G
    rhs = R + e * public_key
    # Compare by coordinates so the point-at-infinity case doesn't surprise us.
    return (lhs.x(), lhs.y()) == (rhs.x(), rhs.y())
