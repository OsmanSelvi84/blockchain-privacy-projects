// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MimbleWimble Confidential Transactions — on-chain verifier
/// @notice Verifies the Pedersen commitment balance and Schnorr kernel
/// signature of a MimbleWimble CT transaction. Range proofs are kept
/// off-chain (Python prover) because verifying them on-chain would cost
/// tens of millions of gas under the classical bit-commitment construction.
///
/// The two generators G and H are baked in as constants. H is derived in
/// Python via try-and-increment from the seed "MimbleWimble-CT/H/v1" — see
/// ct/curve.py in the off-chain prover.
contract MimbleWimbleVerifier {
    // secp256k1 field prime  p = 2^256 - 2^32 - 977
    uint256 internal constant PP = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f;
    // secp256k1 group order n (prime)
    uint256 internal constant NN = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141;
    // G — standard secp256k1 generator
    uint256 internal constant GX = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798;
    uint256 internal constant GY = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8;
    // H — second generator, no known discrete-log w.r.t. G
    uint256 internal constant HX = 0xb6beaef6c7647bb3516eb5c6c9d675f256e71c07141c2a1e0f99404894d1448b;
    uint256 internal constant HY = 0x8b2fb89f7161c365f8b677270052f9e38d7bed6dfcd87264865f1ba8e4291fd8;

    // --- public API ----------------------------------------------------------

    /// @notice Verify a Schnorr signature on `message` under public key (px, py).
    ///         s*G == R + e*P,  where e = sha256(R_compressed || P_compressed || message) mod n.
    function verifyKernelSignature(
        uint256 px, uint256 py,
        uint256 rx, uint256 ry,
        uint256 s,
        bytes calldata message
    ) external view returns (bool) {
        if (s == 0 || s >= NN) return false;
        // e = sha256(R || P || msg) mod n
        uint256 e = uint256(sha256(
            abi.encodePacked(_compress(rx, ry), _compress(px, py), message)
        )) % NN;
        // lhs = s*G
        (uint256 lx, uint256 ly) = ecMul(GX, GY, s);
        // rhs = R + e*P
        (uint256 epx, uint256 epy) = ecMul(px, py, e);
        (uint256 rhx, uint256 rhy) = ecAdd(rx, ry, epx, epy);
        return (lx == rhx) && (ly == rhy);
    }

    /// @notice Verify the Pedersen commitment balance against a published
    ///         kernel excess point. Checks
    ///             Σ input_commitments − Σ output_commitments − fee*H == kernelExcess
    ///         where each commitment is an affine point (x, y) on secp256k1.
    function verifyBalance(
        uint256[] calldata inX, uint256[] calldata inY,
        uint256[] calldata outX, uint256[] calldata outY,
        uint256 fee,
        uint256 kernelExcessX, uint256 kernelExcessY
    ) external view returns (bool) {
        require(inX.length == inY.length, "input x/y length mismatch");
        require(outX.length == outY.length, "output x/y length mismatch");
        require(inX.length > 0, "need at least one input");

        // Start with the first input commitment.
        uint256 tx_x = inX[0];
        uint256 tx_y = inY[0];

        // Add the remaining input commitments.
        for (uint256 i = 1; i < inX.length; i++) {
            (tx_x, tx_y) = ecAdd(tx_x, tx_y, inX[i], inY[i]);
        }

        // Subtract each output commitment (negation = flip y mod p).
        for (uint256 i = 0; i < outX.length; i++) {
            uint256 negY = (PP - outY[i]) % PP;
            (tx_x, tx_y) = ecAdd(tx_x, tx_y, outX[i], negY);
        }

        // Subtract fee*H. Use scalar negation so fee == 0 stays cleanly at the
        // point at infinity (i.e. a no-op add).
        if (fee != 0) {
            uint256 negFee = (NN - (fee % NN)) % NN;
            (uint256 fhx, uint256 fhy) = ecMul(HX, HY, negFee);
            (tx_x, tx_y) = ecAdd(tx_x, tx_y, fhx, fhy);
        }

        return (tx_x == kernelExcessX) && (tx_y == kernelExcessY);
    }

    // --- helpers -------------------------------------------------------------

    /// @notice Compressed SEC1 serialization: 0x02 || x if y even, 0x03 || x if y odd.
    function _compress(uint256 x, uint256 y) internal pure returns (bytes memory) {
        bytes1 prefix = (y % 2 == 0) ? bytes1(0x02) : bytes1(0x03);
        return bytes.concat(prefix, bytes32(x));
    }

    // --- secp256k1 elliptic curve operations ---------------------------------
    // Affine coordinates. The point at infinity is represented as (0, 0).
    // These are deliberately straightforward (no Jacobian, no wNAF) so each
    // line maps directly to a textbook formula.

    /// @notice (x3, y3) = (x1, y1) + (x2, y2) on secp256k1.
    function ecAdd(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
        internal view returns (uint256, uint256)
    {
        // Identity short-circuits.
        if (x1 == 0 && y1 == 0) return (x2, y2);
        if (x2 == 0 && y2 == 0) return (x1, y1);
        if (x1 == x2) {
            if ((y1 + y2) % PP == 0) return (0, 0); // P + (-P) = ∞
            return ecDouble(x1, y1);                // doubling
        }
        // λ = (y2 - y1) / (x2 - x1) mod p
        uint256 dy = addmod(y2, PP - y1, PP);
        uint256 dx = addmod(x2, PP - x1, PP);
        uint256 lambda = mulmod(dy, modInv(dx), PP);
        // x3 = λ² - x1 - x2 mod p
        uint256 x3 = addmod(mulmod(lambda, lambda, PP), PP - addmod(x1, x2, PP), PP);
        // y3 = λ(x1 - x3) - y1 mod p
        uint256 y3 = addmod(mulmod(lambda, addmod(x1, PP - x3, PP), PP), PP - y1, PP);
        return (x3, y3);
    }

    /// @notice (x3, y3) = 2*(x1, y1).
    function ecDouble(uint256 x1, uint256 y1)
        internal view returns (uint256, uint256)
    {
        if (y1 == 0) return (0, 0);
        // λ = 3*x1² / (2*y1)  mod p   (a = 0 for secp256k1)
        uint256 num = mulmod(3, mulmod(x1, x1, PP), PP);
        uint256 den = mulmod(2, y1, PP);
        uint256 lambda = mulmod(num, modInv(den), PP);
        // x3 = λ² - 2*x1 mod p
        uint256 x3 = addmod(mulmod(lambda, lambda, PP), PP - mulmod(2, x1, PP), PP);
        // y3 = λ(x1 - x3) - y1 mod p
        uint256 y3 = addmod(mulmod(lambda, addmod(x1, PP - x3, PP), PP), PP - y1, PP);
        return (x3, y3);
    }

    /// @notice (x3, y3) = k * (x, y). Double-and-add over the bits of k.
    function ecMul(uint256 x, uint256 y, uint256 k)
        internal view returns (uint256, uint256)
    {
        uint256 rx = 0;
        uint256 ry = 0;
        k = k % NN;
        while (k > 0) {
            if (k & 1 == 1) {
                (rx, ry) = ecAdd(rx, ry, x, y);
            }
            (x, y) = ecDouble(x, y);
            k >>= 1;
        }
        return (rx, ry);
    }

    /// @notice Modular inverse via Fermat's little theorem: a^(p-2) mod p.
    ///         Uses the modexp precompile at address 0x05.
    function modInv(uint256 a) internal view returns (uint256) {
        require(a != 0, "modInv(0)");
        // EIP-198 modexp precompile input: lenBase | lenExp | lenMod | base | exp | mod
        bytes memory input = abi.encode(
            uint256(32), uint256(32), uint256(32),
            a, PP - 2, PP
        );
        (bool ok, bytes memory ret) = address(0x05).staticcall(input);
        require(ok && ret.length == 32, "modexp failed");
        return abi.decode(ret, (uint256));
    }
}
