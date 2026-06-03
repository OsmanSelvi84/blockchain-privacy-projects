class DIDManager:
    def __init__(self):
        self.registry = {}
        self.history = []

    def log(self, action):
        self.history.append(action)

    def create_did(self, did, data):
        if did in self.registry:
            return {
                "message": "DID already exists",
                "active": False
            }

        self.registry[did] = {
            "data": data,
            "active": True
        }

        self.log(f"CREATE -> {did} -> {data} -> active=True")

        return {
            "message": "DID created",
            "active": True
        }

    def update_did(self, did, new_data):
        if did not in self.registry:
            return {"message": "DID not found"}

        if not self.registry[did]["active"]:
            return {"message": "DID is revoked"}

        self.registry[did]["data"] = new_data

        self.log(f"UPDATE -> {did} -> {new_data}")

        return {
            "message": "DID updated",
            "active": True
        }

    def revoke_did(self, did):
        if did not in self.registry:
            return {"message": "DID not found"}

        self.registry[did]["active"] = False

        self.log(f"REVOKE -> {did} -> active=False")

        return {
            "message": "DID revoked",
            "active": False
        }

    def resolve_did(self, did):
        if did not in self.registry:
            return {"message": "DID not found"}

        return {
            "did": did,
            "data": self.registry[did]["data"],
            "active": self.registry[did]["active"]
        }

    def list_dids(self):
        return self.registry

    def show_history(self):
        return self.history


manager = DIDManager()

while True:
    print("\n--- DID MENU ---")
    print("1. Create DID")
    print("2. Update DID")
    print("3. Revoke DID")
    print("4. Resolve DID")
    print("5. Show History")
    print("6. List All DIDs")
    print("7. Exit")

    choice = input("Choose option: ")

    if choice == "1":
        did = input("Enter DID: ")
        name = input("Enter name: ")
        result = manager.create_did(did, {"name": name})
        print(result)

    elif choice == "2":
        did = input("Enter DID: ")
        name = input("Enter new name: ")
        result = manager.update_did(did, {"name": name})
        print(result)

    elif choice == "3":
        did = input("Enter DID: ")
        result = manager.revoke_did(did)
        print(result)

    elif choice == "4":
        did = input("Enter DID: ")
        result = manager.resolve_did(did)
        print(result)

    elif choice == "5":
        print("\n--- HISTORY ---")
        for h in manager.show_history():
            print(h)

    elif choice == "6":
        print("\n--- ALL DIDs ---")
        for did, info in manager.list_dids().items():
            print(did, "->", info)

    elif choice == "7":
        print("Exiting...")
        break

    else:
        print("Invalid choice")