#!/usr/bin/env python3
"""
cli.py — Interactive CLI for the Social Recovery Wallet
========================================================
Run:  python cli.py
"""

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from social_recovery_wallet import (
    SocialRecoveryWallet,
    Guardian,
    derive_commitment,
    verify_proof,
)

wallet: SocialRecoveryWallet = None
guardians: dict = {}   # name -> Guardian


def banner():
    print("""
╔══════════════════════════════════════════════════════╗
║       Social Recovery Wallet  ·  ZK Edition          ║
╚══════════════════════════════════════════════════════╝""")


def menu():
    print("""
  [1]  Create new wallet
  [2]  Add guardian
  [3]  Show wallet status
  [4]  Deposit ETH
  [5]  Send ETH
  [6]  Initiate recovery
  [7]  Approve recovery
  [8]  Execute recovery
  [9]  Cancel recovery
  [10] List guardians
  [q]  Quit
""")


def require_wallet():
    if wallet is None:
        print("  ✗ No wallet created yet. Use option 1 first.")
        return False
    return True


def cmd_create():
    global wallet
    owner = input("  Owner name: ").strip() or "Owner"
    try:
        t = int(input("  Threshold (min approvals needed): ").strip())
    except ValueError:
        print("  ✗ Invalid threshold")
        return
    wallet = SocialRecoveryWallet(owner_name=owner, threshold=t)
    wallet.RECOVERY_DELAY_SECONDS = 10  # Short for demo
    print(f"  ✓ Wallet created for {owner} with threshold={t}")
    print(f"    (Recovery timelock: 10 seconds for demo mode)")


def cmd_add_guardian():
    if not require_wallet(): return
    name = input("  Guardian name: ").strip()
    if not name:
        print("  ✗ Name required")
        return
    g = Guardian(name=name)
    guardians[name] = g
    try:
        wallet.add_guardian(g.commitment)
        print(f"  ✓ Guardian '{name}' registered")
        print(f"    Commitment: {g.commitment[:32]}…  (stored on-chain)")
        print(f"    Secret:     {g.secret.hex()[:32]}…  (guardian keeps private)")
        print(f"    Nullifier:  {g.nullifier.hex()[:32]}…  (guardian keeps private)")
    except AssertionError as e:
        print(f"  ✗ {e}")


def cmd_status():
    if not require_wallet(): return
    s = wallet.status()
    print(f"""
  Owner         : {s['owner']}
  Threshold     : {s['threshold']}
  Guardians     : {s['guardian_count']}
  Balance       : {s['balance_eth']} ETH
  Recovery      : {json.dumps(s['recovery'], indent=6) if s['recovery'] else 'None'}""")


def cmd_deposit():
    if not require_wallet(): return
    try:
        amount = float(input("  Amount (ETH): ").strip())
        wallet.deposit(amount, wallet.owner)
    except (ValueError, AssertionError) as e:
        print(f"  ✗ {e}")


def cmd_send():
    if not require_wallet(): return
    try:
        to     = input("  Recipient: ").strip()
        amount = float(input("  Amount (ETH): ").strip())
        wallet.send_ether(to, amount, wallet.owner)
        print(f"  ✓ Sent {amount} ETH to {to}")
    except (ValueError, AssertionError) as e:
        print(f"  ✗ {e}")


def cmd_initiate():
    if not require_wallet(): return
    name = input("  Your guardian name: ").strip()
    if name not in guardians:
        print(f"  ✗ Guardian '{name}' not found in local registry")
        return
    new_owner = input("  Proposed new owner: ").strip()
    try:
        proof = guardians[name].create_proof()
        wallet.initiate_recovery(proof, new_owner)
        print(f"  ✓ Recovery initiated. Waiting for {wallet.threshold - 1} more approval(s).")
    except AssertionError as e:
        print(f"  ✗ {e}")


def cmd_approve():
    if not require_wallet(): return
    name = input("  Your guardian name: ").strip()
    if name not in guardians:
        print(f"  ✗ Guardian '{name}' not found")
        return
    try:
        proof = guardians[name].create_proof()
        wallet.approve_recovery(proof)
        if wallet.recovery:
            remaining = wallet.threshold - len(wallet.recovery.approvals)
            print(f"  ✓ Approved. {'Ready to execute!' if remaining <= 0 else f'{remaining} more needed.'}")
    except AssertionError as e:
        print(f"  ✗ {e}")


def cmd_execute():
    if not require_wallet(): return
    try:
        wallet.execute_recovery()
        print(f"  ✓ Recovery complete! New owner: {wallet.owner}")
    except AssertionError as e:
        print(f"  ✗ {e}")


def cmd_cancel():
    if not require_wallet(): return
    try:
        wallet.cancel_recovery(wallet.owner)
        print("  ✓ Recovery cancelled by owner")
    except AssertionError as e:
        print(f"  ✗ {e}")


def cmd_list():
    if not require_wallet(): return
    if not guardians:
        print("  No guardians registered yet")
        return
    print(f"\n  {'Name':<12} {'Commitment (first 20 hex)'}")
    print("  " + "-" * 40)
    for name, g in guardians.items():
        flag = " ✓" if wallet.guardian_commitments.get(g.commitment) else " ✗(removed)"
        print(f"  {name:<12} {g.commitment[:20]}…{flag}")


def main():
    banner()
    COMMANDS = {
        "1": cmd_create, "2": cmd_add_guardian, "3": cmd_status,
        "4": cmd_deposit, "5": cmd_send, "6": cmd_initiate,
        "7": cmd_approve, "8": cmd_execute, "9": cmd_cancel,
        "10": cmd_list,
    }
    while True:
        menu()
        choice = input("  > ").strip().lower()
        if choice in ("q", "quit", "exit"):
            print("  Goodbye!")
            break
        if choice in COMMANDS:
            print()
            COMMANDS[choice]()
        else:
            print("  ✗ Unknown option")


if __name__ == "__main__":
    main()
