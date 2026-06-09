import os
import json
import random
import hashlib
import math
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.fernet import Fernet


# =============================================================================
# 1) HYBRID ENCRYPTION HELPERS
# -----------------------------------------------------------------------------
# Why hybrid? Pure RSA can only encrypt very small messages. For layered
# (onion) encryption, each layer adds overhead and we'd quickly exceed RSA's
# size limit. So we use the standard pattern: RSA encrypts a fresh symmetric
# key, AES (via Fernet) encrypts the actual payload. This is essentially what
# ECIES does in the paper.
# =============================================================================

def hybrid_encrypt(public_key, plaintext: bytes) -> bytes:
    """Encrypt plaintext using recipient's RSA public key (hybrid scheme)."""
    aes_key = Fernet.generate_key()
    encrypted_payload = Fernet(aes_key).encrypt(plaintext)

    encrypted_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return len(encrypted_key).to_bytes(4, "big") + encrypted_key + encrypted_payload


def hybrid_decrypt(private_key, ciphertext: bytes) -> bytes:
    """Decrypt one layer of hybrid ciphertext using own RSA private key."""
    key_len = int.from_bytes(ciphertext[:4], "big")
    encrypted_key = ciphertext[4 : 4 + key_len]
    encrypted_payload = ciphertext[4 + key_len :]

    aes_key = private_key.decrypt(
        encrypted_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return Fernet(aes_key).decrypt(encrypted_payload)


def build_onion(output_address: str, recipient_public_keys: list) -> bytes:
    """
    Wrap output_address in layered encryption.

    recipient_public_keys is ordered [first_to_decrypt, ..., last_to_decrypt].
    We encrypt from the inside out: the LAST decrypter's key goes on first
    (innermost), the FIRST decrypter's key goes on last (outermost).
    """
    payload = output_address.encode()
    for pk in reversed(recipient_public_keys):
        payload = hybrid_encrypt(pk, payload)
    return payload


# =============================================================================
# 2) PLAYER
# -----------------------------------------------------------------------------
# Each participant has:
#   - an input address (where their coin currently sits)
#   - a fresh ephemeral RSA keypair (used only for THIS mixing round)
#   - a fresh output address (where they want their coin to end up)
#   - a long-term signing key (simulates the Bitcoin signing key)
# =============================================================================

class Player:
    def __init__(self, player_id: str, input_address: str, amount: int, rng: random.Random):
        self.player_id = player_id
        self.input_address = input_address
        self.amount = amount

        self.priv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.pub_key = self.priv_key.public_key()

        seed_bytes = f"{player_id}|{rng.random()}".encode()
        self.output_address = "0x" + hashlib.sha256(seed_bytes).hexdigest()[:20]

        self.sign_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def decrypt_layer(self, ciphertext: bytes) -> bytes:
        """Strip one onion layer off a ciphertext."""
        return hybrid_decrypt(self.priv_key, ciphertext)

    def sign(self, message: bytes) -> bytes:
        """Sign a message with the long-term signing key."""
        return self.sign_key.sign(
            message,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )

    def verify_my_output(self, final_outputs: list) -> bool:
        """Check that my output address actually made it into the final list."""
        return self.output_address in final_outputs

    def __repr__(self):
        return f"Player({self.player_id}, in={self.input_address}, out={self.output_address})"


# =============================================================================
# 3) MIXING POOL ("contract")
# -----------------------------------------------------------------------------
# This is the "mixing pool contract" required by the assignment. It enforces
# the protocol rules: registration -> announcement -> shuffling -> verify ->
# finalize. Each phase can only run after the previous one completed.
# =============================================================================

class MixingPool:
    def __init__(self, mixing_amount: int, seed: int = None):
        self.mixing_amount = mixing_amount
        self.players = []
        self.phase = "IDLE"
        self.final_outputs = []
        self.log = []

        self.rng = random.Random(seed) if seed is not None else random.Random()

    def register(self, player: Player):
        if self.phase != "IDLE":
            raise RuntimeError("Pool already running, registration closed")
        if player.amount != self.mixing_amount:
            raise ValueError(
                f"Wrong amount: pool expects {self.mixing_amount}, got {player.amount}"
            )
        self.players.append(player)
        self._log(f"REGISTER {player.player_id} input={player.input_address}")

    def announce_phase(self):
        if len(self.players) < 2:
            raise RuntimeError("Need at least 2 players for unlinkability")

        self.players.sort(key=lambda p: p.player_id)

        pubkeys = {p.player_id: p.pub_key for p in self.players}
        self.phase = "ANNOUNCED"
        self._log(f"ANNOUNCE {len(self.players)} players, public keys exchanged")
        return pubkeys

    def shuffle_phase(self):
        if self.phase != "ANNOUNCED":
            raise RuntimeError("Run announce_phase() first")

        n = len(self.players)

        onions = []
        for i, player in enumerate(self.players):
            future_pubkeys = [p.pub_key for p in self.players[i + 1 :]]
            if future_pubkeys:
                onion = build_onion(player.output_address, future_pubkeys)
            else:
                onion = player.output_address.encode()
            onions.append(onion)

        current_list = []

        for i, player in enumerate(self.players):
            stripped = []
            for cipher in current_list:
                try:
                    stripped.append(player.decrypt_layer(cipher))
                except Exception as e:
                    self._log(f"BLAME player {player.player_id}: decrypt failed ({e})")
                    raise RuntimeError(f"Shuffle failed at player {player.player_id}")

            stripped.append(onions[i])

            self.rng.shuffle(stripped)
            current_list = stripped

            self._log(f"SHUFFLE step {i+1}/{n} player={player.player_id} listsize={len(current_list)}")

        self.final_outputs = [
            item.decode() if isinstance(item, bytes) else item for item in current_list
        ]
        self.phase = "SHUFFLED"
        self._log(f"SHUFFLE complete -> {self.final_outputs}")

    def verify_phase(self) -> bool:
        if self.phase != "SHUFFLED":
            raise RuntimeError("Run shuffle_phase() first")

        all_ok = all(p.verify_my_output(self.final_outputs) for p in self.players)
        if all_ok:
            self.phase = "VERIFIED"
            self._log("VERIFY ok: every player found their output address")
        else:
            self._log("VERIFY failed: some output address missing -> would enter blame")
        return all_ok

    def finalize(self) -> dict:
        if self.phase != "VERIFIED":
            raise RuntimeError("Run verify_phase() first (and it must succeed)")

        transaction = {
            "inputs": [
                {"address": p.input_address, "amount": self.mixing_amount}
                for p in self.players
            ],
            "outputs": [
                {"address": addr, "amount": self.mixing_amount}
                for addr in self.final_outputs
            ],
        }

        tx_data = json.dumps(transaction, sort_keys=True).encode()
        signatures = []
        for player in self.players:
            sig = player.sign(tx_data)
            signatures.append(
                {
                    "player_id": player.player_id,
                    "signature_preview": sig.hex()[:24] + "...",
                }
            )
        transaction["signatures"] = signatures

        self.phase = "FINALIZED"
        self._log("FINALIZE transaction signed by all participants")
        return transaction

    def unlinkability_report(self) -> dict:
        """How well is the input->output mapping hidden from an observer?"""
        n = len(self.players)
        return {
            "anonymity_set_size": n,
            "possible_input_output_mappings": math.factorial(n),
            "observer_can_link": False,
            "explanation": (
                f"An external observer sees {n} input addresses and {n} output "
                f"addresses but cannot determine which input paid which output. "
                f"All {math.factorial(n)} permutations are equally likely."
            ),
        }

    def _log(self, msg):
        self.log.append(msg)


# =============================================================================
# 4) DEMO / TEST RUNNER
# =============================================================================

def run_mixing_round(num_players: int = 3, amount: int = 1, seed: int = 42) -> dict:
    """Run one full CoinShuffle round and return a structured result."""
    rng = random.Random(seed)
    pool = MixingPool(mixing_amount=amount, seed=seed)

    for i in range(num_players):
        player = Player(
            player_id=f"P{i+1}",
            input_address=f"INPUT_{i+1:03d}",
            amount=amount,
            rng=rng,
        )
        pool.register(player)

    pool.announce_phase()
    pool.shuffle_phase()
    verified = pool.verify_phase()

    if not verified:
        return {"status": "FAILED", "phase": pool.phase, "log": pool.log}

    transaction = pool.finalize()
    report = pool.unlinkability_report()

    return {
        "status": "SUCCESS",
        "test_input": {"num_players": num_players, "amount": amount, "seed": seed},
        "input_addresses": [p.input_address for p in pool.players],
        "output_addresses_shuffled": pool.final_outputs,
        "transaction": transaction,
        "unlinkability": report,
        "log": pool.log,
    }


if __name__ == "__main__":
    import sys
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    amt = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sd = int(sys.argv[3]) if len(sys.argv) > 3 else 42

    result = run_mixing_round(num_players=n, amount=amt, seed=sd)
    print(json.dumps(result, indent=2))
