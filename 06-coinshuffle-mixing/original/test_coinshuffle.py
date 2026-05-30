import pytest
from coinshuffle import Participant, create_shuffle_transaction, hash_address


def test_hash_address():
    hashed = hash_address("wallet_input_A")
    assert hashed != "wallet_input_A"
    assert len(hashed) == 64


def test_shuffle_transaction_output_count():
    participants = [
        Participant("User1", "input_A", "output_A", 1.0),
        Participant("User2", "input_B", "output_B", 1.0),
        Participant("User3", "input_C", "output_C", 1.0),
    ]

    tx = create_shuffle_transaction(participants)

    assert len(tx.inputs) == 3
    assert len(tx.outputs) == 3


def test_all_outputs_preserved_after_shuffle():
    participants = [
        Participant("User1", "input_A", "output_A", 1.0),
        Participant("User2", "input_B", "output_B", 1.0),
        Participant("User3", "input_C", "output_C", 1.0),
    ]

    tx = create_shuffle_transaction(participants)

    original_outputs = {"output_A", "output_B", "output_C"}
    shuffled_outputs = {item["output_address"] for item in tx.outputs}

    assert original_outputs == shuffled_outputs


def test_requires_at_least_three_participants():
    participants = [
        Participant("User1", "input_A", "output_A", 1.0),
        Participant("User2", "input_B", "output_B", 1.0),
    ]

    with pytest.raises(ValueError):
        create_shuffle_transaction(participants)


def test_equal_denomination_required():
    participants = [
        Participant("User1", "input_A", "output_A", 1.0),
        Participant("User2", "input_B", "output_B", 2.0),
        Participant("User3", "input_C", "output_C", 1.0),
    ]

    with pytest.raises(ValueError):
        create_shuffle_transaction(participants)
