
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PrivacyToken {

    string public name = "Privacy Token";
    string public symbol = "PTK";

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(bytes32 => bool) public commitments;

    event Transfer(address from, address to, uint256 amount);
    event PrivateTransfer(address sender, bytes32 commitment);

    constructor(uint256 _supply) {
        totalSupply = _supply;
        balanceOf[msg.sender] = _supply;
    }

    function transfer(address _to, uint256 _amount) public {

        require(balanceOf[msg.sender] >= _amount, "Not enough balance");

        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;

        emit Transfer(msg.sender, _to, _amount);
    }

    function createCommitment(
        address _receiver,
        uint256 _amount,
        string memory _secret
    ) public pure returns (bytes32) {

        return keccak256(
            abi.encodePacked(
                _receiver,
                _amount,
                _secret
            )
        );
    }

    function privateTransfer(
        bytes32 _commitment,
        uint256 _amount
    ) public {

        require(balanceOf[msg.sender] >= _amount, "Not enough balance");
        require(!commitments[_commitment], "Commitment already used");

        balanceOf[msg.sender] -= _amount;

        commitments[_commitment] = true;

        emit PrivateTransfer(msg.sender, _commitment);
    }
}
