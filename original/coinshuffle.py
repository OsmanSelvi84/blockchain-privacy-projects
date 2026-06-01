import random
import hashlib
from dataclasses import dataclass


@dataclass
class Participant:
    name: str
    input_address: str
    output_address: str
    amount: float


@dataclass
class ShuffleTransaction:
    inputs: list
    outputs: list
    denomination: float
    fee: float
    privacy_goal: str


def hash_address(address):
    return hashlib.sha256(address.encode()).hexdigest()


def validate_participants(participants):
    if len(participants) < 3:
        raise ValueError("CoinShuffle needs at least 3 participants for meaningful privacy.")

    amounts = {p.amount for p in participants}
    if len(amounts) != 1:
        raise ValueError("All participants must use the same amount denomination.")


def create_shuffle_transaction(participants, fee=0.001):
    validate_participants(participants)

    denomination = participants[0].amount
    shuffled_outputs = [p.output_address for p in participants]
    random.shuffle(shuffled_outputs)

    inputs = []
    for p in participants:
        inputs.append({
            "participant": p.name,
            "input_address_hash": hash_address(p.input_address),
            "amount": p.amount
        })

    outputs = []
    for output in shuffled_outputs:
        outputs.append({
            "output_address": output,
            "amount": round(denomination - fee, 6)
        })

    return ShuffleTransaction(
        inputs=inputs,
        outputs=outputs,
        denomination=denomination,
        fee=fee,
        privacy_goal="Break the direct link between input addresses and output addresses."
    )


def print_transaction(tx):
    print("\n=== CoinShuffle Mixing Protocol Demo ===")

    print("\nHashed Inputs:")
    for item in tx.inputs:
        print(f"{item['participant']} -> {item['input_address_hash']} | amount: {item['amount']}")

    print("\nShuffled Outputs:")
    for item in tx.outputs:
        print(f"{item['output_address']} | amount after fee: {item['amount']}")

    print("\nPrivacy Goal:")
    print(tx.privacy_goal)


if __name__ == "__main__":
    participants = [
        Participant("User1", "wallet_input_A", "wallet_output_A_private", 1.0),
        Participant("User2", "wallet_input_B", "wallet_output_B_private", 1.0),
        Participant("User3", "wallet_input_C", "wallet_output_C_private", 1.0),
        Participant("User4", "wallet_input_D", "wallet_output_D_private", 1.0),
        Participant("User5", "wallet_input_E", "wallet_output_E_private", 1.0),
    ]

    transaction = create_shuffle_transaction(participants)
    print_transaction(transaction)
