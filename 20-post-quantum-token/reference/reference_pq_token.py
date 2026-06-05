"""
Post-Quantum Token - Reference Implementation
Based on: https://github.com/SnowVelda/pqc-dilithium-poc
Student:  Amirarsalan Pajouhi (220304109)
"""

import hashlib
from dilithium_py.dilithium import Dilithium2


class RefWallet:
    def __init__(self, name):
        self.name = name
        self.pk, self.sk = Dilithium2.keygen()
        self.address = "REF-" + hashlib.sha256(self.pk).hexdigest()[:16].upper()

    def sign(self, data):
        return Dilithium2.sign(self.sk, data)

    @staticmethod
    def verify(pk, data, sig):
        try:
            return Dilithium2.verify(pk, data, sig)
        except Exception:
            return False


class RefTransaction:
    def __init__(self, sender, recipient_addr, amount):
        self.sender_addr = sender.address
        self.sender_pk   = sender.pk
        self.recipient   = recipient_addr
        self.amount      = amount
        msg              = f"{self.sender_addr}{self.recipient}{self.amount}".encode()
        self.sig         = sender.sign(msg)
        self.valid       = RefWallet.verify(sender.pk, msg, self.sig)


class RefBlock:
    def __init__(self, txs, prev_hash):
        self.txs       = txs
        self.prev_hash = prev_hash
        self.nonce     = 0
        self.hash      = self._compute()

    def _compute(self):
        data = self.prev_hash + str(self.nonce) + str([(t.sender_addr, t.recipient, t.amount) for t in self.txs])
        return hashlib.sha256(data.encode()).hexdigest()

    def mine(self):
        while not self.hash.startswith("00"):
            self.nonce += 1
            self.hash = self._compute()


class RefChain:
    def __init__(self):
        self.blocks  = [RefBlock([], "0"*64)]
        self.ledger  = {}
        self.mempool = []

    def add_account(self, addr, balance):
        self.ledger[addr] = balance

    def add_tx(self, tx):
        if not tx.valid:
            print(f"  [SKIP] bad signature")
            return False
        if self.ledger.get(tx.sender_addr, 0) < tx.amount:
            print(f"  [SKIP] low balance")
            return False
        self.mempool.append(tx)
        print(f"  [OK] {tx.sender_addr[:12]} -> {tx.recipient[:12]}  {tx.amount}")
        return True

    def commit(self):
        b = RefBlock(self.mempool, self.blocks[-1].hash)
        b.mine()
        self.blocks.append(b)
        for tx in self.mempool:
            self.ledger[tx.sender_addr]  -= tx.amount
            self.ledger[tx.recipient]     = self.ledger.get(tx.recipient, 0) + tx.amount
        self.mempool = []
        print(f"  [BLOCK] #{len(self.blocks)-1}  nonce={b.nonce}")

    def check(self):
        for i in range(1, len(self.blocks)):
            if self.blocks[i].prev_hash != self.blocks[i-1].hash:
                return False
        return True


def run_reference(inputs=None):
    print("="*50)
    print("  Post-Quantum Token - Reference")
    print("="*50)

    alice = RefWallet("Alice")
    bob   = RefWallet("Bob")
    carol = RefWallet("Carol")
    W     = [alice, bob, carol]

    chain = RefChain()
    chain.add_account(alice.address, 500)
    chain.add_account(bob.address,   300)
    chain.add_account(carol.address, 200)

    print(f"\nAlice: {alice.address}")
    print(f"Bob  : {bob.address}")
    print(f"Carol: {carol.address}")

    if inputs is None:
        inputs = [(0,1,50),(1,2,30),(2,0,20),(0,2,10),(1,0,15)]

    print("\n[Transactions]")
    for s,r,a in inputs:
        chain.add_tx(RefTransaction(W[s], W[r].address, a))

    print("\n[Mining]")
    chain.commit()

    print("\n[Balances]")
    print(f"  Alice : {chain.ledger[alice.address]}")
    print(f"  Bob   : {chain.ledger[bob.address]}")
    print(f"  Carol : {chain.ledger[carol.address]}")

    print(f"\n[Chain valid] : {chain.check()}")
    print(f"[Key size]    : {len(alice.pk)} bytes")
    sig_size = len(RefTransaction(alice, bob.address, 1).sig)
    print(f"[Sig size]    : {sig_size} bytes")
    print("="*50)

    return {
        "balances"   : {"alice": chain.ledger[alice.address], "bob": chain.ledger[bob.address], "carol": chain.ledger[carol.address]},
        "chain_valid": chain.check(),
        "blocks"     : len(chain.blocks),
        "pk_size"    : len(alice.pk),
        "sig_size"   : sig_size,
    }


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]
    if args:
        inputs = [(int(args[i]),int(args[i+1]),float(args[i+2])) for i in range(0,len(args),3)]
        run_reference(inputs)
    else:
        run_reference()
