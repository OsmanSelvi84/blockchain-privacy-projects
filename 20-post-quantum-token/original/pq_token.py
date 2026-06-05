"""
Post-Quantum Token - Original Implementation
Student: Amirarsalan Pajouhi (220304109)
Branch:  students/220304109-amir-arsalan-pajouh
Topic:   Post-Quantum Token (Topic 20)
"""

import hashlib
from dilithium_py.dilithium import Dilithium2


class Wallet:
    def __init__(self):
        self.pk, self.sk = Dilithium2.keygen()
        self.address = "PQT-" + hashlib.sha256(self.pk).hexdigest()[:16]

    def sign(self, msg):
        return Dilithium2.sign(self.sk, msg)

    def verify(self, msg, sig):
        return Dilithium2.verify(self.pk, msg, sig)


class Transaction:
    def __init__(self, sender, recipient, amount):
        self.sender    = sender.address
        self.recipient = recipient.address
        self.amount    = amount
        msg            = f"{self.sender}{self.recipient}{self.amount}".encode()
        self.sig       = sender.sign(msg)
        self.valid     = sender.verify(msg, self.sig)


class Block:
    def __init__(self, txs, prev_hash):
        self.txs       = txs
        self.prev_hash = prev_hash
        self.nonce     = 0
        self.hash      = self._compute()

    def _compute(self):
        data = self.prev_hash + str(self.nonce) + str([(t.sender, t.recipient, t.amount) for t in self.txs])
        return hashlib.sha256(data.encode()).hexdigest()

    def mine(self):
        while not self.hash.startswith("00"):
            self.nonce += 1
            self.hash = self._compute()


class Blockchain:
    def __init__(self):
        self.chain    = [Block([], "0"*64)]
        self.balances = {}
        self.pending  = []

    def add_account(self, wallet, balance):
        self.balances[wallet.address] = balance

    def submit(self, tx):
        if not tx.valid:
            print("  [REJECTED] bad signature")
            return False
        if self.balances.get(tx.sender, 0) < tx.amount:
            print("  [REJECTED] low balance")
            return False
        self.pending.append(tx)
        print(f"  [OK] {tx.sender[:12]} -> {tx.recipient[:12]}  {tx.amount} PQT")
        return True

    def mine(self):
        b = Block(self.pending, self.chain[-1].hash)
        b.mine()
        self.chain.append(b)
        for tx in self.pending:
            self.balances[tx.sender]    -= tx.amount
            self.balances[tx.recipient]  = self.balances.get(tx.recipient, 0) + tx.amount
        self.pending = []
        print(f"  [MINED] block #{len(self.chain)-1}  nonce={b.nonce}")

    def valid(self):
        for i in range(1, len(self.chain)):
            if self.chain[i].prev_hash != self.chain[i-1].hash:
                return False
        return True


def run(inputs=None):
    print("="*50)
    print("  Post-Quantum Token - Original")
    print("="*50)

    alice = Wallet()
    bob   = Wallet()
    carol = Wallet()
    W     = [alice, bob, carol]

    chain = Blockchain()
    chain.add_account(alice, 500)
    chain.add_account(bob,   300)
    chain.add_account(carol, 200)

    print(f"\nAlice: {alice.address}")
    print(f"Bob  : {bob.address}")
    print(f"Carol: {carol.address}")

    if inputs is None:
        inputs = [(0,1,50),(1,2,30),(2,0,20),(0,2,10),(1,0,15)]

    print("\n[Transactions]")
    for s,r,a in inputs:
        chain.submit(Transaction(W[s], W[r], a))

    print("\n[Mining]")
    chain.mine()

    print("\n[Balances]")
    print(f"  Alice : {chain.balances[alice.address]}")
    print(f"  Bob   : {chain.balances[bob.address]}")
    print(f"  Carol : {chain.balances[carol.address]}")

    print(f"\n[Chain valid] : {chain.valid()}")
    print(f"[Key size]    : {len(alice.pk)} bytes")
    print(f"[Sig size]    : {len(Transaction(alice,bob,1).sig)} bytes")
    print("="*50)

    return {
        "balances"   : {"alice": chain.balances[alice.address], "bob": chain.balances[bob.address], "carol": chain.balances[carol.address]},
        "chain_valid": chain.valid(),
        "blocks"     : len(chain.chain),
        "pk_size"    : len(alice.pk),
        "sig_size"   : len(Transaction(alice,bob,1).sig),
    }


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]
    if args:
        inputs = [(int(args[i]),int(args[i+1]),float(args[i+2])) for i in range(0,len(args),3)]
        run(inputs)
    else:
        run()
