"""
Differential test: run the original implementation and the reference
(grinventions/mimblewimble-py) on a fixed set of scenarios and compare
verdicts.

The reference is a full MimbleWimble wallet (slatepacks, BIP39, full Grin
protocol). The original here focuses on the underlying CT primitives.
The two have different APIs and serialization, so the comparison is
functional, not byte-for-byte:

    - For a valid scenario: both impls accept the resulting tx.
    - For an invalid scenario: both impls reject it.

Standard differential-testing pattern.
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path

# Path to the reference repo. Adjust if it lives elsewhere on the machine.
REFERENCE_PATH = Path("/Users/egedeniz/Documents/GitHub/reference-mimblewimble-py")

# Make the reference importable. In production we'd `pip install` it; for
# this demo it's enough to point at the source tree.
sys.path.insert(0, str(REFERENCE_PATH))

from ct import transaction as my_transaction


@dataclass
class Scenario:
    name: str
    description: str
    inputs: list[tuple[int, int]]   # (value, blinding)
    outputs: list[tuple[int, int]]
    fee: int
    should_be_valid: bool


SCENARIOS = [
    Scenario(
        name="01_simple",
        description="1 in -> 1 out + fee",
        inputs=[(100, 0xA1)],
        outputs=[(95, 0xB1)],
        fee=5,
        should_be_valid=True,
    ),
    Scenario(
        name="02_split",
        description="1 in -> 2 outs + fee",
        inputs=[(100, 0xA2)],
        outputs=[(60, 0xB2), (35, 0xC2)],
        fee=5,
        should_be_valid=True,
    ),
    Scenario(
        name="03_combine",
        description="2 ins -> 1 out + fee",
        inputs=[(50, 0xA3), (75, 0xB3)],
        outputs=[(120, 0xC3)],
        fee=5,
        should_be_valid=True,
    ),
    Scenario(
        name="04_zero_fee",
        description="1 in -> 1 out, fee=0",
        inputs=[(100, 0xA4)],
        outputs=[(100, 0xB4)],
        fee=0,
        should_be_valid=True,
    ),
    Scenario(
        name="05_unbalanced_invalid",
        description="1 in (100) -> 1 out (200), should fail (inflation)",
        inputs=[(100, 0xA5)],
        outputs=[(200, 0xB5)],
        fee=0,
        should_be_valid=False,
    ),
]


def run_original(scenario: Scenario) -> bool:
    """Build a tx with the original impl, return whether it verifies."""
    try:
        tx = my_transaction.build(scenario.inputs, scenario.outputs, scenario.fee)
        ok, _ = my_transaction.verify(tx)
        return ok
    except Exception:
        # Build may legitimately reject malformed input.
        return False


def run_reference(scenario: Scenario) -> bool:
    """
    Build/verify the equivalent in grinventions/mimblewimble-py.

    The reference uses slatepacks rather than raw (value, blinding) pairs,
    so this needs to translate from the scenario tuples into the
    reference's Slate / SlateBuilder APIs and return whether its
    verification accepts the resulting transaction. For the invalid
    scenario, "rejection" includes the case where the reference's API
    refuses to construct the inflating tx in the first place.
    """
    raise NotImplementedError


def main() -> int:
    print(f"{'Scenario':<25} {'Expected':<10} {'Original':<10} {'Reference':<10} {'Agree?'}")
    print("-" * 80)
    n_agree = 0
    for s in SCENARIOS:
        orig = run_original(s)
        try:
            ref = run_reference(s)
        except NotImplementedError:
            ref = None
        agree = (orig == ref) if ref is not None else "?"
        if agree is True:
            n_agree += 1
        print(f"{s.name:<25} {str(s.should_be_valid):<10} {str(orig):<10} "
              f"{str(ref):<10} {agree}")
    print("-" * 80)
    print(f"Agreement: {n_agree}/{len(SCENARIOS)}")
    return 0 if n_agree == len(SCENARIOS) else 1


if __name__ == "__main__":
    sys.exit(main())
