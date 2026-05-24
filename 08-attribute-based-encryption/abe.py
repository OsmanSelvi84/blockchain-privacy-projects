import hashlib
import json
import os
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class PolicyNode:
    def __init__(self, kind, value=None, children=None):
        self.kind = kind
        self.value = value
        self.children = children or []

def parse_policy(policy_str):
    tokens = tokenize(policy_str)
    node, _ = parse_expr(tokens, 0)
    return node

def tokenize(s):
    tokens = []
    i = 0
    s = s.strip()
    while i < len(s):
        if s[i] == '(':
            tokens.append('(')
            i += 1
        elif s[i] == ')':
            tokens.append(')')
            i += 1
        elif s[i] == ' ':
            i += 1
        else:
            j = i
            while j < len(s) and s[j] not in ('(', ')', ' '):
                j += 1
            tokens.append(s[i:j])
            i = j
    return tokens

def parse_expr(tokens, pos):
    left, pos = parse_atom(tokens, pos)
    while pos < len(tokens) and tokens[pos] in ('AND', 'OR'):
        op = tokens[pos]
        pos += 1
        right, pos = parse_atom(tokens, pos)
        left = PolicyNode(op, children=[left, right])
    return left, pos

def parse_atom(tokens, pos):
    if tokens[pos] == '(':
        pos += 1
        node, pos = parse_expr(tokens, pos)
        pos += 1
        return node, pos
    else:
        node = PolicyNode('ATTR', value=tokens[pos])
        return node, pos + 1

def evaluate_policy(node, attributes):
    if node.kind == 'ATTR':
        return node.value in attributes
    elif node.kind == 'AND':
        return all(evaluate_policy(c, attributes) for c in node.children)
    elif node.kind == 'OR':
        return any(evaluate_policy(c, attributes) for c in node.children)
    return False

class Authority:
    def __init__(self):
        self.master_secret = secrets.token_bytes(32)
        self.public_params = {"scheme": "CP-ABE-Demo", "version": "1.0"}

    def _derive_attribute_key(self, attribute):
        return hashlib.sha256(self.master_secret + attribute.encode()).digest()

    def keygen(self, user_id, attributes):
        key_components = {}
        for attr in attributes:
            key_components[attr] = self._derive_attribute_key(attr).hex()
        return {"user_id": user_id, "attributes": sorted(attributes), "key_components": key_components}

    def get_public_params(self):
        return self.public_params

class Encryptor:
    def __init__(self, authority):
        self.authority = authority

    def encrypt(self, plaintext, policy_str):
        parse_policy(policy_str)
        sym_key = hashlib.sha256(self.authority.master_secret + policy_str.encode()).digest()
        aesgcm = AESGCM(sym_key)
        nonce = secrets.token_bytes(12)
        ct_bytes = aesgcm.encrypt(nonce, plaintext.encode(), None)
        return {"policy": policy_str, "nonce": nonce.hex(), "ciphertext": ct_bytes.hex(), "scheme": "CP-ABE-AES-GCM"}

class Decryptor:
    def __init__(self, authority):
        self.authority = authority

    def decrypt(self, ciphertext_bundle, private_key):
        policy_str = ciphertext_bundle["policy"]
        policy_tree = parse_policy(policy_str)
        user_attrs = set(private_key["attributes"])
        if not evaluate_policy(policy_tree, user_attrs):
            raise PermissionError(f"Access denied. Attributes {sorted(user_attrs)} do not satisfy policy: '{policy_str}'")
        sym_key = hashlib.sha256(self.authority.master_secret + policy_str.encode()).digest()
        aesgcm = AESGCM(sym_key)
        nonce = bytes.fromhex(ciphertext_bundle["nonce"])
        ct_bytes = bytes.fromhex(ciphertext_bundle["ciphertext"])
        return aesgcm.decrypt(nonce, ct_bytes, None).decode()

class ABESystem:
    def __init__(self):
        self.authority = Authority()
        self.encryptor = Encryptor(self.authority)
        self.decryptor = Decryptor(self.authority)

    def setup(self):
        print("=" * 55)
        print("  CP-ABE System Initialized")
        print(f"  Public Params: {self.authority.get_public_params()}")
        print("=" * 55)

    def keygen(self, user_id, attributes):
        key = self.authority.keygen(user_id, attributes)
        print(f"\n[KeyGen] User '{user_id}' | Attributes: {attributes}")
        return key

    def encrypt(self, message, policy):
        ct = self.encryptor.encrypt(message, policy)
        print(f"\n[Encrypt] Policy: '{policy}'")
        print(f"          Ciphertext: {ct['ciphertext'][:32]}...")
        return ct

    def decrypt(self, ciphertext_bundle, private_key):
        try:
            pt = self.decryptor.decrypt(ciphertext_bundle, private_key)
            print(f"\n[Decrypt] SUCCESS - Recovered: '{pt}'")
            return pt
        except PermissionError as e:
            print(f"\n[Decrypt] DENIED - {e}")
            return None

def run_demo():
    print("\nAttribute-Based Encryption (CP-ABE) - DEMO\n")
    abe = ABESystem()
    abe.setup()
    print("\n--- Scenario 1: AND Policy (Authorized) ---")
    key_alice = abe.keygen("alice", ["doctor", "hospital-A"])
    ct1 = abe.encrypt("Patient record: John Doe, Age 45", "doctor AND hospital-A")
    abe.decrypt(ct1, key_alice)
    print("\n--- Scenario 2: AND Policy (Unauthorized) ---")
    key_bob = abe.keygen("bob", ["nurse"])
    abe.decrypt(ct1, key_bob)
    print("\n--- Scenario 3: OR Policy ---")
    key_carol = abe.keygen("carol", ["admin"])
    ct2 = abe.encrypt("System config: secret-token-xyz", "(doctor AND hospital-A) OR admin")
    abe.decrypt(ct2, key_carol)
    print("\n--- Scenario 4: Complex Policy ---")
    key_dave = abe.keygen("dave", ["researcher", "university", "clearance-L2"])
    ct3 = abe.encrypt("Research dataset: classified-2024", "(researcher AND university) AND clearance-L2")
    abe.decrypt(ct3, key_dave)
    print("\n--- Scenario 5: Partial Attributes (Fail) ---")
    key_eve = abe.keygen("eve", ["researcher", "university"])
    abe.decrypt(ct3, key_eve)
    print("\nDemo complete.")

if __name__ == "__main__":
    run_demo()
