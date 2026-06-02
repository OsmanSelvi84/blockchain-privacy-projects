// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AnonymousAttestation {
    bytes32 private attestationHash;

    event Attested(address indexed user);

    constructor(bytes32 _attestationHash) {
        attestationHash = _attestationHash;
    }

    function verify(string memory secret) public returns (bool) {
        bytes32 providedHash = keccak256(abi.encodePacked(secret));

        if (providedHash == attestationHash) {
            emit Attested(msg.sender);
            return true;
        }

        return false;
    }

    function getHash() public view returns (bytes32) {
        return attestationHash;
    }
}