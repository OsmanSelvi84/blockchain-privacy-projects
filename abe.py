from __future__ import annotations
import hashlib
import hmac
import secrets
import json
from typing import Optional


PRIME = 2**521 - 1
SECRET_BYTES = 66


def _poly_eval(coeffs: list[int], x: int) -> int:
    result = 0
    for c in reversed(coeffs):
        result = (result * x + c) % PRIME
    return result


def split_secret(secret: int, k: int, n: int) -> list[int]:
    coeffs = [secret % PRIME] + [secrets.randbelow(PRIME) for _ in range(k - 1)]
    return [_poly_eval(coeffs, i + 1) for i in range(n)]


def reconstruct_secret(points: list[tuple[int, int]]) -> int:
    total = 0
    for j, (xj, yj) in enumerate(points):
        num, den = 1, 1
        for m, (xm, _) in enumerate(points):
            if m == j:
                continue
            num = (num * (-xm)) % PRIME
            den = (den * (xj - xm)) % PRIME
        lagrange = (num * pow(den, -1, PRIME)) % PRIME
        total = (total + yj * lagrange) % PRIME
    return total


def _attribute_secret(master_key: bytes, attribute: str) -> bytes:
    return hmac.new(master_key, ("attr|" + attribute).encode(), hashlib.sha256).digest()


def _mask(attr_secret: bytes, path: str) -> int:
    h = hashlib.sha256(attr_secret + b"|" + path.encode()).digest()
    return int.from_bytes(h * 3, "big") % PRIME


class ABEAuthority:
    def __init__(self, attribute_universe: list[str]):
        self.master_key = secrets.token_bytes(32)

        self.attribute_universe = set(attribute_universe)

    def validate_attributes(self, attributes: list[str]) -> None:
        unknown = [a for a in attributes if a not in self.attribute_universe]
        if unknown:
            raise ValueError(f"Unknown / unauthorised attribute(s): {unknown}")

    def keygen(self, attributes: list[str]) -> "UserKey":
        self.validate_attributes(attributes)
        keys = {a: _attribute_secret(self.master_key, a) for a in attributes}
        return UserKey(attributes=set(attributes), attribute_keys=keys)

    def attribute_secret(self, attribute: str) -> bytes:
        return _attribute_secret(self.master_key, attribute)


class UserKey:
    def __init__(self, attributes: set[str], attribute_keys: dict[str, bytes]):
        self.attributes = attributes
        self.attribute_keys = attribute_keys


def attr(name: str) -> dict:
    return {"attribute": name}

def AND(*children: dict) -> dict:
    return {"gate": "THRESHOLD", "k": len(children), "children": list(children)}

def OR(*children: dict) -> dict:
    return {"gate": "THRESHOLD", "k": 1, "children": list(children)}

def THRESHOLD(k: int, *children: dict) -> dict:
    return {"gate": "THRESHOLD", "k": k, "children": list(children)}


def _derive_keys(s: int) -> tuple[bytes, bytes]:
    K = hashlib.sha256(b"ABE-KDF|" + s.to_bytes(SECRET_BYTES, "big")).digest()
    enc_key = hashlib.sha256(b"ENC|" + K).digest()
    mac_key = hashlib.sha256(b"MAC|" + K).digest()
    return enc_key, mac_key

def _keystream(enc_key: bytes, nonce: bytes, length: int) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < length:
        out += hashlib.sha256(enc_key + nonce + counter.to_bytes(8, "big")).digest()
        counter += 1
    return bytes(out[:length])

def _sym_encrypt(s: int, plaintext: bytes) -> dict:
    enc_key, mac_key = _derive_keys(s)
    nonce = secrets.token_bytes(16)
    ks = _keystream(enc_key, nonce, len(plaintext))
    ct = bytes(p ^ k for p, k in zip(plaintext, ks))
    tag = hmac.new(mac_key, nonce + ct, hashlib.sha256).digest()
    return {"nonce": nonce.hex(), "tag": tag.hex(), "data": ct.hex()}

def _sym_decrypt(s: int, blob: dict) -> Optional[bytes]:
    enc_key, mac_key = _derive_keys(s)
    nonce = bytes.fromhex(blob["nonce"])
    ct = bytes.fromhex(blob["data"])
    expected = hmac.new(mac_key, nonce + ct, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, bytes.fromhex(blob["tag"])):
        return None
    ks = _keystream(enc_key, nonce, len(ct))
    return bytes(c ^ k for c, k in zip(ct, ks))


def _share_tree(node: dict, node_secret: int, authority: ABEAuthority,
                path: str, leaves: dict) -> None:
    if "attribute" in node:
        a = node["attribute"]
        blind = (node_secret + _mask(authority.attribute_secret(a), path)) % PRIME
        leaves[path] = {"attribute": a, "blind": blind}
        return
    children = node["children"]
    shares = split_secret(node_secret, node["k"], len(children))
    for i, child in enumerate(children):
        _share_tree(child, shares[i], authority, f"{path}.{i}", leaves)


def encrypt(authority: ABEAuthority, policy: dict, plaintext: bytes) -> dict:
    s = secrets.randbelow(PRIME)
    leaves: dict = {}
    _share_tree(policy, s, authority, "0", leaves)
    blob = _sym_encrypt(s, plaintext)
    return {"policy": policy, "leaves": leaves, **blob}


def _recover_tree(node: dict, path: str, user: UserKey, leaves: dict) -> Optional[int]:
    if "attribute" in node:
        a = node["attribute"]
        if a not in user.attribute_keys:
            return None
        blind = leaves[path]["blind"]
        return (blind - _mask(user.attribute_keys[a], path)) % PRIME
    children = node["children"]
    recovered: list[tuple[int, int]] = []
    for i, child in enumerate(children):
        val = _recover_tree(child, f"{path}.{i}", user, leaves)
        if val is not None:
            recovered.append((i + 1, val))
    if len(recovered) < node["k"]:
        return None
    return reconstruct_secret(recovered[: node["k"]])


def decrypt(user: UserKey, ciphertext: dict) -> Optional[bytes]:
    s = _recover_tree(ciphertext["policy"], "0", user, ciphertext["leaves"])
    if s is None:
        return None
    return _sym_decrypt(s, ciphertext)


def dumps(ciphertext: dict) -> str:
    return json.dumps(ciphertext)

def loads(text: str) -> dict:
    return json.loads(text)
