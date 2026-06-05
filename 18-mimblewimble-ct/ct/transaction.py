"""
Transaction assembly and verification — ties the primitives together.

A MimbleWimble CT transaction has:

    inputs:    list of input commitments  C_in = v_in*H + r_in*G
    outputs:   list of output commitments C_out = v_out*H + r_out*G
               each with an attached range proof
    fee:       public scalar
    kernel:
        excess:    the point D = Σ C_in - Σ C_out - fee*H  (= excess_scalar*G)
        signature: Schnorr sig over the fee message under public key = excess

Verification:
    1. For each output, verify its range proof.
    2. Compute D = Σ C_in - Σ C_out - fee*H. Confirm D matches kernel.excess.
    3. Verify Schnorr signature on fee message under kernel.excess.

JSON SCHEMA (consumed by ct.cli):
{
  "fee": 5,
  "inputs":  [{"commitment": "<hex 33B>"}, ...],
  "outputs": [
      {"commitment": "<hex 33B>",
       "range_proof": {
           "bit_commitments": ["<hex 33B>", ...],
           "or_proofs": [[e0, e1, s0, s1], ...],
           "n_bits": 64}}, ...],
  "kernel": {
      "excess":  "<hex 33B>",
      "sig_R":   "<hex 33B>",
      "sig_s":   "<hex 32B>"}
}

`inputs` and `outputs` are (value, blinding) tuples — the spender owns
both values and blinding factors for every input. In a real wallet these
would come from a wallet DB; in this demo they're supplied via the CLI.
"""

from __future__ import annotations

from ecdsa.ellipticcurve import PointJacobi

from ct import pedersen, schnorr, rangeproof
from ct.curve import CURVE, G, H, ORDER, P
from ct.schnorr import _point_to_bytes


# ---------- serialization helpers ----------

def _point_to_hex(point: PointJacobi) -> str:
    return _point_to_bytes(point).hex()


def _hex_to_point(s: str) -> PointJacobi:
    """Parse a compressed SEC1 point (33 bytes hex = 66 chars)."""
    b = bytes.fromhex(s)
    if len(b) != 33 or b[0] not in (0x02, 0x03):
        raise ValueError("invalid compressed point")
    x = int.from_bytes(b[1:], "big")
    # Recover y from the curve equation: y² = x³ + 7 mod p.
    t = (pow(x, 3, P) + 7) % P
    y = pow(t, (P + 1) // 4, P)
    # Pick the y matching the prefix parity (0x02 = even, 0x03 = odd).
    parity_wanted = 0 if b[0] == 0x02 else 1
    if y % 2 != parity_wanted:
        y = P - y
    return PointJacobi(CURVE, x, y, 1, ORDER)


def _scalar_to_hex(s: int, length: int = 32) -> str:
    return s.to_bytes(length, "big").hex()


def _serialize_range_proof(rp: rangeproof.RangeProof) -> dict:
    return {
        "bit_commitments": [_point_to_hex(c) for c in rp.bit_commitments],
        "or_proofs": [list(t) for t in rp.or_proofs],
        "n_bits": rp.n_bits,
    }


def _deserialize_range_proof(d: dict) -> rangeproof.RangeProof:
    return rangeproof.RangeProof(
        bit_commitments=[_hex_to_point(s) for s in d["bit_commitments"]],
        or_proofs=[tuple(t) for t in d["or_proofs"]],
        n_bits=d["n_bits"],
    )


def _fee_message(fee: int) -> bytes:
    """Canonical encoding of the fee for the kernel signature."""
    return fee.to_bytes(8, "big")


# ---------- public API ----------

def build(inputs: list[tuple[int, int]],
          outputs: list[tuple[int, int]],
          fee: int) -> dict:
    """Assemble a transaction dict from (value, blinding) tuples and a fee."""
    # Build commitments for each input and output.
    input_commitments = [pedersen.commit(v, r) for v, r in inputs]
    output_commitments = [pedersen.commit(v, r) for v, r in outputs]

    # Build a range proof for each output.
    output_range_proofs = [rangeproof.prove(v, r) for v, r in outputs]

    # The kernel excess scalar is the difference of blinding factors.
    excess_scalar = (sum(r for _, r in inputs) - sum(r for _, r in outputs)) % ORDER

    # The kernel excess point computed from commitment balance.
    excess_point = pedersen.balance_excess(input_commitments, output_commitments, fee)

    # Sign the fee message with the excess scalar. The public key is excess*G,
    # which equals excess_point when the transaction is balanced.
    R, s = schnorr.sign(excess_scalar, _fee_message(fee))

    return {
        "fee": fee,
        "inputs": [{"commitment": _point_to_hex(c)} for c in input_commitments],
        "outputs": [
            {"commitment": _point_to_hex(c),
             "range_proof": _serialize_range_proof(rp)}
            for c, rp in zip(output_commitments, output_range_proofs)
        ],
        "kernel": {
            "excess": _point_to_hex(excess_point),
            "sig_R":  _point_to_hex(R),
            "sig_s":  _scalar_to_hex(s),
        },
    }


def verify(tx: dict) -> tuple[bool, list[str]]:
    """
    Verify a transaction.

    Returns (ok, reasons). When ok is False, `reasons` lists which checks
    failed (range proofs, balance, kernel signature).
    """
    reasons: list[str] = []
    all_ok = True

    try:
        fee = int(tx["fee"])
        input_commitments = [_hex_to_point(i["commitment"]) for i in tx["inputs"]]
        output_commitments = [_hex_to_point(o["commitment"]) for o in tx["outputs"]]
        kernel_excess = _hex_to_point(tx["kernel"]["excess"])
        kernel_R = _hex_to_point(tx["kernel"]["sig_R"])
        kernel_s = int.from_bytes(bytes.fromhex(tx["kernel"]["sig_s"]), "big")
    except (KeyError, ValueError) as e:
        return False, [f"malformed transaction: {e}"]

    # 1. Range proofs.
    rp_ok = True
    for i, out in enumerate(tx["outputs"]):
        rp = _deserialize_range_proof(out["range_proof"])
        if not rangeproof.verify(output_commitments[i], rp):
            rp_ok = False
            all_ok = False
            reasons.append(f"range proof for output {i} invalid")
    if rp_ok:
        reasons.append(f"all {len(tx['outputs'])} range proofs valid")

    # 2. Commitment balance: recompute D and compare to the published excess.
    D = pedersen.balance_excess(input_commitments, output_commitments, fee)
    if (D.x(), D.y()) == (kernel_excess.x(), kernel_excess.y()):
        reasons.append("commitments balance")
    else:
        all_ok = False
        reasons.append("commitments do not balance")

    # 3. Kernel Schnorr signature on the fee under the excess point.
    if schnorr.verify(kernel_excess, _fee_message(fee), kernel_R, kernel_s):
        reasons.append("kernel signature valid")
    else:
        all_ok = False
        reasons.append("kernel signature invalid")

    return all_ok, reasons
