"""
Tests for ct.curve — confirms H is derived correctly and is on the curve.
"""

import pytest
from ct import curve


def test_derive_H_returns_point_on_curve():
    """H must satisfy the curve equation y² = x³ + 7 (mod p)."""
    H = curve.derive_H()
    x, y = H.x(), H.y()
    lhs = (y * y) % curve.P
    rhs = (x * x * x + 7) % curve.P
    assert lhs == rhs, "H is not on secp256k1"


def test_derive_H_is_deterministic():
    """Re-deriving from the same seed must produce the same point."""
    H1 = curve.derive_H()
    H2 = curve.derive_H()
    assert H1.x() == H2.x() and H1.y() == H2.y()


def test_H_not_equal_to_G():
    """Sanity: H must not just be G."""
    H = curve.derive_H()
    G = curve.G
    assert (H.x(), H.y()) != (G.x(), G.y())
