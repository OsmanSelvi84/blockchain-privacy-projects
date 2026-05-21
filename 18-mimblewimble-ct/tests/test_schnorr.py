"""
Tests for ct.schnorr — signature correctness and rejection of bad sigs.
"""

import secrets
import pytest

from ct import schnorr
from ct.curve import G, ORDER


def test_sign_then_verify_passes():
    x = secrets.randbelow(ORDER - 1) + 1
    P = x * G
    msg = b"hello"
    R, s = schnorr.sign(x, msg)
    assert schnorr.verify(P, msg, R, s)


def test_wrong_message_fails():
    x = secrets.randbelow(ORDER - 1) + 1
    P = x * G
    R, s = schnorr.sign(x, b"original")
    assert not schnorr.verify(P, b"tampered", R, s)


def test_wrong_pubkey_fails():
    x = secrets.randbelow(ORDER - 1) + 1
    P = x * G
    msg = b"hello"
    R, s = schnorr.sign(x, msg)
    # different key
    Q = (x + 1) * G
    assert not schnorr.verify(Q, msg, R, s)


def test_tampered_signature_fails():
    x = secrets.randbelow(ORDER - 1) + 1
    P = x * G
    msg = b"hello"
    R, s = schnorr.sign(x, msg)
    assert not schnorr.verify(P, msg, R, (s + 1) % ORDER)
