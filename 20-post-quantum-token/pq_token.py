import oqs
import json
import hashlib
import os

LEDGER_FILE = "ledger.json"

def hash_block(block):
    block_str = json.dumps(block, sort_keys=True)
    return hashlib.sha256(block_str.encode()).hexdigest()

def load_ledger():
    try:
        with open(LEDGER_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        genesis = {
            "index": 0,
            "from": "SYSTEM",
            "to": "SYSTEM",
            "amount": 0,
            "previous_hash": "0" * 64,
            "signature": "genesis"
        }
        return {
            "balances": {"Alice": 100, "Bob": 50, "Charlie": 30},
            "chain": [genesis]
        }

def save_ledger(ledger):
    with open(LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2)

def load_keys(name):
    with open(f"keys/{name}.json", "r") as f:
        return json.load(f)

def transfer(sender, receiver, amount):
    ledger = load_ledger()
    if ledger["balances"].get(sender, 0) < amount:
        print(f"[-] HATA: {sender} yetersiz bakiye!")
        return False

    previous_block = ledger["chain"][-1]
    previous_hash = hash_block(previous_block)

    message = f"{sender}->{receiver}:{amount}:{previous_hash}".encode()
    keys = load_keys(sender)
    secret_key = bytes.fromhex(keys["secret_key"])
    sig = oqs.Signature("ML-DSA-65", secret_key)
    signature = sig.sign(message)

    public_key = bytes.fromhex(keys["public_key"])
    with oqs.Signature("ML-DSA-65") as verifier:
        is_valid = verifier.verify(message, signature, public_key)

    if is_valid:
        new_block = {
            "index": len(ledger["chain"]),
            "from": sender,
            "to": receiver,
            "amount": amount,
            "previous_hash": previous_hash,
            "signature": signature.hex()[:32] + "..."
        }
        ledger["chain"].append(new_block)
        ledger["balances"][sender] -= amount
        ledger["balances"][receiver] = ledger["balances"].get(receiver, 0) + amount
        save_ledger(ledger)
        print(f"[+] Transfer onaylandi: {sender} -> {receiver} : {amount} token")
        print(f"    Block #{new_block['index']} | prev_hash: {previous_hash[:16]}...")
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

def show_chain():
    ledger = load_ledger()
    print("\n=== Blockchain ===")
    for block in ledger["chain"]:
        print(f"  Block #{block['index']} | {block['from']} -> {block['to']} : {block['amount']} | prev: {block['previous_hash'][:16]}...")
    print()

if __name__ == "__main__":
    if os.path.exists(LEDGER_FILE):
        os.remove(LEDGER_FILE)
    show_balances()
    transfer("Alice", "Bob", 10)
    transfer("Bob", "Charlie", 5)
    show_balances()
    show_chain()
