// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SocialRecoveryWallet {
    address public owner;
    uint256 public threshold;

    mapping(address => bool) public isGuardian;
    address[] public guardians;

    address public pendingNewOwner;
    uint256 public approvalCount;

    mapping(address => bool) public hasApproved;

    event RecoveryStarted(address indexed newOwner);
    event RecoveryApproved(address indexed guardian, address indexed newOwner, uint256 approvalCount);
    event OwnerRecovered(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Only guardians can approve recovery");
        _;
    }

    constructor(address[] memory _guardians, uint256 _threshold) {
        require(_guardians.length > 0, "At least one guardian required");
        require(_threshold > 0 && _threshold <= _guardians.length, "Invalid threshold");

        owner = msg.sender;
        threshold = _threshold;

        for (uint256 i = 0; i < _guardians.length; i++) {
            require(_guardians[i] != address(0), "Invalid guardian address");
            require(!isGuardian[_guardians[i]], "Duplicate guardian");

            isGuardian[_guardians[i]] = true;
            guardians.push(_guardians[i]);
        }
    }

    function startRecovery(address _newOwner) external onlyGuardian {
        require(_newOwner != address(0), "Invalid new owner");

        pendingNewOwner = _newOwner;
        approvalCount = 1;

        for (uint256 i = 0; i < guardians.length; i++) {
            hasApproved[guardians[i]] = false;
        }

        hasApproved[msg.sender] = true;

        emit RecoveryStarted(_newOwner);
        emit RecoveryApproved(msg.sender, _newOwner, approvalCount);
    }

    function approveRecovery() external onlyGuardian {
        require(pendingNewOwner != address(0), "No recovery request");
        require(!hasApproved[msg.sender], "Guardian already approved");

        hasApproved[msg.sender] = true;
        approvalCount++;

        emit RecoveryApproved(msg.sender, pendingNewOwner, approvalCount);

        if (approvalCount >= threshold) {
            address oldOwner = owner;
            owner = pendingNewOwner;

            pendingNewOwner = address(0);
            approvalCount = 0;

            for (uint256 i = 0; i < guardians.length; i++) {
                hasApproved[guardians[i]] = false;
            }

            emit OwnerRecovered(oldOwner, owner);
        }
    }

    function cancelRecovery() external onlyOwner {
        pendingNewOwner = address(0);
        approvalCount = 0;

        for (uint256 i = 0; i < guardians.length; i++) {
            hasApproved[guardians[i]] = false;
        }
    }

    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }
}