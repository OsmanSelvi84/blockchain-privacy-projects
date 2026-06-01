// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProcessingConsent {
    
    
    address public immutable collectionConsentSC;
    address public immutable dataSubject;
    address public immutable dataController;
    address public immutable dataProcessor;

    struct ProcessingPurposeStruct {
        bool exists;
        uint256 data;
        uint256 beginningDate;
        uint256 expirationDate;
        mapping(uint8 => bool) actorApprovals; 
    }

    mapping(uint256 => ProcessingPurposeStruct) private purposeRegistry;
    uint256[] private processingPurposes; 

    
    event PurposeRegistered(uint256 indexed purposeId, uint256 duration);
    event ApprovalChanged(uint256 indexed purposeId, uint8 indexed actorType, bool status);

    
    modifier onlyCollectionSC() {
        require(msg.sender == collectionConsentSC, "Auth Error: Only Collection SC permitted.");
        _;
    }

    modifier onlyValidActor() {
        require(tx.origin == dataController || tx.origin == dataSubject || tx.origin == dataProcessor, "Auth Error: Invalid Caller.");
        _;
    }

    constructor(address _controller, address _dataSubject, address _processor) {
        require(tx.origin == _controller, "Initializer Error: Sender mismatch.");
        collectionConsentSC = msg.sender;
        dataController = _controller;
        dataSubject = _dataSubject;
        dataProcessor = _processor;
    }

    
    function newPurpose(uint256 _purpose, uint256 _data, uint256 _duration, uint256 _defaultTrue) external onlyCollectionSC {
        require(!purposeRegistry[_purpose].exists, "State Error: Purpose already configured.");
        require(tx.origin == dataController, "Auth Error: Controller action required.");

        ProcessingPurposeStruct storage registry = purposeRegistry[_purpose];
        registry.exists = true;
        registry.data = _data;
        registry.beginningDate = block.timestamp;
        registry.expirationDate = block.timestamp + _duration;

        if (_defaultTrue == 1) {
            registry.actorApprovals[0] = true; // Controller
            registry.actorApprovals[1] = true; // Data Subject
            registry.actorApprovals[2] = false; // Processor
        } else {
            registry.actorApprovals[0] = true;
            registry.actorApprovals[1] = false;
            registry.actorApprovals[2] = false;
        }

        processingPurposes.push(_purpose);
        emit PurposeRegistered(_purpose, _duration);
    }

    function verify(uint256 _purpose) external view returns (bool) {
        require(purposeRegistry[_purpose].exists, "Query Error: Purpose non-existent.");
        
        ProcessingPurposeStruct storage registry = purposeRegistry[_purpose];
        bool allApproved = registry.actorApprovals[0] && registry.actorApprovals[1] && registry.actorApprovals[2];
        bool withinTimeline = block.timestamp >= registry.beginningDate && block.timestamp <= registry.expirationDate;
        
        return (allApproved && withinTimeline);
    }

    function verifyDS(uint256 _purpose) external view returns (bool) {
        if (!purposeRegistry[_purpose].exists) {
            return false;
        }
        return purposeRegistry[_purpose].actorApprovals[1];
    }

    function existsPurpose(uint256 _purpose) external view returns (bool) {
        return purposeRegistry[_purpose].exists;
    }

    function grantConsent(uint256 _purpose) external onlyValidActor {
        require(purposeRegistry[_purpose].exists, "State Error: Target purpose missing.");
        
        if (tx.origin == dataController) purposeRegistry[_purpose].actorApprovals[0] = true;
        else if (tx.origin == dataSubject) purposeRegistry[_purpose].actorApprovals[1] = true;
        else if (tx.origin == dataProcessor) purposeRegistry[_purpose].actorApprovals[2] = true;
        
        emit ApprovalChanged(_purpose, tx.origin == dataController ? 0 : (tx.origin == dataSubject ? 1 : 2), true);
    }

    function revokeConsent(uint256 _purpose) external onlyValidActor {
        require(purposeRegistry[_purpose].exists, "State Error: Target purpose missing.");
        
        if (tx.origin == dataController) purposeRegistry[_purpose].actorApprovals[0] = false;
        else if (tx.origin == dataSubject) purposeRegistry[_purpose].actorApprovals[1] = false;
        else if (tx.origin == dataProcessor) purposeRegistry[_purpose].actorApprovals[2] = false;
        
        emit ApprovalChanged(_purpose, tx.origin == dataController ? 0 : (tx.origin == dataSubject ? 1 : 2), false);
    }

    function revokeAllConsents() external onlyValidActor {
        require(processingPurposes.length > 0, "State Error: No records registered.");
        uint8 actorType = tx.origin == dataController ? 0 : (tx.origin == dataSubject ? 1 : 2);
        
        for (uint256 i = 0; i < processingPurposes.length; i++) {
            purposeRegistry[processingPurposes[i]].actorApprovals[actorType] = false;
        }
    }

     
    function getPurposes() external view returns (uint256[] memory) { return processingPurposes; }
    function getDataSubject() external view returns (address) { return dataSubject; }
    function getController() external view returns (address) { return dataController; }
    function getProcessor() external view returns (address) { return dataProcessor; }
    function getDataPurpose(uint256 _purpose) external view returns (uint256) { return purposeRegistry[_purpose].data; }
}
