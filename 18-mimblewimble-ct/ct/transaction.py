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

from ecdsa.ellipticcurve import PointJacobi
from ct import pedersen, schnorr, rangeproof


def build(inputs: list[tuple[int, int]],
          outputs: list[tuple[int, int]],
          fee: int) -> dict:
    """Assemble a transaction dict from (value, blinding) tuples and a fee."""
    raise NotImplementedError


def verify(tx: dict) -> tuple[bool, list[str]]:
    """
    Verify a transaction.

    Returns (ok, reasons). When ok is False, `reasons` lists which checks
    failed (range proofs, balance, kernel signature).
    """
    raise NotImplementedError
