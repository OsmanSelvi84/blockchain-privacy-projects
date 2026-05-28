import random
import hashlib


class Participant:
    def __init__(self, name, input_address, output_address):
        self.name = name
        self.input_address = input_address
        self.output_address = output_address


def hash_address(address):
    return hashlib.sha256(address.encode()).hexdigest()


def shuffle_outputs(participants):
    outputs = [p.output_address for p in participants]
    random.shuffle(outputs)
    return outputs


def create_mixing_result(participants):
    shuffled_outputs = shuffle_outputs(participants)

    result = {
        "inputs": [],
        "shuffled_outputs": [],
        "privacy_goal": "Sender and receiver cannot be directly linked"
    }

    for p in participants:
        result["inputs"].append({
            "participant": p.name,
            "input": p.input_address,
            "hash": hash_address(p.input_address)
        })

    for output in shuffled_outputs:
        result["shuffled_outputs"].append({
            "output": output
        })

    return result


def print_result(result):
    print("\n=== CoinShuffle Demo ===")

    print("\nParticipants:")
    for p in result["inputs"]:
        print(f"{p['participant']} -> {p['input']}")

    print("\nShuffled outputs:")
    for o in result["shuffled_outputs"]:
        print(o["output"])

    print("\nPrivacy:")
    print(result["privacy_goal"])


participants = [
    Participant("User1", "wallet_A", "private_output_A"),
    Participant("User2", "wallet_B", "private_output_B"),
    Participant("User3", "wallet_C", "private_output_C"),
    Participant("User4", "wallet_D", "private_output_D"),
]

result = create_mixing_result(participants)
print_result(result)
