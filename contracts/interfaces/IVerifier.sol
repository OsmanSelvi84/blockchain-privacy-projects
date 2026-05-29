pragma solidity >=0.5.0 <0.6.0;

/**
 * @title IVerifier — Groth16-style proof checker (ZoKrates toolchain output).
 */
contract IVerifier {
  function verifyTx(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[8] memory input
  ) public returns (bool);
}
