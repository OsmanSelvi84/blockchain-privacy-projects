import sys
from abe import ABESystem

PASS = "PASS"
FAIL = "FAIL"

def run_test(name, result, expected):
    status = PASS if result == expected else FAIL
    print(f"  {status} | {name}")
    return result == expected

def test_suite():
    print("\n" + "=" * 55)
    print("  CP-ABE Test Suite - 5 Evaluation Cases")
    print("=" * 55)
    abe = ABESystem()
    passed = 0

    print("\n[Test 1] AND Policy - Authorized User")
    message = "Confidential patient record: Test-001"
    key = abe.authority.keygen("user1", ["doctor", "hospital-A"])
    ct = abe.encryptor.encrypt(message, "doctor AND hospital-A")
    try:
        result = abe.decryptor.decrypt(ct, key)
        passed += run_test("Decryption succeeds", result, message)
    except PermissionError:
        passed += run_test("Decryption succeeds", None, message)

    print("\n[Test 2] AND Policy - Unauthorized")
    key2 = abe.authority.keygen("user2", ["doctor"])
    try:
        abe.decryptor.decrypt(ct, key2)
        passed += run_test("Decryption blocked", False, True)
    except PermissionError:
        passed += run_test("Decryption blocked (PermissionError)", True, True)

    print("\n[Test 3] OR Policy - Second Branch")
    message3 = "System config: token-OR-branch-test"
    key3 = abe.authority.keygen("user3", ["admin"])
    ct3 = abe.encryptor.encrypt(message3, "(doctor AND hospital-A) OR admin")
    try:
        result3 = abe.decryptor.decrypt(ct3, key3)
        passed += run_test("OR branch decryption succeeds", result3, message3)
    except PermissionError:
        passed += run_test("OR branch decryption succeeds", None, message3)

    print("\n[Test 4] 3-Attribute AND Policy - Authorized")
    message4 = "Dataset: classified-research-2024"
    key4 = abe.authority.keygen("user4", ["researcher", "university", "clearance-L2"])
    ct4 = abe.encryptor.encrypt(message4, "(researcher AND university) AND clearance-L2")
    try:
        result4 = abe.decryptor.decrypt(ct4, key4)
        passed += run_test("3-attribute decryption succeeds", result4, message4)
    except PermissionError:
        passed += run_test("3-attribute decryption succeeds", None, message4)

    print("\n[Test 5] 3-Attribute AND Policy - Partial (Fail)")
    key5 = abe.authority.keygen("user5", ["researcher", "university"])
    try:
        abe.decryptor.decrypt(ct4, key5)
        passed += run_test("Partial attributes blocked", False, True)
    except PermissionError:
        passed += run_test("Partial attributes blocked (PermissionError)", True, True)

    print("\n" + "=" * 55)
    print(f"  Results: {passed}/5 tests passed")
    print("=" * 55 + "\n")
    return passed == 5

if __name__ == "__main__":
    success = test_suite()
    sys.exit(0 if success else 1)
