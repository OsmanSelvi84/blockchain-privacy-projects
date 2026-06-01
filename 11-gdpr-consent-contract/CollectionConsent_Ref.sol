// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProcessingConsent_Ref.sol";

contract CollectionConsent {
   
    address private dataSubject;
    address private controller;
    address[] private recipients;
    uint256 data;
    uint256 beginningDate;
    uint256 expirationDate;
    uint8[2] private valid;
    bool private erasure;

    mapping(uint256 => bool) private defaultPurposes;
    mapping(address => bool) private processorsBlacklist;

    struct ProcessingConsentStruct {
        bool exists;
        address processingConsentContractAddress;
    }
    mapping(address => ProcessingConsentStruct) private processingConsentContracts;
    address[] private processors;

    constructor(address _dataController, address[] memory _recipients, uint256 _data, uint256 duration, uint256[] memory _defaultPurposes) {
        dataSubject = msg.sender;
        controller = _dataController;
        recipients = _recipients;
        data = _data;
        beginningDate = block.timestamp;
        expirationDate = beginningDate + duration;

        for (uint256 i = 0; i < _defaultPurposes.length; i++) {
            defaultPurposes[_defaultPurposes[i]] = true;
        }
        
        valid = [1, 0];
    }
    
    function newPurpose(address processor, uint256 processingPurpose, uint256 _data, uint256 duration) external contractValidity onlyController {
        require(!processorsBlacklist[processor], "This processor is in the Blacklist.");
        
        ProcessingConsent processingConsentContract;
        if (!processingConsentContracts[processor].exists) {
            processingConsentContract = new ProcessingConsent(controller, dataSubject, processor);
            processingConsentContracts[processor] = ProcessingConsentStruct(true, address(processingConsentContract));
            processors.push(processor);
        } else {
            processingConsentContract = ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress);
        }

        require(!processingConsentContract.existsPurpose(processingPurpose), "Processor has already requested consent");

        if (defaultPurposes[processingPurpose])
            processingConsentContract.newPurpose(processingPurpose, _data, duration, 1);
        else
            processingConsentContract.newPurpose(processingPurpose, _data, duration, 0);
    }

    function grantConsent() external {
        require(tx.origin == controller || tx.origin == dataSubject, "Actor not allowed");
        if (tx.origin == dataSubject) valid[0] = 1;
        else if (tx.origin == controller) valid[1] = 1;
    }
    
    function revokeConsent() external {
        require(tx.origin == controller || tx.origin == dataSubject, "Actor not allowed");
        if (tx.origin == dataSubject) valid[0] = 0;
        else if (tx.origin == controller) valid[1] = 0;
    }

    function verify() external view returns (bool) {
        uint256 timestamp = block.timestamp;
        bool isValid = valid[0] != 0 && valid[1] != 0 && timestamp >= beginningDate && timestamp <= expirationDate;
        return isValid;
    }

    function eraseData() external onlyDataSubject {
        erasure = true;
    }

    function modifyData(uint256 _data) external onlyDataSubject {
        data = _data;
    }

    function revokeConsentPurpose(uint256 purpose) external onlyDataSubject {
        address processor;
        for (uint256 i = 0; i < processors.length; i++) {
            processor = processors[i];
            if (ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress).verifyDS(purpose))
                ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress).revokeConsent(purpose);
        }
        defaultPurposes[purpose] = false;
    }

    function revokeConsentProcessor(address processor) external onlyDataSubject {
        require(processingConsentContracts[processor].exists, "Processor is not processing data");
        ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress).revokeAllConsents();
        processorsBlacklist[processor] = true;
    }

    function getData() external view returns (uint256) { return data; }
    
    function getProcessingConsentSC(address processor) external view returns (address) {
        require(processingConsentContracts[processor].exists, "Processor has not requested data");
        return processingConsentContracts[processor].processingConsentContractAddress;
    }

    function getAllProcessors() external view returns (address[] memory) { return processors; }

    modifier onlyDataSubject() {
        require(msg.sender == dataSubject, "Only the data Subject is allowed");
        _;
    }
    
    modifier onlyController() {
        require(msg.sender == controller, "Only the data Controller is allowed");
        _;
    }
    
    modifier contractValidity() {
        uint256 timestamp = block.timestamp;
        require(valid[0] != 0 && valid[1] != 0 && timestamp >= beginningDate && timestamp <= expirationDate, "Consent contract is not valid.");
        _;
    }
}
