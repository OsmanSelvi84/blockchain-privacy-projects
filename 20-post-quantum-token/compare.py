"""
compare.py - Run both implementations and show comparison
Usage:
    python3 compare.py
    python3 compare.py 0 1 50  1 2 30  2 0 20  0 2 10  1 0 15
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "original"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "reference"))

from pq_token           import run          as run_original
from reference_pq_token import run_reference


def compare(inputs=None):
    print("\n" + "█"*50)
    print("  RUNNING ORIGINAL")
    print("█"*50)
    o = run_original(inputs)

    print("\n" + "█"*50)
    print("  RUNNING REFERENCE")
    print("█"*50)
    r = run_reference(inputs)

    print("\n" + "="*50)
    print("  COMPARISON RESULTS")
    print("="*50)

    checks = [
        ("Alice balance",  o["balances"]["alice"],  r["balances"]["alice"]),
        ("Bob balance",    o["balances"]["bob"],    r["balances"]["bob"]),
        ("Carol balance",  o["balances"]["carol"],  r["balances"]["carol"]),
        ("Chain valid",    o["chain_valid"],         r["chain_valid"]),
        ("Blocks",         o["blocks"],              r["blocks"]),
        ("Key size",       o["pk_size"],             r["pk_size"]),
        ("Sig size",       o["sig_size"],            r["sig_size"]),
    ]

    all_pass = True
    for label, ov, rv in checks:
        match = "✓ MATCH" if ov == rv else "✗ MISMATCH"
        if ov != rv: all_pass = False
        print(f"  {label:<15} orig={str(ov):<8} ref={str(rv):<8} {match}")

    print("="*50)
    print(f"  {'ALL MATCH ✓' if all_pass else 'SOME MISMATCH ✗'}")
    print("="*50)


if __name__ == "__main__":
    args = sys.argv[1:]
    inputs = [(int(args[i]),int(args[i+1]),float(args[i+2])) for i in range(0,len(args),3)] if args else None
    compare(inputs)
