import hashlib
import json
import random
from pathlib import Path

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

from pyring.sc25519 import Scalar
from pyring.ge import Point
from pyring.one_time import PrivateKey, ring_sign, ring_verify
from pyring.serialize import export_pem, import_pem


BASE_DIR = Path(__file__).resolve().parent
REFERENCE_DIR = BASE_DIR.parent / "reference_implementation" / "pyring"


def cryptography_private_to_scalar(private_key):
    return Scalar(
        private_key.private_bytes(
            serialization.Encoding.Raw,
            serialization.PrivateFormat.Raw,
            serialization.NoEncryption(),
        )
    )


def cryptography_public_to_point(public_key):
    return Point(
        public_key.public_bytes(
            serialization.Encoding.Raw,
            serialization.PublicFormat.Raw,
        )
    )


class AnonymousRingMessaging:
    def __init__(self):
        self.private_key_path = REFERENCE_DIR / "ringkey"
        self.public_key_paths = [
            REFERENCE_DIR / "ringkey.pub",
            REFERENCE_DIR / "bobkey.pub",
        ]
        self.password = b"1234"
        self.signature_path = BASE_DIR / "signature.pem"
        self.metadata_path = BASE_DIR / "signature_metadata.json"

    def load_private_key(self):
        with open(self.private_key_path, "rb") as file:
            return serialization.load_pem_private_key(
                file.read(),
                self.password,
                default_backend()
            )

    def load_public_keys(self):
        public_keys = []

        for path in self.public_key_paths:
            with open(path, "rb") as file:
                public_key = serialization.load_pem_public_key(
                    file.read(),
                    default_backend()
                )
                public_keys.append(public_key)

        return public_keys

    def sign_message(self, message):
        message_bytes = message.encode()

        private_key = self.load_private_key()
        signer_private_scalar = cryptography_private_to_scalar(private_key)

        public_keys = [
            cryptography_public_to_point(pk)
            for pk in self.load_public_keys()
        ]

        signer_public_key = PrivateKey(signer_private_scalar).public_key().point

        if signer_public_key not in public_keys:
            raise ValueError("Signer public key is not in the ring.")

        random.SystemRandom().shuffle(public_keys)
        signer_index = public_keys.index(signer_public_key)

        ring_signature = ring_sign(
            message_bytes,
            public_keys,
            signer_private_scalar,
            signer_index
        )

        pem_signature = export_pem(ring_signature)

        with open(self.signature_path, "w") as file:
            file.write(pem_signature)

        metadata = {
            "message": message,
            "message_hash": hashlib.sha256(message_bytes).hexdigest(),
            "signature_file": "signature.pem",
            "ring_size": len(public_keys),
            "verification_result": "not verified yet",
            "privacy_note": "Signer identity is not stored. The verifier only checks that one ring member signed the message."
        }

        with open(self.metadata_path, "w") as file:
            json.dump(metadata, file, indent=4)

        return metadata

    def verify_message(self):
        if not self.signature_path.exists() or not self.metadata_path.exists():
            return False, None

        with open(self.metadata_path, "r") as file:
            metadata = json.load(file)

        message_bytes = metadata["message"].encode()

        with open(self.signature_path, "r") as file:
            ring_signature = import_pem(file.read())

        is_valid = ring_verify(message_bytes, ring_signature)

        metadata["verification_result"] = "valid" if is_valid else "invalid"

        with open(self.metadata_path, "w") as file:
            json.dump(metadata, file, indent=4)

        return is_valid, metadata
