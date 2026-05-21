"""
Tests for ct.pedersen — commitment correctness and homomorphic balance.
"""

import secrets
import pytest

from ct import pedersen
from ct.curve import G, H, ORDER


def test_commitment_is_deterministic(small_amount, blinding):
    """commit(v, r) is a pure function — same inputs give same point."""
    c1 = pedersen.commit(small_amount, blinding)
    c2 = pedersen.commit(small_amount, blinding)
    assert (c1.x(), c1.y()) == (c2.x(), c2.y())


def test_homomorphic_addition():
    """C(v1, r1) + C(v2, r2)  ==  C(v1+v2, r1+r2 mod ORDER)."""
    v1, r1 = 30, secrets.randbelow(ORDER - 1) + 1
    v2, r2 = 70, secrets.randbelow(ORDER - 1) + 1
    lhs = pedersen.add(pedersen.commit(v1, r1), pedersen.commit(v2, r2))
    rhs = pedersen.commit(v1 + v2, (r1 + r2) % ORDER)
    assert (lhs.x(), lhs.y()) == (rhs.x(), rhs.y())


def test_balance_excess_balanced_transaction():
    """For a balanced tx, the excess D should equal excess_scalar * G."""
    r_in1 = secrets.randbelow(ORDER - 1) + 1
    r_in2 = secrets.randbelow(ORDER - 1) + 1
    r_out1 = secrets.randbelow(ORDER - 1) + 1
    r_out2 = secrets.randbelow(ORDER - 1) + 1

    # 100 + 50 = 130 + 15 + 5(fee)
    inputs = [pedersen.commit(100, r_in1), pedersen.commit(50, r_in2)]
    outputs = [pedersen.commit(130, r_out1), pedersen.commit(15, r_out2)]
    fee = 5

    D = pedersen.balance_excess(inputs, outputs, fee)
    excess_scalar = (r_in1 + r_in2 - r_out1 - r_out2) % ORDER
    expected = excess_scalar * G

    assert (D.x(), D.y()) == (expected.x(), expected.y())


def test_balance_excess_unbalanced_transaction_does_not_equal_excess_G():
    """Unbalanced tx — D should NOT be a pure-G point matching excess_scalar."""
    r_in = secrets.randbelow(ORDER - 1) + 1
    r_out = secrets.randbelow(ORDER - 1) + 1
    inputs = [pedersen.commit(100, r_in)]
    outputs = [pedersen.commit(200, r_out)]  # inflating!
    fee = 0

    D = pedersen.balance_excess(inputs, outputs, fee)
    excess_scalar = (r_in - r_out) % ORDER
    expected = excess_scalar * G
    assert (D.x(), D.y()) != (expected.x(), expected.y())
