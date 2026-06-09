"""
Naive Centralized Mixer  -  Reference Baseline
==============================================

A deliberately simple coin mixer used as a baseline for comparing against the
CoinShuffle implementation. This represents the OLD-STYLE centralized mixing
service approach (Bitcoin Fog, BitLaundry, etc., circa 2012-2014) that was the
state-of-the-art before CoinShuffle was proposed.

How it works
------------
1. Every participant sends their input coin + a desired output address to a
   central coordinator (the "mixer").
2. The mixer randomly shuffles the output addresses.
3. The mixer sends each input's coin to a (random) output address.

Why it is INSECURE compared to CoinShuffle
------------------------------------------
The coordinator knows the FULL permutation: it knows exactly which input was
paid out to which output. Anyone who controls or compromises the coordinator
(or just inspects its memory) breaks the unlinkability guarantee.

CoinShuffle solves this with layered encryption + sequential shuffling so that
no single party ever sees the full permutation.

This file is intentionally small (~120 lines). It exists for one reason:
to give the instructor a runnable reference point to compare against the main
implementation in coinshuffle_mixing.py.

Same CLI as the main file:
    python naive_mixer.py [num_players] [amount] [seed]
"""

import sys
import json
import random
import hashlib
import math


# =============================================================================
# Participants and the central coordinator
# =============================================================================

class Participant:
    def __init__(self, pid, input_address, output_address, amount):
        self.pid = pid
        self.input_address = input_address
        self.output_address = output_address
        self.amount = amount


class CentralizedMixer:
    """The "trusted" mixing server. It is trusted because we have no choice."""

    def __init__(self, mixing_amount, seed=None):
        self.mixing_amount = mixing_amount
        self.participants = []
        self.permutation_map = {}   # input_addr -> output_addr  (the mixer knows ALL)
        self.shuffled_outputs = []
        self.log = []
        self.rng = random.Random(seed) if seed is not None else random.Random()

    def submit(self, participant):
        """A user hands over their coin and reveals their output address."""
        if participant.amount != self.mixing_amount:
            raise ValueError(
                f"Wrong amount: mixer expects {self.mixing_amount}, got {participant.amount}"
            )
        self.participants.append(participant)
        self.log.append(
            f"RECEIVED from {participant.pid}: input={participant.input_address}, "
            f"output={participant.output_address}"
        )

    def mix(self):
        """Shuffle output addresses randomly and record the (private) permutation."""
        if len(self.participants) < 2:
            raise RuntimeError("Need at least 2 participants to mix")

        # Keep a stable order on inputs (sorted by participant id)
        self.participants.sort(key=lambda p: p.pid)

        outputs = [p.output_address for p in self.participants]
        # Shuffle in place using the seeded RNG so the test is reproducible
        self.rng.shuffle(outputs)
        self.shuffled_outputs = outputs

        # The mixer records (and could leak) the full mapping
        for p, out in zip(self.participants, outputs):
            self.permutation_map[p.input_address] = out

        self.log.append(f"MIX done, shuffled outputs: {self.shuffled_outputs}")

    def build_transaction(self):
        """Build the mixing transaction (signed implicitly by the mixer)."""
        return {
            "inputs": [
                {"address": p.input_address, "amount": self.mixing_amount}
                for p in self.participants
            ],
            "outputs": [
                {"address": addr, "amount": self.mixing_amount}
                for addr in self.shuffled_outputs
            ],
            # The naive mixer signs everything on behalf of the users.
            # This is a major trust assumption that CoinShuffle avoids.
            "signed_by": "CENTRAL_MIXER",
        }

    def unlinkability_report(self):
        n = len(self.participants)
        return {
            "anonymity_set_size": n,
            "possible_input_output_mappings": math.factorial(n),
            "observer_can_link": False,        # external observer can't
            "mixer_can_link": True,            # but the MIXER itself knows
            "trusted_third_party_required": True,
            "explanation": (
                f"An external observer cannot link inputs to outputs, but the "
                f"central mixer holds the FULL permutation in memory and can "
                f"deanonymize every transaction at will. This is the trust "
                f"problem CoinShuffle was designed to eliminate."
            ),
        }


# =============================================================================
# Demo runner with the SAME interface as coinshuffle_mixing.py
# =============================================================================

def run_mixing_round(num_players=3, amount=1, seed=42):
    rng = random.Random(seed)
    mixer = CentralizedMixer(mixing_amount=amount, seed=seed)

    for i in range(num_players):
        pid = f"P{i+1}"
        input_addr = f"INPUT_{i+1:03d}"
        # Use the same output-address scheme as the main implementation so the
        # two outputs are directly comparable on the same seed.
        seed_bytes = f"{pid}|{rng.random()}".encode()
        output_addr = "0x" + hashlib.sha256(seed_bytes).hexdigest()[:20]
        mixer.submit(Participant(pid, input_addr, output_addr, amount))

    mixer.mix()
    transaction = mixer.build_transaction()
    report = mixer.unlinkability_report()

    return {
        "status": "SUCCESS",
        "implementation": "naive_centralized_mixer",
        "test_input": {"num_players": num_players, "amount": amount, "seed": seed},
        "input_addresses": [p.input_address for p in mixer.participants],
        "output_addresses_shuffled": mixer.shuffled_outputs,
        "transaction": transaction,
        "unlinkability": report,
        "log": mixer.log,
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    amt = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sd = int(sys.argv[3]) if len(sys.argv) > 3 else 42

    print(json.dumps(run_mixing_round(num_players=n, amount=amt, seed=sd), indent=2))
