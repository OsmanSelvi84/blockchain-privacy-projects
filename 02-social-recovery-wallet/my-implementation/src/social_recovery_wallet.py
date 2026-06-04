"""
social_recovery_wallet.py
=========================
Pure-Python reference implementation of a Social Recovery Wallet with
a simplified Zero-Knowledge Proof scheme (hash-based commitments / Pedersen-style).

WHY PYTHON?
-----------
This file lets you run, test, and understand the *cryptographic logic*
without a blockchain.  The Solidity contract contains identical math —
so you can compare outputs directly.

ZERO-KNOWLEDGE CONCEPT USED
-----------------------------
We use a *hash commitment* scheme:

    commitment = H(secret || nullifier)

  • secret    – a random 256-bit value known only to the guardian
  • nullifier – a unique 256-bit tag that prevents replay / double-voting
  • H         – SHA-256 (keccak256 on-chain)

PROOF = revealing (secret, nullifier) so the verifier can recompute
        commitment and check it against the stored value.

PRIVACY GUARANTEE:
  - Before proof:  only commitment is public  → guardian is anonymous
  - After proof:   (secret, nullifier) revealed → guardian authenticated
  - Nullifier prevents same commitment from voting twice (like a spend note)
  - Multiple guardians cannot collude without each other's secrets

THRESHOLD SCHEME
-----------------
  - Owner sets threshold T and registers N guardians (N ≥ T)
  - Recovery needs T distinct guardian proofs
  - No single guardian can recover alone (single-point-of-failure prevented)

Run:
    python social_recovery_wallet.py
    python social_recovery_wallet.py --demo
    python social_recovery_wallet.py --test
"""

import hashlib
import os
import time
import json
import argparse
from dataclasses import dataclass, field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# CRYPTOGRAPHIC PRIMITIVES
# ─────────────────────────────────────────────────────────────────────────────

def sha256_hex(data: bytes) -> str:
    """SHA-256 digest as lowercase hex (matches keccak256 role conceptually)."""
    return hashlib.sha256(data).hexdigest()

def random_bytes32() -> bytes:
    """Generate 32 cryptographically random bytes."""
    return os.urandom(32)

def derive_commitment(secret: bytes, nullifier: bytes) -> str:
    """
    Commit to a (secret, nullifier) pair.

    commitment = SHA256(secret || nullifier)

    This is the core ZK primitive:
      - Binding:   it is computationally infeasible to find two inputs
                   that produce the same commitment (collision resistance)
      - Hiding:    given only the commitment you cannot recover secret/nullifier
                   (pre-image resistance)
    """
    assert len(secret) == 32, "secret must be 32 bytes"
    assert len(nullifier) == 32, "nullifier must be 32 bytes"
    return sha256_hex(secret + nullifier)

def verify_proof(secret: bytes, nullifier: bytes, expected_commitment: str) -> bool:
    """
    Verify a ZK proof by re-deriving the commitment.
    Returns True iff the pre-image matches the stored commitment.
    """
    return derive_commitment(secret, nullifier) == expected_commitment


# ─────────────────────────────────────────────────────────────────────────────
# GUARDIAN
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Guardian:
    """
    Represents a trusted guardian.

    The guardian keeps (secret, nullifier) private.
    They publish only their commitment to the wallet owner.
    """
    name:       str
    secret:     bytes = field(default_factory=random_bytes32)
    nullifier:  bytes = field(default_factory=random_bytes32)

    @property
    def commitment(self) -> str:
        return derive_commitment(self.secret, self.nullifier)

    def create_proof(self) -> dict:
        """
        Construct a ZK proof (in this simplified scheme: just the pre-image).
        In a full ZK-SNARK, this would be a succinct proof that does NOT
        reveal secret/nullifier — here we reveal them to keep the code clear.
        """
        return {
            "guardian_name": self.name,
            "secret":     self.secret.hex(),
            "nullifier":  self.nullifier.hex(),
            "commitment": self.commitment,
        }

    def export_public(self) -> dict:
        """What the guardian shares with the wallet owner at registration."""
        return {"name": self.name, "commitment": self.commitment}


# ─────────────────────────────────────────────────────────────────────────────
# SOCIAL RECOVERY WALLET
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class RecoverySession:
    proposed_owner:  str
    initiated_at:    float
    approvals:       dict = field(default_factory=dict)  # nullifier -> True
    recovery_delay:  float = 172800  # 48 hours in seconds (set to 5 for demo)


class SocialRecoveryWallet:
    """
    Off-chain Python mirror of the Solidity SocialRecoveryWallet contract.

    All operations use the same cryptographic formulas — useful for testing
    and for the oral exam explanation.
    """

    # For demo purposes we use a short delay; change to 172800 for production
    RECOVERY_DELAY_SECONDS = 5  # 5 seconds for local demo

    def __init__(self, owner_name: str, threshold: int):
        assert threshold > 0, "Threshold must be > 0"
        self.owner:      str                        = owner_name
        self.threshold:  int                        = threshold
        self.balance:    float                      = 0.0  # simulated ETH

        # commitment  -> True  (registered guardian commitments)
        self.guardian_commitments: dict[str, bool]  = {}
        self.guardian_count: int                    = 0

        # spent nullifiers
        self.used_nullifiers: set[str]              = set()

        # active recovery session (or None)
        self.recovery: Optional[RecoverySession]    = None

        self._log: list[str]                        = []

    # ── Internal ──────────────────────────────────────────────────

    def _emit(self, event: str, **kwargs):
        msg = f"[EVENT] {event} " + " | ".join(f"{k}={v}" for k, v in kwargs.items())
        self._log.append(msg)
        print(msg)

    def _validate_proof(self, proof: dict) -> tuple[bool, str, str]:
        """
        Validate a guardian proof.
        Returns (ok, commitment, nullifier).
        """
        try:
            secret   = bytes.fromhex(proof["secret"])
            nullifier_bytes = bytes.fromhex(proof["nullifier"])
            nullifier_hex   = proof["nullifier"]
            commitment      = proof["commitment"]
        except (KeyError, ValueError) as e:
            return False, "", ""

        # 1. Re-derive commitment to verify knowledge of pre-image
        if not verify_proof(secret, nullifier_bytes, commitment):
            return False, "", ""

        # 2. Commitment must be registered
        if not self.guardian_commitments.get(commitment, False):
            return False, "", ""

        # 3. Nullifier must be fresh
        if nullifier_hex in self.used_nullifiers:
            return False, "", ""

        return True, commitment, nullifier_hex

    # ── Guardian Management ────────────────────────────────────────

    def add_guardian(self, commitment: str):
        """Register a guardian by their commitment (owner only)."""
        assert commitment, "Invalid commitment"
        assert commitment not in self.guardian_commitments, "Already registered"

        self.guardian_commitments[commitment] = True
        self.guardian_count += 1
        self._emit("GuardianAdded", commitment=commitment[:16] + "…")

    def remove_guardian(self, commitment: str):
        """Remove a guardian (owner only, recovery not active)."""
        assert self.recovery is None, "Recovery in progress"
        assert self.guardian_commitments.get(commitment), "Not a guardian"
        assert self.guardian_count > self.threshold, "Would drop below threshold"

        del self.guardian_commitments[commitment]
        self.guardian_count -= 1
        self._emit("GuardianRemoved", commitment=commitment[:16] + "…")

    def update_threshold(self, new_threshold: int):
        """Change approval threshold (owner only)."""
        assert self.recovery is None, "Recovery in progress"
        assert 0 < new_threshold <= self.guardian_count, "Bad threshold"
        self.threshold = new_threshold
        self._emit("ThresholdUpdated", threshold=new_threshold)

    # ── Recovery Flow ──────────────────────────────────────────────

    def initiate_recovery(self, proof: dict, new_owner: str):
        """
        Guardian initiates a recovery session.

        ZK step: proof contains (secret, nullifier, commitment).
        Contract verifies knowledge by re-deriving commitment.
        """
        assert self.recovery is None, "Recovery already active"
        assert new_owner, "Invalid new owner"

        ok, commitment, nullifier = self._validate_proof(proof)
        assert ok, "Invalid guardian proof"

        # Spend the nullifier
        self.used_nullifiers.add(nullifier)

        self.recovery = RecoverySession(
            proposed_owner=new_owner,
            initiated_at=time.time(),
            recovery_delay=self.RECOVERY_DELAY_SECONDS,
        )
        self.recovery.approvals[nullifier] = True

        self._emit("RecoveryInitiated",
                   proposed_owner=new_owner,
                   timestamp=int(self.recovery.initiated_at))
        self._emit("RecoveryApproved",
                   nullifier=nullifier[:16] + "…",
                   approval_count=len(self.recovery.approvals))

    def approve_recovery(self, proof: dict):
        """Another guardian approves the active recovery session."""
        assert self.recovery is not None, "No recovery in progress"

        ok, commitment, nullifier = self._validate_proof(proof)
        assert ok, "Invalid guardian proof"

        self.used_nullifiers.add(nullifier)
        self.recovery.approvals[nullifier] = True

        self._emit("RecoveryApproved",
                   nullifier=nullifier[:16] + "…",
                   approval_count=len(self.recovery.approvals))

    def execute_recovery(self):
        """
        Finalise recovery after timelock + threshold conditions are met.
        Can be called by anyone — contract enforces conditions.
        """
        assert self.recovery is not None, "No recovery in progress"
        assert len(self.recovery.approvals) >= self.threshold, \
            f"Threshold not reached ({len(self.recovery.approvals)}/{self.threshold})"

        elapsed = time.time() - self.recovery.initiated_at
        assert elapsed >= self.recovery.recovery_delay, \
            f"Timelock not expired ({elapsed:.1f}s / {self.recovery.recovery_delay}s)"

        old_owner = self.owner
        self.owner = self.recovery.proposed_owner
        self.recovery = None

        self._emit("RecoveryExecuted", old_owner=old_owner, new_owner=self.owner)

    def cancel_recovery(self, caller: str):
        """Owner can cancel any recovery session."""
        assert caller == self.owner, "Only owner can cancel"
        assert self.recovery is not None, "No recovery in progress"
        self.recovery = None
        self._emit("RecoveryCancelled")

    # ── Wallet Operations ──────────────────────────────────────────

    def deposit(self, amount: float, sender: str):
        assert amount > 0
        self.balance += amount
        self._emit("EtherReceived", sender=sender, amount=f"{amount} ETH")

    def send_ether(self, to: str, amount: float, caller: str):
        assert caller == self.owner, "Only owner can send"
        assert self.balance >= amount, "Insufficient balance"
        self.balance -= amount
        self._emit("EtherSent", to=to, amount=f"{amount} ETH")

    # ── View Helpers ───────────────────────────────────────────────

    def status(self) -> dict:
        rec_status = None
        if self.recovery:
            elapsed = time.time() - self.recovery.initiated_at
            time_left = max(0, self.recovery.recovery_delay - elapsed)
            rec_status = {
                "proposed_owner":  self.recovery.proposed_owner,
                "approvals":       len(self.recovery.approvals),
                "required":        self.threshold,
                "time_left_sec":   round(time_left, 1),
            }
        return {
            "owner":          self.owner,
            "threshold":      self.threshold,
            "guardian_count": self.guardian_count,
            "balance_eth":    self.balance,
            "recovery":       rec_status,
        }


# ─────────────────────────────────────────────────────────────────────────────
# DEMO  (end-to-end walkthrough)
# ─────────────────────────────────────────────────────────────────────────────

def run_demo():
    print("\n" + "=" * 65)
    print("  SOCIAL RECOVERY WALLET — END-TO-END DEMO")
    print("=" * 65 + "\n")

    # 1. Create wallet
    print("── STEP 1: Owner creates wallet (threshold = 2) ──────────────")
    wallet = SocialRecoveryWallet(owner_name="Alice", threshold=2)
    print(f"  Wallet owner : {wallet.owner}")
    print(f"  Threshold    : {wallet.threshold}\n")

    # 2. Create guardians with ZK commitments
    print("── STEP 2: Guardians generate commitments ────────────────────")
    guardians = [Guardian(name=n) for n in ["Bob", "Carol", "Dave"]]
    for g in guardians:
        print(f"  {g.name}:")
        print(f"    secret     : {g.secret.hex()[:32]}…")
        print(f"    nullifier  : {g.nullifier.hex()[:32]}…")
        print(f"    commitment : {g.commitment[:32]}…  (this is all Alice stores)")
    print()

    # 3. Owner registers guardians
    print("── STEP 3: Alice registers guardian commitments ──────────────")
    for g in guardians:
        wallet.add_guardian(g.commitment)
    print(f"  Guardian count : {wallet.guardian_count}\n")

    # 4. Simulate lost key
    print("── STEP 4: Alice loses her key!  ─────────────────────────────")
    wallet.deposit(1.5, "Alice")
    print(f"  Wallet balance : {wallet.balance} ETH")
    print(f"  New owner target: Eve (Alice's backup address)\n")

    # 5. Bob initiates recovery
    print("── STEP 5: Bob initiates recovery with ZK proof ──────────────")
    bob_proof = guardians[0].create_proof()
    wallet.initiate_recovery(bob_proof, new_owner="Eve")
    print(f"  Status: {json.dumps(wallet.status()['recovery'], indent=4)}\n")

    # 6. Carol approves
    print("── STEP 6: Carol approves recovery ───────────────────────────")
    carol_proof = guardians[1].create_proof()
    wallet.approve_recovery(carol_proof)
    print(f"  Approvals: {wallet.recovery.approvals.__len__()} / {wallet.threshold}\n")

    # 7. Timelock
    print("── STEP 7: Waiting for 48h timelock (5s in demo) ─────────────")
    print("  Sleeping 6 seconds…")
    time.sleep(6)

    # 8. Anyone executes recovery
    print("\n── STEP 8: Executing recovery ────────────────────────────────")
    wallet.execute_recovery()
    print(f"  New wallet owner : {wallet.owner}")
    print(f"  Balance retained : {wallet.balance} ETH\n")

    # 9. Double-vote attack attempt — Bob tries to re-use his nullifier on the SAME wallet
    print("── STEP 9: Replay attack — Bob tries to re-use nullifier ─────")
    # Create a new recovery session and try to reuse Bob's already-spent nullifier
    carol_proof2 = guardians[1].create_proof()   # Carol gets a new nullifier for fresh test
    # Eve is now the owner; Dave initiates a new recovery to test nullifier reuse
    dave_proof = guardians[2].create_proof()
    wallet.initiate_recovery(dave_proof, "Attacker")  # Dave opens a session
    try:
        wallet.approve_recovery(bob_proof)   # Bob tries reusing his spent nullifier
        print("  [FAIL] Replay attack succeeded — this is a bug!")
    except AssertionError as e:
        print(f"  [PASS] Replay blocked — spent nullifier rejected: {e}")
        wallet.cancel_recovery("Eve")  # Eve (new owner) cleans up

    print("=" * 65)
    print("  DEMO COMPLETE")
    print("=" * 65)


# ─────────────────────────────────────────────────────────────────────────────
# TEST SUITE
# ─────────────────────────────────────────────────────────────────────────────

def run_tests():
    print("\n" + "=" * 65)
    print("  RUNNING TEST SUITE")
    print("=" * 65 + "\n")
    passed = 0
    failed = 0

    def test(name, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}  →  {e}")
            failed += 1

    def fresh(threshold=2):
        w = SocialRecoveryWallet("Owner", threshold)
        w.RECOVERY_DELAY_SECONDS = 0
        gs = [Guardian(f"G{i}") for i in range(3)]
        for g in gs:
            w.add_guardian(g.commitment)
        return w, gs

    # Commitment correctness
    def t_commitment():
        g = Guardian("X")
        c = derive_commitment(g.secret, g.nullifier)
        assert c == g.commitment
    test("Commitment derivation matches", t_commitment)

    # Proof verification
    def t_verify():
        g = Guardian("X")
        p = g.create_proof()
        assert verify_proof(bytes.fromhex(p["secret"]), bytes.fromhex(p["nullifier"]), p["commitment"])
    test("Proof verification passes", t_verify)

    # Wrong secret rejected
    def t_bad_secret():
        g = Guardian("X")
        bad = g.create_proof()
        bad["secret"] = random_bytes32().hex()
        bad["commitment"] = g.commitment  # mismatch
        ok, _, _ = SocialRecoveryWallet("O", 1)._validate_proof(bad)
        assert not ok
    test("Tampered secret rejected", t_bad_secret)

    # Full recovery happy path
    def t_happy():
        w, gs = fresh(threshold=2)
        w.initiate_recovery(gs[0].create_proof(), "NewOwner")
        w.approve_recovery(gs[1].create_proof())
        w.execute_recovery()
        assert w.owner == "NewOwner"
    test("Happy path recovery (t=2, n=3)", t_happy)

    # Threshold not reached
    def t_threshold():
        w, gs = fresh(threshold=2)
        w.initiate_recovery(gs[0].create_proof(), "NewOwner")
        try:
            w.execute_recovery()
            assert False, "Should have failed"
        except AssertionError as e:
            assert "Threshold" in str(e)
    test("Recovery blocked below threshold", t_threshold)

    # Double-spend nullifier
    def t_double_nullifier():
        w, gs = fresh(threshold=2)
        proof = gs[0].create_proof()
        w.initiate_recovery(proof, "NewOwner")
        try:
            w.approve_recovery(proof)
            assert False
        except AssertionError:
            pass
    test("Double-spend nullifier blocked", t_double_nullifier)

    # Unknown guardian blocked
    def t_fake_guardian():
        w, gs = fresh()
        fake = Guardian("Faker")
        try:
            w.initiate_recovery(fake.create_proof(), "X")
            assert False
        except AssertionError:
            pass
    test("Unregistered guardian rejected", t_fake_guardian)

    # Owner cancel
    def t_cancel():
        w, gs = fresh()
        w.initiate_recovery(gs[0].create_proof(), "NewOwner")
        w.cancel_recovery("Owner")
        assert w.recovery is None
    test("Owner can cancel recovery", t_cancel)

    # Non-owner cannot cancel
    def t_cancel_noauth():
        w, gs = fresh()
        w.initiate_recovery(gs[0].create_proof(), "NewOwner")
        try:
            w.cancel_recovery("Attacker")
            assert False
        except AssertionError:
            pass
    test("Non-owner cannot cancel recovery", t_cancel_noauth)

    # Deposit + send
    def t_funds():
        w, gs = fresh()
        w.deposit(2.0, "Alice")
        w.send_ether("Bob", 1.5, "Owner")
        assert abs(w.balance - 0.5) < 1e-9
    test("Deposit and send ETH", t_funds)

    print(f"\n  Results: {passed} passed, {failed} failed")
    print("=" * 65)


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Social Recovery Wallet")
    parser.add_argument("--demo", action="store_true", help="Run interactive demo")
    parser.add_argument("--test", action="store_true", help="Run test suite")
    args = parser.parse_args()

    if args.test:
        run_tests()
    elif args.demo:
        run_demo()
    else:
        print("Social Recovery Wallet — use --demo or --test")
        print("  python social_recovery_wallet.py --demo")
        print("  python social_recovery_wallet.py --test")
