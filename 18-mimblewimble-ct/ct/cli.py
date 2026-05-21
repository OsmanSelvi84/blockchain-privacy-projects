"""
Command-line interface for the MimbleWimble CT demo.

Subcommands:

    ct build --in V,R --in V,R --out V,R ... --fee F  [--output tx.json]
        Build a transaction from explicit (value, blinding) pairs and
        print the resulting tx as JSON to stdout (or to --output).

    ct verify [tx.json]
        Read a tx (from path or stdin), run all checks, print result.

Example:
    $ python -m ct.cli build --in 100,3 --in 50,7 --out 140,5 --fee 10
    {... json tx ...}
    $ python -m ct.cli build --in 100,3 --in 50,7 --out 140,5 --fee 10 > tx.json
    $ python -m ct.cli verify tx.json
    [OK] commitments balance
    [OK] all 1 range proofs valid
    [OK] kernel signature valid

This file is mostly plumbing (argparse, JSON I/O, hex encoding). The
real work is in transaction.build / transaction.verify which call into
the primitives.
"""

import argparse
import json
import sys
from typing import Iterable

from ct import transaction


def _parse_pair(s: str) -> tuple[int, int]:
    """Parse a 'value,blinding' string. Both are integers."""
    parts = s.split(",", 1)
    if len(parts) != 2:
        raise argparse.ArgumentTypeError(
            f"expected VALUE,BLINDING; got {s!r}")
    try:
        return (int(parts[0]), int(parts[1]))
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"non-integer in {s!r}: {e}")


def cmd_build(args: argparse.Namespace) -> int:
    tx = transaction.build(inputs=args.in_, outputs=args.out, fee=args.fee)
    out = json.dumps(tx, indent=2, sort_keys=True)
    if args.output and args.output != "-":
        with open(args.output, "w") as f:
            f.write(out + "\n")
    else:
        print(out)
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    if args.path and args.path != "-":
        with open(args.path) as f:
            tx = json.load(f)
    else:
        tx = json.load(sys.stdin)
    ok, reasons = transaction.verify(tx)
    for r in reasons:
        prefix = "[OK]" if ok else "[FAIL]"
        print(f"{prefix} {r}")
    return 0 if ok else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ct", description="MimbleWimble CT demo")
    sub = p.add_subparsers(dest="cmd", required=True)

    pb = sub.add_parser("build", help="build a transaction")
    pb.add_argument("--in", dest="in_", type=_parse_pair, action="append",
                    required=True, metavar="V,R",
                    help="input as VALUE,BLINDING; may be repeated")
    pb.add_argument("--out", dest="out", type=_parse_pair, action="append",
                    required=True, metavar="V,R",
                    help="output as VALUE,BLINDING; may be repeated")
    pb.add_argument("--fee", type=int, required=True, help="fee (integer)")
    pb.add_argument("--output", "-o", default="-",
                    help="write tx JSON to file (default: stdout)")
    pb.set_defaults(func=cmd_build)

    pv = sub.add_parser("verify", help="verify a transaction")
    pv.add_argument("path", nargs="?", default="-",
                    help="tx JSON path (default: stdin)")
    pv.set_defaults(func=cmd_verify)

    return p


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
