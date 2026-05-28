"""
Reference-side driver for the differential comparison.

This script runs INSIDE the reference implementation's virtualenv
(grinventions/mimblewimble-py), which provides the native secp256k1-zkp
bindings. `compare_with_reference.py` runs in this project's own venv and
invokes this driver as a subprocess, so the two implementations never have
to share an environment.

Protocol: read one transaction scenario as JSON on stdin, print a verdict on
the last line of stdout:

    VALID       commitments balance with no inflation
    INVALID     they do not (e.g. an inflating transaction)
    ERROR ...   the reference could not evaluate the scenario

The verdict uses the reference's real Pedersen commitment math. A
MimbleWimble transaction does not inflate value iff

    Sum(C_in) - Sum(C_out)  ==  commit(fee, Sum(r_in) - Sum(r_out))

i.e. the only difference between the input and output commitments is the
public fee (in the H/value component) plus the kernel excess (in the G/
blinding component). This is the balance check both implementations share,
so it is the honest point of comparison: the reference uses the audited
libsecp256k1-zkp commitments, ours uses the pure-Python `ecdsa` curve.

Input JSON shape:
    {"inputs": [[value, blinding], ...],
     "outputs": [[value, blinding], ...],
     "fee": int}
"""

import json
import sys

from mimblewimble.crypto.pedersen import Pedersen
from mimblewimble.models.transaction import BlindingFactor

# secp256k1 group order; blinding factors are reduced into [0, N) before
# being packed into the 32-byte form the reference expects.
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


def _blinding(r: int) -> BlindingFactor:
    """Pack an integer blinding factor into the reference's 32-byte form."""
    return BlindingFactor((r % _N).to_bytes(32, "big"))


def evaluate(scenario: dict) -> bool:
    """Return True iff the scenario balances without inflation."""
    pedersen = Pedersen()
    fee = int(scenario["fee"])
    inputs = [(int(v), int(r)) for v, r in scenario["inputs"]]
    outputs = [(int(v), int(r)) for v, r in scenario["outputs"]]

    input_commitments = [pedersen.commit(v, _blinding(r)) for v, r in inputs]
    output_commitments = [pedersen.commit(v, _blinding(r)) for v, r in outputs]

    # Sum(C_in) - Sum(C_out)
    difference = pedersen.commitSum(input_commitments, output_commitments)

    # commit(fee, Sum(r_in) - Sum(r_out))
    excess = pedersen.blindSum(
        [_blinding(r) for _, r in inputs],
        [_blinding(r) for _, r in outputs],
    )
    expected = pedersen.commit(fee, excess)

    # Commitment.__eq__ compares the serialized 33-byte points.
    return difference == expected


def main() -> int:
    try:
        scenario = json.load(sys.stdin)
        print("VALID" if evaluate(scenario) else "INVALID")
        return 0
    except Exception as exc:  # report any reference failure verbatim to stdout
        print(f"ERROR {type(exc).__name__}: {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
