// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SecretSharingEscrow {
    address public owner;
    uint256 public threshold;
    uint256 public totalTrustees;
    
    bool public isRecoveryInitiated;
    uint256 public approvalCount;

    mapping(address => bool) public isTrustee;
    mapping(address => bool) public hasApproved;

    event RecoveryStarted(address indexed requester);
    event ShareSubmitted(address indexed trustee, uint256 currentApprovals);
    event RecoverySuccess();

    modifier onlyOwner() {
        require(msg.sender == owner, "Sadece kontrat sahibi bu islemi yapabilir.");
        _;
    }

    modifier onlyTrustee() {
        require(isTrustee[msg.sender], "Sadece yetkili bir emanetci bu islemi yapabilir.");
        _;
    }

    constructor(uint256 _threshold, address[] memory _initialTrustees) {
        require(_threshold <= _initialTrustees.length, "Esik degeri toplam emanetci sayisindan buyuk olamaz.");
        require(_threshold > 1, "Esik degeri 1'den buyuk olmalidir.");

        owner = msg.sender;
        threshold = _threshold;
        totalTrustees = _initialTrustees.length;

        for (uint256 i = 0; i < _initialTrustees.length; i++) {
            address trustee = _initialTrustees[i];
            require(trustee != address(0), "Gecersiz adres.");
            isTrustee[trustee] = true;
        }
    }

    uint256 public recoveryRequestTime;

    function initiateRecovery() external onlyOwner {
        require(!isRecoveryInitiated, "Kurtarma sureci zaten baslatilmis.");
        isRecoveryInitiated = true;
        recoveryRequestTime = block.timestamp;
        
        emit RecoveryStarted(msg.sender);
    }

    
    function approveRecovery() external onlyTrustee {
        require(isRecoveryInitiated, "Surec henuz baslatilmadi.");
        require(!hasApproved[msg.sender], "Zaten onay verdiniz.");

        hasApproved[msg.sender] = true;
        approvalCount++;

        emit ShareSubmitted(msg.sender, approvalCount);

        if (approvalCount >= threshold) {
            emit RecoverySuccess();
        }
    }

    function isReadyForReconstruction() external view returns (bool) {
        return approvalCount >= threshold;
    }
}