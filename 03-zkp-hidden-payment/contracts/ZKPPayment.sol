// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {MerkleTree} from "./MerkleTree.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";

contract ZKPPayment is MerkleTree, ReentrancyGuard {
    IVerifier public immutable verifier;
    uint256 public immutable denomination; // Fixed deposit amount
    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address indexed to, bytes32 indexed nullifier);

    constructor(IVerifier _verifier, uint256 _denomination) MerkleTree() {
        require(
            address(_verifier) != address(0), 
            "Verifier=0"
        );
        require(
            _denomination > 0, 
            "Denomination=0"
        );

        verifier = _verifier;
        denomination = _denomination;
    }

    function deposit(bytes32 commitment) external payable {
        require(
            msg.value == denomination, 
            "Wrong denomination"
        );
        require(
            !commitments[commitment], 
            "Commitment already used"
        );

        commitments[commitment] = true;
        uint32 insertedIndex = _insert(commitment);
        emit Deposit(commitment, insertedIndex, block.timestamp);
    }

    function withdraw(
        uint256[8] calldata proof, // Flat Groth16 proof: [a0, a1, b00, b01, b10, b11, c0, c1]
        bytes32 root,
        bytes32 nullifier,
        address payable recipient
    ) external nonReentrant {
        require(
            !nullifierHashes[nullifier], 
            "Nullifier already used"
        );
        require(
            isKnownRoot(root), 
            "Unknown Merkle root"
        );

        (
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = _formatProof(proof);

        uint256[3] memory inputs = [
            uint256(root),
            uint256(nullifier),
            uint256(uint160(address(recipient)))
        ];

        require(
            verifier.verifyProof(a, b, c, inputs), 
            "Invalid proof"
        );

        nullifierHashes[nullifier] = true;

        (bool done, ) = recipient.call{value: denomination}("");
        require(
            done, 
            "Transfer failed"
        );

        emit Withdrawal(recipient, nullifier);
    }

    function _formatProof(uint256[8] calldata p)
        private
        pure
        returns (uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c)
    {
        a = [p[0], p[1]];
        b = [[p[2], p[3]], [p[4], p[5]]];
        c = [p[6], p[7]];
    }

    receive() external payable {} // This for testing allows my conract to receive ETH.
}
