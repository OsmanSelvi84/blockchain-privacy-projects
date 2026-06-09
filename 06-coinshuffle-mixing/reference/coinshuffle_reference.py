"""
CoinShuffle Reference Implementation — Python 3 port of atong01/coinshuffle
============================================================================

This file is a Python 3 port of the core algorithm from:

    Repository : https://github.com/atong01/coinshuffle
    File       : coin_shuffle.py
    Author     : Alexander Tong (atong01)
    Original   : Python 2.7 + pycrypto + Flask REST API
    License    : See upstream repository

Why a port was necessary
------------------------
The upstream code from 2017 is not directly runnable today:
  * It is Python 2 (uses `iteritems()`, parenthesis-less `print`, etc.)
  * It depends on `pycrypto`, which was officially deprecated in 2018 and
    cannot be installed on Python 3.10+
  * It depends on a separate `util.py` helper module
  * It depends on `numpy` only for `np.random.permutation`
  * Communication between players uses HTTP via `requests`, requiring multiple
    Flask servers and shell scripts to set up

Adaptation changes (deliberately minimal)
-----------------------------------------
1. `pycrypto` -> `cryptography` library (RSA-OAEP + AES-Fernet hybrid scheme).
   Drop-in functional replacement for `util.encrypt` / `util.decrypt`.
2. `numpy.random.permutation` -> `random.shuffle`. Same outcome, one less
   dependency.
3. The HTTP request/response chain between clients is replaced with direct
   in-process method calls, since this file is meant to be run as a single
   executable for instructor-side comparison testing. The protocol logic is
   unchanged — every shuffling, encryption, and decryption step still
   happens in exactly the same sequence and on exactly the same data.
4. Python 2 syntax fixed (`iteritems()` -> `items()`, prints, integer
   division).
5. Same class names (`CoinShuffleServer`, `CoinShuffleClient`) and same
   method names (`submit_public_key`, `_encrypt_dest`, `_shuffle_data`,
   `_decrypt_data`, `perform_shuffle`, `construct_transactions`) are
   preserved so anyone reading the upstream source can map this port
   line-for-line.

What this file is NOT
---------------------
This is not an "original implementation". The original implementation by
the student is in `coinshuffle_mixing.py`. The two files are deliberately
different in design — this one mirrors atong01's centralized-server +
ordered-clients architecture, while the original implementation in
`coinshuffle_mixing.py` uses a cleaner phase-based design.

CLI:
    python coinshuffle_reference.py [num_players] [amount] [seed]
"""

import sys
import json
import random
import hashlib
import math
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.fernet import Fernet


# =============================================================================
# Crypto helpers (replaces atong01's `util.encrypt` / `util.decrypt`)
# =============================================================================

def generate_keypair():
    """Replaces util.generate_keypair() — was pycrypto RSA, now `cryptography`."""
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return priv


def public_key(keypair):
    """Replaces util.public_key()."""
    return keypair.public_key()


def encrypt(pubkey, plaintext: bytes) -> bytes:
    """
    Hybrid encryption (was straight RSA in pycrypto). Same external behaviour:
    bytes-in, bytes-out, only the matching private key can decrypt.
    """
    aes_key = Fernet.generate_key()
    enc_payload = Fernet(aes_key).encrypt(plaintext)
    enc_key = pubkey.encrypt(
        aes_key,
        padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    return len(enc_key).to_bytes(4, "big") + enc_key + enc_payload


def decrypt(keypair, ciphertext: bytes) -> bytes:
    """Reverse of encrypt(). Same signature as util.decrypt()."""
    klen = int.from_bytes(ciphertext[:4], "big")
    enc_key = ciphertext[4:4 + klen]
    enc_payload = ciphertext[4 + klen:]
    aes_key = keypair.decrypt(
        enc_key,
        padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    return Fernet(aes_key).decrypt(enc_payload)


# =============================================================================
# CoinShuffleServer  —  matches atong01's class verbatim in structure
# =============================================================================

class CoinShuffleServer:
    """Port of CoinShuffleServer. Collects public keys and starts the round."""

    def __init__(self):
        self.keys = []
        self.peers = []
        self.started = False

    def submit_public_key(self, ek, address):
        self.keys.append(ek)
        self.peers.append(address)

    def get_keys(self):
        return self.keys  # bug fix: upstream returned a free-floating `keys`

    def start(self):
        if self.started:
            return None, False
        self.started = True
        response = {
            "peers": {addr: ek for addr, ek in zip(self.peers, self.keys)},
            "order": {i: ek for i, ek in enumerate(self.keys)},
            "participants": len(self.keys),
        }
        return response, len(self.keys) > 0

    def reset(self):
        to_return = self.started
        self.started = False
        self.keys = []
        self.peers = []
        return to_return


# =============================================================================
# CoinShuffleClient  —  port of atong01's CoinShuffleClient
# =============================================================================

class CoinShuffleClient:
    """
    Per-wallet client. The protocol logic (`_encrypt_dest`, `_shuffle_data`,
    `_decrypt_data`, `perform_shuffle`, `construct_transactions`) is preserved
    one-to-one from the upstream file; only the inter-client transport
    (originally HTTP) is replaced with direct calls.
    """

    def __init__(self, addr, source, hidden_target, server, rng):
        self.amount = 1
        self.addr = addr
        self.source = source
        self.hidden_target = hidden_target
        self.keypair = generate_keypair()
        self.ek = public_key(self.keypair)
        self.index = None
        self.peers = None
        self.order = None
        self.is_last_shuffler = None
        self.server = server                     # was: server_addr URL
        self.start_called = False
        self.rng = rng                           # was: numpy global RNG
        self._next_client = None                 # set by the runner; replaces HTTP `next_addr`
        self._final_transaction = None           # captured in construct_transactions

        # Equivalent to the original `submit_ek_to_server(server_addr)` HTTP POST
        self.server.submit_public_key(self.ek, self.addr)

    def set_next(self, client):
        """In-process replacement for `next_addr()` HTTP routing."""
        self._next_client = client

    def start(self, peers, order):
        """
        Configure client with peer info. In upstream this also kicked off the
        chain if index == 0; in this single-process port that's moved to a
        separate `kick_off()` call so every client can be configured before
        the chain begins (upstream relied on parallel HTTP calls).
        """
        assert isinstance(order, dict)
        assert isinstance(peers, dict)
        self.start_called = True
        self.peers = peers
        self.num_peers = len(peers)
        self.order = order
        self.index = int(self._find_index(order))
        self.is_last_shuffler = (self.index + 1 == len(order))
        self.encrypted_target = self._encrypt_dest()

    def kick_off(self):
        """First shuffler triggers the chain. (Was implicit at end of upstream start().)"""
        if self.index == 0:
            self.perform_shuffle({}, {})

    def _find_index(self, order):
        """Locate own position by matching public key (was `iteritems`)."""
        for i, ek in order.items():
            if self.ek == ek:
                return i
        return -1

    def _shuffle_data(self, data):
        """
        Randomly permute the dict. Upstream used numpy.random.permutation;
        the port uses the seeded `random` module so test runs stay reproducible.
        """
        keys = list(data.keys())
        values = [data[k] for k in keys]
        self.rng.shuffle(values)
        return {str(i): values[i] for i in range(len(values))}

    def _decrypt_data(self, data):
        """Strip one onion layer from every entry."""
        new_data = {}
        for i, v in data.items():
            vp = dict(v)            # shallow copy, was v.copy()
            vp["target"] = decrypt(self.keypair, v["target"])
            new_data[i] = vp
        return new_data

    def _encrypt_dest(self):
        """
        Wrap own target address in layers using the public keys of every
        shuffler that comes AFTER me in the order. Same loop as upstream.
        """
        t = self.hidden_target
        for i in range(self.num_peers - 1, self.index, -1):
            t = encrypt(self.order[i], t)
        return t

    def perform_shuffle(self, sources, data):
        """
        Core shuffling step. Logic preserved verbatim from upstream:
          1. assert position consistency
          2. decrypt my layer off every entry
          3. add my own entry
          4. record my source address
          5. shuffle the resulting list
          6. either forward to the next client OR finalise if I'm last
        """
        assert self.index == len(data), \
            f"Expected {self.index} entries from upstream shuffler, got {len(data)}"

        data = self._decrypt_data(data)
        data[str(self.index)] = {
            "public_key": self.ek,
            "target": self.encrypted_target,
        }
        sources = dict(sources)
        sources[str(self.index)] = {"source": self.source}
        data = self._shuffle_data(data)

        if self.index == self.num_peers - 1:
            self.construct_transactions(sources, data)
        else:
            # Upstream: requests.post(self.next_addr() + "coinshuffle/shuffle", ...)
            # Port: direct in-process call
            self._next_client.perform_shuffle(sources, data)

    def construct_transactions(self, sources, data):
        """Assemble the final mixing transaction from the shuffled outputs."""
        ins = {}
        outs = {}
        for i, tx in data.items():
            src = sources[str(i)]
            ins[str(i)] = {"amount": self.amount, "addr": src["source"]}
            target = tx["target"]
            if isinstance(target, (bytes, bytearray)):
                target = target.decode()
            outs[str(i)] = {"amount": self.amount, "addr": target}
        self._final_transaction = {"in": ins, "out": outs}


# =============================================================================
# Single-process runner with same CLI/JSON contract as the other files
# =============================================================================

def run_mixing_round(num_players=3, amount=1, seed=42):
    rng = random.Random(seed)
    server = CoinShuffleServer()

    # Build clients (each posts its key to the server on construction)
    clients = []
    for i in range(num_players):
        pid = f"P{i + 1}"
        source = f"INPUT_{i + 1:03d}"
        seed_bytes = f"{pid}|{rng.random()}".encode()
        target = "0x" + hashlib.sha256(seed_bytes).hexdigest()[:20]
        c = CoinShuffleClient(
            addr=pid,
            source=source,
            hidden_target=target.encode(),
            server=server,
            rng=rng,
        )
        c.amount = amount
        clients.append(c)

    # Wire up the in-process chain (replaces HTTP routing)
    for i in range(len(clients) - 1):
        clients[i].set_next(clients[i + 1])

    # Server starts the round: hands out (peers, order)
    response, ok = server.start()
    assert ok, "Server refused to start (no participants)"
    peers_map = response["peers"]
    order_map = response["order"]

    # Distribute (peers, order) to every client first…
    for c in clients:
        c.start(peers_map, order_map)
    # …then the first shuffler kicks the chain off in-process.
    clients[0].kick_off()

    # The last client wrote the finalised transaction
    last_client = clients[-1]
    transaction = last_client._final_transaction

    shuffled_outputs = [transaction["out"][str(i)]["addr"] for i in range(num_players)]

    return {
        "status": "SUCCESS",
        "implementation": "coinshuffle_reference_atong01_port",
        "test_input": {"num_players": num_players, "amount": amount, "seed": seed},
        "input_addresses": [f"INPUT_{i + 1:03d}" for i in range(num_players)],
        "output_addresses_shuffled": shuffled_outputs,
        "transaction": {
            "inputs": [{"address": transaction["in"][str(i)]["addr"], "amount": amount}
                       for i in range(num_players)],
            "outputs": [{"address": transaction["out"][str(i)]["addr"], "amount": amount}
                        for i in range(num_players)],
        },
        "unlinkability": {
            "anonymity_set_size": num_players,
            "possible_input_output_mappings": math.factorial(num_players),
            "observer_can_link": False,
            "explanation": (
                f"Reference CoinShuffle protocol with {num_players} participants. "
                f"Layered (onion) encryption ensures that no single party — including "
                f"the coordinating server — sees the full input-to-output mapping."
            ),
        },
        "source": (
            "Python 3 port of coin_shuffle.py from "
            "https://github.com/atong01/coinshuffle (Alexander Tong, 2017)"
        ),
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    amt = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sd = int(sys.argv[3]) if len(sys.argv) > 3 else 42
    print(json.dumps(run_mixing_round(num_players=n, amount=amt, seed=sd), indent=2))
