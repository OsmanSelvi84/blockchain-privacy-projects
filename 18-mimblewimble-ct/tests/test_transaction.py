"""
End-to-end transaction tests — covers the five reference scenarios.
"""

import secrets
import pytest

from ct import transaction
from ct.curve import ORDER


def _r():
    """Fresh random blinding factor."""
    return secrets.randbelow(ORDER - 1) + 1


def test_simple_one_in_one_out():
    """100 in, 95 out, 5 fee — minimal valid tx."""
    tx = transaction.build(inputs=[(100, _r())], outputs=[(95, _r())], fee=5)
    ok, _ = transaction.verify(tx)
    assert ok


def test_split_one_in_two_out():
    """100 in, 60 + 35 out, 5 fee."""
    tx = transaction.build(
        inputs=[(100, _r())],
        outputs=[(60, _r()), (35, _r())],
        fee=5,
    )
    ok, _ = transaction.verify(tx)
    assert ok


def test_combine_two_in_one_out():
    """50 + 75 in, 120 out, 5 fee."""
    tx = transaction.build(
        inputs=[(50, _r()), (75, _r())],
        outputs=[(120, _r())],
        fee=5,
    )
    ok, _ = transaction.verify(tx)
    assert ok


def test_zero_fee():
    """Fee of 0 is structurally valid."""
    tx = transaction.build(inputs=[(100, _r())], outputs=[(100, _r())], fee=0)
    ok, _ = transaction.verify(tx)
    assert ok


def test_tampered_commitment_fails():
    """Modify a commitment in the tx and verify fails."""
    tx = transaction.build(inputs=[(100, _r())], outputs=[(95, _r())], fee=5)
    # Flip a byte in the first output commitment.
    bad = list(bytes.fromhex(tx["outputs"][0]["commitment"]))
    bad[5] ^= 0xFF
    tx["outputs"][0]["commitment"] = bytes(bad).hex()
    ok, _ = transaction.verify(tx)
    assert not ok


def test_tampered_kernel_signature_fails():
    """Modify the kernel sig and verify fails."""
    tx = transaction.build(inputs=[(100, _r())], outputs=[(95, _r())], fee=5)
    bad = list(bytes.fromhex(tx["kernel"]["sig_s"]))
    bad[0] ^= 0xFF
    tx["kernel"]["sig_s"] = bytes(bad).hex()
    ok, _ = transaction.verify(tx)
    assert not ok
