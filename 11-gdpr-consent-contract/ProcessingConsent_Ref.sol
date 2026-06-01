// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProcessingConsent {
   
    address private collectionConsentSC;
    address private dataSubject;
    address private controller;
    address private processor;

    struct ProcessingPurposeStruct {
        bool exists;
        uint256 data;
        uint256 beginningDate;
        uint256 expirationDate;
        uint8[3] valid; 
    }
    mapping(uint256 => ProcessingPurposeStruct) private purposes;
    
    uint256[] private processingPurposes; 

    enum PURPOSE { ModelTraining, ModelTesting, Profiling, ImprovingService, Advertising }

    
    constructor(address _controller, address _dataSubject, address _processor) {
        require(tx.origin == _controller, "Transaction sender does not match with the Controller");
        collectionConsentSC = msg.sender;
        controller = _controller;
        dataSubject = _dataSubject;
        processor = _processor;
    }

    function newPurpose(uint256 _purpose, uint256 data, uint256 duration, uint256 defaultTrue) external {
        require(msg.sender == collectionConsentSC, "New Processing purpose can only be added from the Consent SC");
        require(tx.origin == controller, "Only controller can add a new Processing purpose");
        require(!purposes[_purpose].exists, "Processing purpose already exists.");

        uint8[3] memory validFlags;
        if (defaultTrue == 1)
            validFlags = [1, 1, 0];
        else
            validFlags = [1, 0, 0];

        purposes[_purpose] = ProcessingPurposeStruct(
            true, 
            data,
            block.timestamp,
            block.timestamp + duration,
            validFlags
        );

        processingPurposes.push(_purpose);
    }
    
    function modifyData(uint256 _purpose, uint256 _data) external onlyDataSubject {
        purposes[_purpose].data = _data;
    }

    function verify(uint256 _purpose) external view returns (bool) {
        require(purposes[_purpose].exists, "Processing purpose does not exists.");
        uint256 timestamp = block.timestamp;
        bool isValid = (purposes[_purpose].valid[0] & 
                        purposes[_purpose].valid[1] & 
                        purposes[_purpose].valid[2]) != 0 && 
                        timestamp >= purposes[_purpose].beginningDate && 
                        timestamp <= purposes[_purpose].expirationDate;
        return isValid;
    }

    function verifyDS(uint256 _purpose) external view returns (bool) {
        if (!purposes[_purpose].exists)
            return false;
        else 
            return purposes[_purpose].valid[1] != 0;
    }

    function existsPurpose(uint256 _purpose) external view returns (bool) {
        return purposes[_purpose].exists;
    }

    function getPurposes() external view returns (uint256[] memory) { return processingPurposes; }
    function getDataSubject() external view returns (address) { return dataSubject; }
    function getController() external view returns (address) { return controller; }
    function getProcessor() external view returns (address) { return processor; }
    function getDataPurpose(uint256 _purpose) external view returns (uint256) { return purposes[_purpose].data; }

    function grantConsent(uint256 _purpose) external {
        require(tx.origin == controller || tx.origin == dataSubject || tx.origin == processor, "Actor not allowed");
        require(purposes[_purpose].exists, "Processing purpose does not exists.");
        
        if (tx.origin == controller) purposes[_purpose].valid[0] = 1;
        else if (tx.origin == dataSubject) purposes[_purpose].valid[1] = 1;
        else if (tx.origin == processor) purposes[_purpose].valid[2] = 1;
    }

    function revokeConsent(uint256 _purpose) external {
        require(tx.origin == controller || tx.origin == dataSubject || tx.origin == processor, "Actor not allowed");
        require(purposes[_purpose].exists, "Processing purpose does not exists.");
        
        if (tx.origin == controller) purposes[_purpose].valid[0] = 0;
        else if (tx.origin == dataSubject) purposes[_purpose].valid[1] = 0;
        else if (tx.origin == processor) purposes[_purpose].valid[2] = 0;
    }

    function revokeAllConsents() external {
        require(tx.origin == controller || tx.origin == dataSubject || tx.origin == processor, "Actor not allowed");
        require(processingPurposes.length > 0, "No Processing purposes on this SC.");
        
        if (tx.origin == controller) revokeAllConsentsAux(0);
        else if (tx.origin == dataSubject) revokeAllConsentsAux(1);
        else if (tx.origin == processor) revokeAllConsentsAux(2);
    }

    function revokeAllConsentsAux(uint256 p) private {
        for (uint256 i = 0; i < processingPurposes.length; i++) {
            purposes[processingPurposes[i]].valid[p] = 0;
        }
    }

    modifier onlyDataSubject() {
        require(tx.origin == dataSubject, "Only the data Subject is allowed");
        _;
    }
}
