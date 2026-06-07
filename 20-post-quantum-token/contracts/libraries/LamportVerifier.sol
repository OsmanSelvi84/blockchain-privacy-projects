// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  LamportVerifier
 * @notice Solidity library for Lamport one-time signature verification.
 *
 * @dev    Lamport signatures are quantum-resistant because their security
 *         depends only on the one-wayness of keccak256, not on elliptic-curve
 *         or discrete-logarithm hardness (which Shor's algorithm breaks).
 *
 * How Lamport Signatures Work:
 *
 *  KEY GENERATION
 *    Private key : 256 random pairs  SK = { (sk[i][0], sk[i][1]) }  i=0..255
 *    Public key  : hash of each pair PK = { (H(sk[i][0]), H(sk[i][1])) }
 *                  where H = keccak256
 *
 *  SIGNING  (message hash M, 256 bits)
 *    For each bit i of M:
 *      bit == 0  =>  reveal sk[i][0]
 *      bit == 1  =>  reveal sk[i][1]
 *    Signature = 256 revealed preimage values
 *
 *  VERIFICATION
 *    For each bit i of M:
 *      bit == 0  =>  check H(sig[i]) == PK[i][0]
 *      bit == 1  =>  check H(sig[i]) == PK[i][1]
 *
 *  ONE-TIME RULE
 *    Each key pair must be used exactly once. Reusing a key leaks the
 *    complementary preimage and allows signature forgery.
 *
 * Reference: https://github.com/Tetration-Lab/lamport-solidity (MIT)
 */
library LamportVerifier {

    /**
     * @notice Verifies a Lamport one-time signature.
     * @param messageHash  32-byte hash of the message that was signed.
     * @param signature    256 revealed preimage values (the signature).
     * @param publicKey    256 pairs of keccak256 hash values (the public key).
     * @return             True if every bit check passes, false otherwise.
     */
    function verify(
        bytes32         messageHash,
        bytes32[256]    calldata signature,
        bytes32[2][256] calldata publicKey
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < 256; ) {
            uint256 byteIndex = i >> 3;
            uint256 bitIndex  = 7 - (i & 0x7);
            uint256 bit       = (uint8(messageHash[byteIndex]) >> bitIndex) & 1;

            if (keccak256(abi.encode(signature[i])) != publicKey[i][bit]) {
                return false;
            }
            unchecked { ++i; }
        }
        return true;
    }

    /**
     * @notice Computes the 32-byte commitment of a Lamport public key.
     * @param  publicKey  The full 256-pair Lamport public key.
     * @return            keccak256(abi.encode(publicKey))
     */
    function computeCommitment(bytes32[2][256] calldata publicKey)
        internal pure returns (bytes32)
    {
        return keccak256(abi.encode(publicKey));
    }

    /**
     * @notice Returns true if the supplied key matches a stored commitment.
     * @param  publicKey   The claimed Lamport public key.
     * @param  commitment  The previously stored commitment hash.
     */
    function verifyCommitment(
        bytes32[2][256] calldata publicKey,
        bytes32 commitment
    ) internal pure returns (bool) {
        return keccak256(abi.encode(publicKey)) == commitment;
    }
}
