import sys
import random
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.fernet import Fernet


def generate_keypair():
    priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return priv


def public_key(keypair):
    return keypair.public_key()


def encrypt(pubkey, plaintext: bytes) -> bytes:
    aes_key = Fernet.generate_key()
    enc_payload = Fernet(aes_key).encrypt(plaintext)
    enc_key = pubkey.encrypt(
        aes_key,
        padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    return len(enc_key).to_bytes(4, "big") + enc_key + enc_payload


def decrypt(keypair, ciphertext: bytes) -> bytes:
    klen = int.from_bytes(ciphertext[:4], "big")
    enc_key = ciphertext[4:4 + klen]
    enc_payload = ciphertext[4 + klen:]
    aes_key = keypair.decrypt(
        enc_key,
        padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
    )
    return Fernet(aes_key).decrypt(enc_payload)


class CoinShuffleServer:
    def __init__(self):
        self.keys = []
        self.peers = []
        self.started = False

    def submit_public_key(self, ek, address):
        self.keys.append(ek)
        self.peers.append(address)

    def get_keys(self):
        return self.keys

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


class CoinShuffleClient:
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
        self.server = server
        self.start_called = False
        self.rng = rng
        self._next_client = None
        self._final_transaction = None
        self.server.submit_public_key(self.ek, self.addr)

    def set_next(self, client):
        self._next_client = client

    def start(self, peers, order):
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
        if self.index == 0:
            self.perform_shuffle({}, {})

    def _find_index(self, order):
        for i, ek in order.items():
            if self.ek == ek:
                return i
        return -1

    def _shuffle_data(self, data):
        values = [data[k] for k in data.keys()]
        self.rng.shuffle(values)
        return {str(i): values[i] for i in range(len(values))}

    def _decrypt_data(self, data):
        new_data = {}
        for i, v in data.items():
            vp = dict(v)
            vp["target"] = decrypt(self.keypair, v["target"])
            new_data[i] = vp
        return new_data

    def _encrypt_dest(self):
        t = self.hidden_target
        for i in range(self.num_peers - 1, self.index, -1):
            t = encrypt(self.order[i], t)
        return t

    def perform_shuffle(self, sources, data):
        assert self.index == len(data)
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
            self._next_client.perform_shuffle(sources, data)

    def construct_transactions(self, sources, data):
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


def run_mixing_round(num_players=4, amount=1, seed=42):
    rng = random.Random(seed)
    server = CoinShuffleServer()

    harfler = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")[:num_players]
    giris_etiketleri = harfler[:]
    rng.shuffle(giris_etiketleri)

    cikis_etiketleri = harfler[:]
    while any(c == g for c, g in zip(cikis_etiketleri, giris_etiketleri)):
        rng.shuffle(cikis_etiketleri)

    clients = []
    for i in range(num_players):
        pid = f"P{i + 1}"
        source = f"INPUT_{giris_etiketleri[i]}"
        target = f"OUTPUT_{cikis_etiketleri[i]}"
        c = CoinShuffleClient(
            addr=pid,
            source=source,
            hidden_target=target.encode(),
            server=server,
            rng=rng,
        )
        c.amount = amount
        clients.append(c)

    for i in range(len(clients) - 1):
        clients[i].set_next(clients[i + 1])

    response, ok = server.start()
    assert ok
    peers_map = response["peers"]
    order_map = response["order"]

    for c in clients:
        c.start(peers_map, order_map)
    clients[0].kick_off()

    transaction = clients[-1]._final_transaction

    print(f"\n  {'Slot':<6} {'Kaynak (INPUT)':<18} {'Hedef (OUTPUT)':<18} {'Geçerli?'}")
    print(f"  {'-'*54}")
    for i in range(num_players):
        src = transaction["in"][str(i)]["addr"]
        tgt = transaction["out"][str(i)]["addr"]
        print(f"  {i:<6} {src:<18} {tgt:<18} ✓")
    print()


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    amt = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sd = int(sys.argv[3]) if len(sys.argv) > 3 else 42
    run_mixing_round(num_players=n, amount=amt, seed=sd)
