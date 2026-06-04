import pytest

from coinshuffle import (
    Participant,
    MixingPool,
    create_shuffle_transaction,
)


def test_pool_size():
    pool = MixingPool()

    pool.add_participant(
        Participant("User1", "input_A", "output_A", 1.0)
    )

    pool.add_participant(
        Participant("User2", "input_B", "output_B", 1.0)
    )

    assert pool.size() == 2


def test_shuffle_transaction_output_count():
    pool = MixingPool()

    pool.add_participant(
        Participant("User1", "input_A", "output_A", 1.0)
    )
    pool.add_participant(
        Participant("User2", "input_B", "output_B", 1.0)
    )
    pool.add_participant(
        Participant("User3", "input_C", "output_C", 1.0)
    )

    tx = create_shuffle_transaction(pool)

    assert len(tx) == 3


def test_all_outputs_preserved_after_shuffle():
    pool = MixingPool()

    pool.add_participant(
        Participant("User1", "input_A", "output_A", 1.0)
    )
    pool.add_participant(
        Participant("User2", "input_B", "output_B", 1.0)
    )
    pool.add_participant(
        Participant("User3", "input_C", "output_C", 1.0)
    )

    tx = create_shuffle_transaction(pool)

    original_outputs = {
        "output_A",
        "output_B",
        "output_C",
    }

    shuffled_outputs = {
        item["output"]
        for item in tx
    }

    assert original_outputs == shuffled_outputs


def test_requires_at_least_three_participants():
    pool = MixingPool()

    pool.add_participant(
        Participant("User1", "input_A", "output_A", 1.0)
    )

    pool.add_participant(
        Participant("User2", "input_B", "output_B", 1.0)
    )

    with pytest.raises(ValueError):
        create_shuffle_transaction(pool)


def test_equal_amount_required():
    pool = MixingPool()

    pool.add_participant(
        Participant("User1", "input_A", "output_A", 1.0)
    )

    pool.add_participant(
        Participant("User2", "input_B", "output_B", 2.0)
    )

    pool.add_participant(
        Participant("User3", "input_C", "output_C", 1.0)
    )

    with pytest.raises(ValueError):
        create_shuffle_transaction(pool)


def test_transaction_contains_valid_field():
    pool = MixingPool()

    for i in range(5):
        pool.add_participant(
            Participant(
                f"User{i}",
                f"input_{i}",
                f"output_{i}",
                1.0,
            )
        )

    tx = create_shuffle_transaction(pool)

    assert all(
        item["valid"] == "yes"
        for item in tx
    )


def test_all_inputs_exist():
    pool = MixingPool()

    for i in range(5):
        pool.add_participant(
            Participant(
                f"User{i}",
                f"input_{i}",
                f"output_{i}",
                1.0,
            )
        )

    tx = create_shuffle_transaction(pool)

    assert len(tx) == 5
