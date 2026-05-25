"""
Generate test vectors for the Solidity verifier from the Python prover.

Run from the project root with the Python venv active:
    PYTHONPATH=. python scripts/generate_solidity_vectors.py

Writes solidity/test/vectors.json — consumed by the Hardhat test file.
"""

import json
import secrets
from pathlib import Path

from ct.curve import G, H, ORDER
from ct import pedersen, schnorr


def point_to_obj(point) -> dict:
    return {"x": hex(point.x()), "y": hex(point.y())}


def make_schnorr_vector(label: str, msg: bytes) -> dict:
    """A valid Schnorr signature + its inputs."""
    x = secrets.randbelow(ORDER - 1) + 1
    P = x * G
    R, s = schnorr.sign(x, msg)
    return {
        "label": label,
        "P": point_to_obj(P),
        "R": point_to_obj(R),
        "s": hex(s),
        "message": "0x" + msg.hex(),
        "should_verify": True,
    }


def make_balance_vector(label: str, inputs: list, outputs: list, fee: int) -> dict:
    """A balanced transaction with its kernel excess point."""
    input_commitments = [pedersen.commit(v, r) for v, r in inputs]
    output_commitments = [pedersen.commit(v, r) for v, r in outputs]
    excess = pedersen.balance_excess(input_commitments, output_commitments, fee)
    return {
        "label": label,
        "inputs": [point_to_obj(c) for c in input_commitments],
        "outputs": [point_to_obj(c) for c in output_commitments],
        "fee": fee,
        "kernel_excess": point_to_obj(excess),
    }


def main() -> None:
    vectors = {
        "schnorr": [
            make_schnorr_vector("simple_message", b"hello solidity"),
            make_schnorr_vector("empty_message", b""),
            make_schnorr_vector("fee_8_bytes", (5).to_bytes(8, "big")),
        ],
        "balance": [
            make_balance_vector(
                "one_in_one_out",
                inputs=[(100, 0xA1)],
                outputs=[(95, 0xB1)],
                fee=5,
            ),
            make_balance_vector(
                "split",
                inputs=[(100, 0xA2)],
                outputs=[(60, 0xB2), (35, 0xC2)],
                fee=5,
            ),
            make_balance_vector(
                "combine",
                inputs=[(50, 0xA3), (75, 0xB3)],
                outputs=[(120, 0xC3)],
                fee=5,
            ),
            make_balance_vector(
                "zero_fee",
                inputs=[(100, 0xA4)],
                outputs=[(100, 0xB4)],
                fee=0,
            ),
        ],
    }

    out_path = Path(__file__).parent.parent / "solidity" / "test" / "vectors.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(vectors, indent=2))
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
