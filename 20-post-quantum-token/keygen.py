import oqs
import json
import os

def generate_keypair(name):
    with oqs.Signature("ML-DSA-65") as signer:
        public_key = signer.generate_keypair()
        secret_key = signer.export_secret_key()
    
    keys = {
        "name": name,
        "public_key": public_key.hex(),
        "secret_key": secret_key.hex()
    }
    
    os.makedirs("keys", exist_ok=True)
    with open(f"keys/{name}.json", "w") as f:
        json.dump(keys, f)
    
    print(f"[+] {name} için anahtar çifti oluşturuldu.")
    return keys

if __name__ == "__main__":
    generate_keypair("Alice")
    generate_keypair("Bob")
    generate_keypair("Charlie")
