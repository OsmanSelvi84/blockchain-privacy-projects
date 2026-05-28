from coinshuffle import Participant, create_mixing_result


def test_output_count():

    participants = [
        Participant("A","a","oa"),
        Participant("B","b","ob"),
        Participant("C","c","oc")
    ]

    result=create_mixing_result(participants)

    assert len(
        result["shuffled_outputs"]
    )==3


def test_inputs_equal_outputs():

    participants = [
        Participant("A","a","oa"),
        Participant("B","b","ob")
    ]

    result=create_mixing_result(participants)

    assert len(
        result["inputs"]
    )==len(
        result["shuffled_outputs"]
    )