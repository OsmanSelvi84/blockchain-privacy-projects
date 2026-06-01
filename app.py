class DIDManager:
    def __init__(self):
        self.registry = {}

    def create_did(self, did, data):
        if did in self.registry:
            return "DID already exists"
        self.registry[did] = {
            "data": data,
            "active": True
        }
        return "DID created"

    def update_did(self, did, new_data):
        if did not in self.registry:
            return "DID not found"
        if not self.registry[did]["active"]:
            return "DID is revoked"
        self.registry[did]["data"] = new_data
        return "DID updated"

    def revoke_did(self, did):
        if did not in self.registry:
            return "DID not found"
        self.registry[did]["active"] = False
        return "DID revoked"

    def resolve_did(self, did):
        if did not in self.registry:
            return "DID not found"
        return self.registry[did]


# test
manager = DIDManager()

print(manager.create_did("did:001", {"name": "Suden"}))
print(manager.resolve_did("did:001"))
print(manager.update_did("did:001", {"name": "Suden Bakan"}))
print(manager.resolve_did("did:001"))
print(manager.revoke_did("did:001"))
print(manager.resolve_did("did:001"))