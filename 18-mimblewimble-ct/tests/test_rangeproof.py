"""
Tests for ct.rangeproof — bit-commitment OR-proof range proof.
"""

import secrets
import pytest

from ct import pedersen, rangeproof
from ct.curve import ORDER


def test_valid_proof_verifies():
    v = 12345
    r = secrets.randbelow(ORDER - 1) + 1
    C = pedersen.commit(v, r)
    proof = rangeproof.prove(v, r, n_bits=64)
    assert rangeproof.verify(C, proof)


def test_zero_amount_verifies():
    v = 0
    r = secrets.randbelow(ORDER - 1) + 1
    C = pedersen.commit(v, r)
    proof = rangeproof.prove(v, r, n_bits=64)
    assert rangeproof.verify(C, proof)


def test_max_amount_verifies():
    v = (1 << 64) - 1  # 2^64 - 1
    r = secrets.randbelow(ORDER - 1) + 1
    C = pedersen.commit(v, r)
    proof = rangeproof.prove(v, r, n_bits=64)
    assert rangeproof.verify(C, proof)


def test_proof_for_wrong_commitment_fails():
    """A valid proof for one commitment must not verify against a different commitment."""
    v, r = 100, secrets.randbelow(ORDER - 1) + 1
    proof = rangeproof.prove(v, r, n_bits=64)
    different_C = pedersen.commit(101, r)
    assert not rangeproof.verify(different_C, proof)
