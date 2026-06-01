// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVerifier} from "../interfaces/IVerifier.sol";

/// @title MockVerifier
/// @notice Test-only verifier whose `verifyProof` always returns true. Used by
///         the Hardhat test suite to exercise withdraw-side logic (nullifier
///         re-use, unknown root, etc.) without running the real zk pipeline.
contract MockVerifier is IVerifier {
    /// @inheritdoc IVerifier
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[3] calldata
    ) external pure override returns (bool) {
        return true;
    }
}
