from dilithium_py.ml_dsa import ML_DSA_65
import json
import os

LEDGER_FILE = "ref_ledger.json"

def load_ledger():
    try:
        with open(LEDGER_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"balances": {"Alice": 100, "Bob": 50, "Charlie": 30}}

def save_ledger(ledger):
    with open(LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2)

def reset_ledger():
    if os.path.exists(LEDGER_FILE):
        os.remove(LEDGER_FILE)

def transfer(sender, receiver, amount, keys):
    ledger = load_ledger()
    if ledger["balances"].get(sender, 0) < amount:
        print(f"[-] HATA: {sender} yetersiz bakiye!")
        return False
    message = f"{sender}->{receiver}:{amount}".encode()
    pk, sk = keys[sender]
    signature = ML_DSA_65.sign(sk, message)
    is_valid = ML_DSA_65.verify(pk, message, signature)
    if is_valid:
        ledger["balances"][sender] -= amount
        ledger["balances"][receiver] = ledger["balances"].get(receiver, 0) + amount
        save_ledger(ledger)
        print(f"[+] Transfer onaylandi: {sender} -> {receiver} : {amount} token")
        return True
    else:
        print(f"[-] HATA: Gecersiz imza!")
        return False

def show_balances():
    ledger = load_ledger()
    print("\n=== Bakiyeler ===")
    for name, balance in ledger["balances"].items():
        print(f"  {name}: {balance} token")
    print()

# Anahtar çiftleri oluştur
print("Anahtar çiftleri olusturuluyor...")
keys = {
    "Alice": ML_DSA_65.keygen(),
    "Bob": ML_DSA_65.keygen(),
    "Charlie": ML_DSA_65.keygen()
}
print("Hazir.\n")

print("=" * 50)
print("TEST 1: Normal transfer")
print("=" * 50)
reset_ledger()
show_balances()
transfer("Alice", "Bob", 20, keys)
show_balances()

print("=" * 50)
print("TEST 2: Yetersiz bakiye")
print("=" * 50)
reset_ledger()
transfer("Charlie", "Alice", 999, keys)

print("=" * 50)
print("TEST 3: Zincir transfer")
print("=" * 50)
reset_ledger()
transfer("Alice", "Bob", 10, keys)
transfer("Bob", "Charlie", 10, keys)
transfer("Charlie", "Alice", 5, keys)
show_balances()

print("=" * 50)
print("TEST 4: Sahte imza denemesi")
print("=" * 50)
reset_ledger()
message = b"Alice->Bob:50"
fake_sig = b"sahte_imza" * 10
pk, sk = keys["Alice"]
try:
    is_valid = ML_DSA_65.verify(pk, message, fake_sig)
    print(f"[-] Sahte imza sonucu: {is_valid}")
except Exception:
    print("[+] Sahte imza reddedildi! Sistem guvenli.")

print("=" * 50)
print("TEST 5: Coklu kullanici transferi")
print("=" * 50)
reset_ledger()
transfer("Alice", "Bob", 15, keys)
transfer("Alice", "Charlie", 25, keys)
transfer("Bob", "Charlie", 10, keys)
show_balances()
