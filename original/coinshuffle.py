import hashlib
import random
from dataclasses import dataclass


@dataclass
class Participant:
    name: str
    input_address: str
    output_address: str
    amount: float


class MixingPool:
    def __init__(self):
        self.participants = []

    def add_participant(self, participant):
        self.participants.append(participant)

    def size(self):
        return len(self.participants)


def hash_address(address):
    return hashlib.sha256(address.encode()).hexdigest()


def validate_pool(pool):
    if pool.size() < 3:
        raise ValueError(
            "Mixing pool must contain at least 3 participants."
        )

    amounts = {p.amount for p in pool.participants}

    if len(amounts) != 1:
        raise ValueError(
            "All participants must use the same denomination."
        )


def create_shuffle_transaction(pool):
    validate_pool(pool)

    outputs = [p.output_address for p in pool.participants]
    random.shuffle(outputs)

    result = []

    for participant, output in zip(pool.participants, outputs):
        result.append({
            "participant": participant.name,
            "input": participant.input_address,
            "output": output,
            "valid": "yes"
        })

    return result


def print_transaction(transaction):
    print("\n============================================================")
    print("FINAL MIXED TRANSACTION")
    print("============================================================\n")

    print(
        f"{'Slot':<5} {'Input Address':<20} "
        f"{'Output Address':<25} {'Valid'}"
    )
    print("-" * 65)

    for i, tx in enumerate(transaction):
        print(
            f"{i:<5} "
            f"{tx['input']:<20} "
            f"{tx['output']:<25} "
            f"{tx['valid']}"
        )

    print("\nPrivacy Goal:")
    print(
        "Break the direct link between input addresses and output addresses."
    )


if __name__ == "__main__":

    pool = MixingPool()

    pool.add_participant(
        Participant(
            "User1",
            "wallet_input_A",
            "wallet_output_A_private",
            1.0
        )
    )

    pool.add_participant(
        Participant(
            "User2",
            "wallet_input_B",
            "wallet_output_B_private",
            1.0
        )
    )

    pool.add_participant(
        Participant(
            "User3",
            "wallet_input_C",
            "wallet_output_C_private",
            1.0
        )
    )

    pool.add_participant(
        Participant(
            "User4",
            "wallet_input_D",
            "wallet_output_D_private",
            1.0
        )
    )

    pool.add_participant(
        Participant(
            "User5",
            "wallet_input_E",
            "wallet_output_E_private",
            1.0
        )
    )

    transaction = create_shuffle_transaction(pool)
    print_transaction(transaction)
