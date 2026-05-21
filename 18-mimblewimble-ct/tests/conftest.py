"""
Shared pytest fixtures.

The conftest.py is auto-discovered by pytest. Fixtures defined here are
available to all test files in this directory.
"""

import secrets
import pytest

from ct.curve import ORDER


@pytest.fixture
def blinding():
    """A fresh random blinding factor for a single test."""
    return secrets.randbelow(ORDER - 1) + 1


@pytest.fixture
def small_amount():
    """A small amount that fits comfortably in any range proof."""
    return 42
