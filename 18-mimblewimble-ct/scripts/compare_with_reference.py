"""
Differential test: run this project's original implementation and the
reference (grinventions/mimblewimble-py) on a fixed set of scenarios and
compare verdicts.

The reference is a full MimbleWimble wallet built on the native
libsecp256k1-zkp bindings; the original here is pure-Python CT primitives.
They have different APIs, serialization, and dependencies, so the comparison
is functional, not byte-for-byte:

    - For a valid scenario:   both impls accept it.
    - For an invalid scenario: both impls reject it.

Because the reference needs its own native dependencies, it runs in its own
virtualenv. This script (running in THIS project's venv) shells out to that
venv via `scripts/reference_driver.py` rather than importing the reference
directly. Point at the reference with the MW_REFERENCE_PATH environment
variable, or place it in a sibling directory:

    MW_REFERENCE_PATH=/path/to/mimblewimble-py \
        PYTHONPATH=. python scripts/compare_with_reference.py

The instructor supplies the 5 evaluation inputs. Either edit the SCENARIOS
list below, or (no code editing needed) pass a JSON file:

    PYTHONPATH=. python scripts/compare_with_reference.py --scenarios inputs.json

where inputs.json is a list of objects:
    [{"name": "case1",
      "inputs":  [[100, 161]],          # [value, blinding] pairs
      "outputs": [[95, 177]],
      "fee": 5,
      "should_be_valid": true},         # optional; omit if unknown
     ...]

Standard differential-testing pattern.
"""

from __future__ import annotations  # allow `X | None` hints on Python 3.9

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from ct import transaction as my_transaction

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DRIVER = Path(__file__).resolve().parent / "reference_driver.py"


@dataclass
class Scenario:
    name: str
    description: str
    inputs: list[tuple[int, int]]   # (value, blinding)
    outputs: list[tuple[int, int]]
    fee: int
    should_be_valid: bool | None    # None = no expected verdict supplied


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


class ReferenceUnavailable(Exception):
    """Raised when the reference impl cannot be located or invoked."""


def load_scenarios(path: Path) -> list[Scenario]:
    """Load instructor-supplied scenarios from a JSON file (see module docs)."""
    data = json.loads(path.read_text())
    scenarios = []
    for i, item in enumerate(data):
        scenarios.append(Scenario(
            name=str(item.get("name", f"case_{i + 1}")),
            description=str(item.get("description", "")),
            inputs=[(int(v), int(r)) for v, r in item["inputs"]],
            outputs=[(int(v), int(r)) for v, r in item["outputs"]],
            fee=int(item["fee"]),
            should_be_valid=item.get("should_be_valid"),
        ))
    return scenarios


def find_reference() -> Path | None:
    """Locate the reference repo via MW_REFERENCE_PATH or a sibling dir."""
    candidates = []
    env = os.environ.get("MW_REFERENCE_PATH")
    if env:
        candidates.append(Path(env).expanduser())
    # Search sibling directories of the project and of its parent repo, under
    # both the cloned name and the upstream name.
    for base in (PROJECT_ROOT.parent, PROJECT_ROOT.parent.parent):
        candidates += [
            base / "reference-mimblewimble-py",
            base / "mimblewimble-py",
        ]
    for c in candidates:
        if c.is_dir():
            return c
    return None


def reference_python(ref_path: Path) -> str:
    """Prefer the reference's own venv interpreter; fall back to this one."""
    venv_python = ref_path / ".venv" / "bin" / "python"
    return str(venv_python) if venv_python.exists() else sys.executable


def run_original(scenario: Scenario) -> bool:
    """Build a tx with the original impl, return whether it verifies."""
    try:
        tx = my_transaction.build(scenario.inputs, scenario.outputs, scenario.fee)
        ok, _ = my_transaction.verify(tx)
        return ok
    except Exception:
        # Build may legitimately reject malformed input.
        return False


def run_reference(scenario: Scenario, ref_path: Path) -> bool:
    """
    Evaluate the scenario with grinventions/mimblewimble-py.

    Runs scripts/reference_driver.py in the reference's own virtualenv (so the
    native secp256k1-zkp dependency stays isolated from this project) and
    parses its VALID/INVALID verdict. Raises ReferenceUnavailable if the
    driver cannot be run or returns an error.
    """
    payload = json.dumps({
        "inputs": scenario.inputs,
        "outputs": scenario.outputs,
        "fee": scenario.fee,
    })
    env = {**os.environ, "PYTHONPATH": str(ref_path)}
    try:
        proc = subprocess.run(
            [reference_python(ref_path), str(DRIVER)],
            input=payload, capture_output=True, text=True, env=env, timeout=120,
        )
    except Exception as exc:
        raise ReferenceUnavailable(f"could not invoke reference: {exc}")

    verdict = (proc.stdout.strip().splitlines() or [""])[-1].strip()
    if verdict == "VALID":
        return True
    if verdict == "INVALID":
        return False
    detail = (proc.stdout.strip() + " " + proc.stderr.strip()).strip()
    raise ReferenceUnavailable(f"reference driver error: {detail}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Differential test vs the reference impl")
    parser.add_argument("--scenarios", metavar="FILE",
                        help="JSON file of instructor-supplied scenarios (overrides the built-in set)")
    args = parser.parse_args(argv)

    scenarios = load_scenarios(Path(args.scenarios)) if args.scenarios else SCENARIOS

    ref_path = find_reference()
    if ref_path is None:
        print("WARNING: reference implementation not found.")
        print("         Set MW_REFERENCE_PATH or clone grinventions/mimblewimble-py")
        print("         into a sibling directory to enable the differential check.")
        print("         Running the original implementation only.\n")
    else:
        print(f"Reference: {ref_path}\n")

    header = f"{'Scenario':<24} {'Expected':<9} {'Original':<9} {'Reference':<10} {'Agree?'}"
    print(header)
    print("-" * len(header))

    originals_ok = True   # every original verdict matches the supplied expectation
    references_ok = True  # every reference verdict matches the original
    ref_ran = False

    for s in scenarios:
        orig = run_original(s)
        if s.should_be_valid is not None and orig != s.should_be_valid:
            originals_ok = False

        if ref_path is None:
            ref_str, agree = "n/a", "-"
        else:
            try:
                ref = run_reference(s, ref_path)
                ref_ran = True
                ref_str = "valid" if ref else "invalid"
                if orig == ref:
                    agree = "yes"
                else:
                    agree = "NO"
                    references_ok = False
            except ReferenceUnavailable as exc:
                ref_str, agree = "ERROR", "NO"
                references_ok = False
                print(f"  ! {s.name}: {exc}")

        expected = "?" if s.should_be_valid is None else str(s.should_be_valid)
        print(f"{s.name:<24} {expected:<9} "
              f"{('valid' if orig else 'invalid'):<9} {ref_str:<10} {agree}")

    print("-" * len(header))

    if ref_path is None:
        print("Original vs expected:", "PASS" if originals_ok else "FAIL")
        print("Differential check skipped (no reference).")
        return 0 if originals_ok else 1

    all_ok = originals_ok and references_ok and ref_ran
    print(f"Original vs expected: {'PASS' if originals_ok else 'FAIL'}")
    print(f"Original vs reference: {'PASS' if (references_ok and ref_ran) else 'FAIL'}")
    print("Result:", "ALL SCENARIOS AGREE" if all_ok else "MISMATCH")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
