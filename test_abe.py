"""
Unit tests for the CP-ABE implementation.
Run with:  python3 -m unittest test_abe -v
"""
import unittest
import abe
from abe import attr, AND, OR, THRESHOLD


class TestABE(unittest.TestCase):

    def setUp(self):
        self.universe = ["doctor", "nurse", "cardiology", "admin", "research", "intern"]
        self.authority = abe.ABEAuthority(self.universe)
        self.message = b"Patient record: blood pressure 120/80, no allergies."


    def test_shamir_roundtrip_and(self):
        shares = abe.split_secret(12345, k=3, n=3)
        pts = [(i + 1, y) for i, y in enumerate(shares)]
        self.assertEqual(abe.reconstruct_secret(pts), 12345)

    def test_shamir_threshold_any_k(self):
        shares = abe.split_secret(999, k=2, n=4)
        pts = [(1, shares[0]), (4, shares[3])]
        self.assertEqual(abe.reconstruct_secret(pts), 999)


    def test_single_attribute_grant_and_deny(self):
        policy = attr("doctor")
        ct = abe.encrypt(self.authority, policy, self.message)

        doctor = self.authority.keygen(["doctor"])
        nurse = self.authority.keygen(["nurse"])

        self.assertEqual(abe.decrypt(doctor, ct), self.message)
        self.assertIsNone(abe.decrypt(nurse, ct))


    def test_and_policy_requires_all(self):
        policy = AND(attr("doctor"), attr("cardiology"))
        ct = abe.encrypt(self.authority, policy, self.message)

        full = self.authority.keygen(["doctor", "cardiology"])
        partial = self.authority.keygen(["doctor"])

        self.assertEqual(abe.decrypt(full, ct), self.message)
        self.assertIsNone(abe.decrypt(partial, ct))

    def test_or_policy_any_one(self):
        policy = OR(attr("admin"), attr("doctor"))
        ct = abe.encrypt(self.authority, policy, self.message)

        self.assertEqual(abe.decrypt(self.authority.keygen(["admin"]), ct), self.message)
        self.assertEqual(abe.decrypt(self.authority.keygen(["doctor"]), ct), self.message)
        self.assertIsNone(abe.decrypt(self.authority.keygen(["nurse"]), ct))


    def test_nested_policy(self):

        policy = AND(attr("doctor"), OR(attr("cardiology"), attr("admin")))
        ct = abe.encrypt(self.authority, policy, self.message)

        ok1 = self.authority.keygen(["doctor", "cardiology"])
        ok2 = self.authority.keygen(["doctor", "admin"])
        bad = self.authority.keygen(["doctor"])

        self.assertEqual(abe.decrypt(ok1, ct), self.message)
        self.assertEqual(abe.decrypt(ok2, ct), self.message)
        self.assertIsNone(abe.decrypt(bad, ct))

    def test_threshold_k_of_n(self):

        policy = THRESHOLD(2, attr("doctor"), attr("nurse"), attr("research"))
        ct = abe.encrypt(self.authority, policy, self.message)

        self.assertEqual(abe.decrypt(self.authority.keygen(["doctor", "research"]), ct),
                         self.message)
        self.assertIsNone(abe.decrypt(self.authority.keygen(["doctor"]), ct))


    def test_unknown_attribute_rejected(self):
        with self.assertRaises(ValueError):
            self.authority.keygen(["doctor", "hacker"])


    def test_serialisation_roundtrip(self):
        policy = AND(attr("doctor"), attr("cardiology"))
        ct = abe.encrypt(self.authority, policy, self.message)
        restored = abe.loads(abe.dumps(ct))
        key = self.authority.keygen(["doctor", "cardiology"])
        self.assertEqual(abe.decrypt(key, restored), self.message)


if __name__ == "__main__":
    unittest.main(verbosity=2)
