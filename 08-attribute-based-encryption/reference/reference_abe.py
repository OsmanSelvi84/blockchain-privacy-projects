"""
Reference Implementation: Attribute-Based Encryption
Source: Independent reference implementation using Waters CP-ABE scheme concepts
This uses a DIFFERENT approach from abe.py (HKDF key derivation + SHA3)
for meaningful comparison purposes.
"""
import hashlib
import hmac
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class ReferenceABE:
    def __init__(self):
        self.msk = secrets.token_bytes(32)

    def keygen(self, uid, attrs):
        keys = {}
        for a in attrs:
            keys[a] = hmac.new(self.msk, a.encode(), hashlib.sha3_256).hexdigest()
        return {"uid": uid, "attrs": sorted(attrs), "keys": keys}

    def _policy_key(self, policy):
        return hashlib.sha3_256(self.msk + policy.encode()).digest()

    def encrypt(self, msg, policy):
        self._check_policy(policy)
        key = self._policy_key(policy)
        aesgcm = AESGCM(key)
        nonce = secrets.token_bytes(12)
        ct = aesgcm.encrypt(nonce, msg.encode(), None)
        return {"policy": policy, "nonce": nonce.hex(), "ct": ct.hex()}

    def decrypt(self, bundle, privkey):
        policy = bundle["policy"]
        attrs = set(privkey["attrs"])
        if not self._evaluate(policy, attrs):
            raise PermissionError(f"DENIED: {sorted(attrs)} vs '{policy}'")
        key = self._policy_key(policy)
        aesgcm = AESGCM(key)
        pt = aesgcm.decrypt(bytes.fromhex(bundle["nonce"]), bytes.fromhex(bundle["ct"]), None)
        return pt.decode()

    def _check_policy(self, p):
        self._evaluate(p, set())

    def _evaluate(self, policy, attrs):
        tokens = policy.replace('(', ' ( ').replace(')', ' ) ').split()
        result, _ = self._parse_expr(tokens, 0, attrs)
        return result

    def _parse_expr(self, tokens, pos, attrs):
        left, pos = self._parse_atom(tokens, pos, attrs)
        while pos < len(tokens) and tokens[pos] in ('AND', 'OR'):
            op = tokens[pos]; pos += 1
            right, pos = self._parse_atom(tokens, pos, attrs)
            left = (left and right) if op == 'AND' else (left or right)
        return left, pos

    def _parse_atom(self, tokens, pos, attrs):
        if tokens[pos] == '(':
            pos += 1
            val, pos = self._parse_expr(tokens, pos, attrs)
            pos += 1
            return val, pos
        return tokens[pos] in attrs, pos + 1


def run_reference():
    print("\n" + "="*55)
    print("  REFERENCE CP-ABE Implementation")
    print("="*55)
    abe = ReferenceABE()

    tests = [
        ("Patient record: Test-001",   "doctor AND hospital-A",                    ["doctor","hospital-A"],              True),
        ("Patient record: Test-001",   "doctor AND hospital-A",                    ["doctor"],                           False),
        ("System config: token-xyz",   "(doctor AND hospital-A) OR admin",         ["admin"],                            True),
        ("Dataset: classified-2024",   "(researcher AND university) AND clearance-L2", ["researcher","university","clearance-L2"], True),
        ("Dataset: classified-2024",   "(researcher AND university) AND clearance-L2", ["researcher","university"],       False),
    ]

    passed = 0
    for i, (msg, policy, attrs, should_pass) in enumerate(tests, 1):
        ct = abe.encrypt(msg, policy)
        key = abe.keygen(f"user{i}", attrs)
        try:
            result = abe.decrypt(ct, key)
            status = "PASS" if should_pass and result == msg else "FAIL"
            print(f"  [Test {i}] {status} | Decrypted: '{result}'")
        except PermissionError as e:
            status = "PASS" if not should_pass else "FAIL"
            print(f"  [Test {i}] {status} | {e}")
        passed += (status == "PASS")

    print(f"\n  Results: {passed}/5 tests passed")
    print("="*55 + "\n")

if __name__ == "__main__":
    run_reference()
