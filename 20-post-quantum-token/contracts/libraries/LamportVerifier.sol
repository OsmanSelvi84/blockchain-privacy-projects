// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LamportVerifier
 * @author PostQuantumToken Project
 * @notice Library implementing Lamport one-time signature verification on-chain.
 *
 * @dev Lamport signatures are quantum-resistant because their security depends
 * solely on the one-wayness of a hash function (keccak256 here), NOT on
 * the hardness of discrete logarithm or elliptic-curve problems.
 *
 * Quantum computers running Shor's algorithm can break ECDSA (used by
 * Ethereum's default secp256k1). They CANNOT break hash-based schemes
 * like Lamport, which only require a quantum speedup of ~sqrt (Grover),
 * meaning doubling the hash output size fully restores security.
 *
 * ─── How Lamport Signatures Work ──────────────────────────────────────────
 *
 * KEY GENERATION:
 * Private key:  256 pairs of random 32-byte values
 * SK = { (sk[i][0], sk[i][1]) } for i = 0..255
 *
 * Public key:   Hash of each private value
 * PK = { (H(sk[i][0]), H(sk[i][1])) } for i = 0..255
 *
 * SIGNING (message hash M, 256 bits):
 * For each bit i of M:
 * - if M[i] == 0 → reveal sk[i][0]
 * - if M[i] == 1 → reveal sk[i][1]
 * Signature = 256 revealed preimage values
 *
 * VERIFICATION:
 * For each bit i of M:
 * - if M[i] == 0 → check H(sig[i]) == PK[i][0]
 * - if M[i] == 1 → check H(sig[i]) == PK[i][1]
 *
 * SECURITY NOTE:
 * Each key pair is ONE-TIME USE. Reusing a key leaks half the private key
 * per signature, enabling forgery. Key rotation is mandatory after each use.
 */
library LamportVerifier {

    /**
     * @notice Verifies a Lamport one-time signature against a message hash.
     * @param messageHash  32-byte hash of the message that was signed.
     * @param signature    256 revealed preimage values (the Lamport signature).
     * @param publicKey    256 pairs of hash values (the Lamport public key).
     * @return valid       True if the signature is valid for the given public key.
     *
     * @dev Iterates over all 256 bits of messageHash MSB-first.
     * For each bit: keccak256(signature[i]) must equal publicKey[i][bit].
     * Short-circuits on the first failure.
     */
    function verify(
        bytes32 messageHash,
        bytes32[256] calldata signature,
        bytes32[2][256] calldata publicKey
    ) internal pure returns (bool valid) {
        for (uint256 i = 0; i < 256; ) {
            uint256 byteIndex = i >> 3;
            uint256 bitIndex  = 7 - (i & 0x7);
            uint256 bit       = (uint8(messageHash[byteIndex]) >> bitIndex) & 1;
            if (keccak256(abi.encode(signature[i])) != publicKey[i][bit]) {
                return false;
            }
            unchecked { ++i;
            }
        }
        return true;
    }

    /**
     * @notice Computes a compact commitment hash of a full Lamport public key.
     * @param publicKey  The 256-pair Lamport public key (16,384 bytes).
     * @return           keccak256 hash of the ABI-encoded public key (32 bytes).
     *
     * @dev Storing the full public key on-chain costs ~16 KB.
     * Instead we store only this 32-byte commitment.
     */
    function computeCommitment(bytes32[2][256] calldata publicKey)
        internal pure returns (bytes32)
    {
        return keccak256(abi.encode(publicKey));
    }

    /**
     * @notice Verifies that a supplied public key matches a stored commitment.
     * @param publicKey   The claimed Lamport public key.
     * @param commitment  The previously stored commitment.
     * @return            True if keccak256(encode(publicKey)) == commitment.
     */
    function verifyCommitment(
        bytes32[2][256] calldata publicKey,
        bytes32 commitment
    ) internal pure returns (bool) {
        return keccak256(abi.encode(publicKey)) == commitment;
    }
}
