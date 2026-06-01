// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./ProcessingConsent.sol";
contract CollectionConsent {
    
    
    address public immutable dataSubject;
    address public immutable dataController;
    address[] private recipients;

    uint256 private dataField;
    uint256 public immutable beginningDate;
    uint256 public immutable expirationDate;

    
    bool private isSubjectApproved;
    bool private isControllerApproved;
    bool private isDataErased;

    mapping(uint256 => bool) private defaultPurposesRegistry;
    mapping(address => bool) private processorBlacklist;

    struct ProcessingConsentStruct {
        bool exists;
        address processingConsentContractAddress;
    }
    
    mapping(address => ProcessingConsentStruct) private processingConsentContracts;
    address[] private registeredProcessors;

    
    event ConsentStateChanged(bool subjectStatus, bool controllerStatus);
    event ProcessingContractDeployed(address indexed processor, address contractAddress);
    event DataPermanentlyModified(uint256 newValue);

    modifier onlyDataSubject() {
        require(msg.sender == dataSubject, "Auth Error: Data Subject identity required.");
        _;
    }
    
    modifier onlyController() {
        require(msg.sender == dataController, "Auth Error: Controller identity required.");
        _;
    }
    
    modifier contractValidity() {
        require(
            isSubjectApproved && isControllerApproved && 
            block.timestamp >= beginningDate && block.timestamp <= expirationDate, 
            "Validity Error: Contract is currently inactive or expired."
        );
        _;
    }

    constructor(
        address _dataController, 
        address[] memory _recipients, 
        uint256 _data, 
        uint256 _duration, 
        uint256[] memory _defaultPurposes
    ) {
        dataSubject = msg.sender;
        dataController = _dataController;
        recipients = _recipients;
        dataField = _data;
        beginningDate = block.timestamp;
        expirationDate = block.timestamp + _duration;

        for (uint256 i = 0; i < _defaultPurposes.length; i++) {
            defaultPurposesRegistry[_defaultPurposes[i]] = true;
        }
        
        
        isSubjectApproved = true;
        isControllerApproved = false;
        isDataErased = false;
    }

    
    function newPurpose(address processor, uint256 processingPurpose, uint256 _data, uint256 duration) external contractValidity onlyController {
        require(!processorBlacklist[processor], "Restriction Error: Processor is blacklisted.");
        
        ProcessingConsent processingConsentContract;
        
        if (!processingConsentContracts[processor].exists) {
            
            processingConsentContract = new ProcessingConsent(dataController, dataSubject, processor);
            processingConsentContracts[processor] = ProcessingConsentStruct(true, address(processingConsentContract));
            registeredProcessors.push(processor);
        } else {
            processingConsentContract = ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress);
        }

        require(!processingConsentContract.existsPurpose(processingPurpose), "State Error: Purpose already requested.");

        if (defaultPurposesRegistry[processingPurpose]) {
            processingConsentContract.newPurpose(processingPurpose, _data, duration, 1);
        } else {
            processingConsentContract.newPurpose(processingPurpose, _data, duration, 0);
        }
        
        emit ProcessingContractDeployed(processor, address(processingConsentContract));
    }

    function grantConsent() external {
        require(tx.origin == dataController || tx.origin == dataSubject, "Auth Error: Unauthorized actor.");
        
        if (tx.origin == dataSubject) isSubjectApproved = true;
        else if (tx.origin == dataController) isControllerApproved = true;
        
        emit ConsentStateChanged(isSubjectApproved, isControllerApproved);
    }
    
    function revokeConsent() external {
        require(tx.origin == dataController || tx.origin == dataSubject, "Auth Error: Unauthorized actor.");
        
        if (tx.origin == dataSubject) isSubjectApproved = false;
        else if (tx.origin == dataController) isControllerApproved = false;
        
        emit ConsentStateChanged(isSubjectApproved, isControllerApproved);
    }

    function verify() external view returns (bool) {
        bool isValid = isSubjectApproved && isControllerApproved && block.timestamp >= beginningDate && block.timestamp <= expirationDate;
        return isValid;
    }

    function eraseData() external onlyDataSubject {
        isDataErased = true;
    }

    function modifyData(uint256 _data) external onlyDataSubject {
        dataField = _data;
        emit DataPermanentlyModified(_data);
    }

    function revokeConsentPurpose(uint256 purpose) external onlyDataSubject {
        for (uint256 i = 0; i < registeredProcessors.length; i++) {
            address processorAddr = registeredProcessors[i];
            ProcessingConsent subContract = ProcessingConsent(processingConsentContracts[processorAddr].processingConsentContractAddress);
            if (subContract.verifyDS(purpose)) {
                subContract.revokeConsent(purpose);
            }
        }
        defaultPurposesRegistry[purpose] = false;
    }

    function revokeConsentProcessor(address processor) external onlyDataSubject {
        require(processingConsentContracts[processor].exists, "Query Error: Processor lookup failed.");
        
        ProcessingConsent(processingConsentContracts[processor].processingConsentContractAddress).revokeAllConsents();
        processorBlacklist[processor] = true;
    }

    
    function getData() external view returns (uint256) { return dataField; }
    
    function getProcessingConsentSC(address processor) external view returns (address) {
        require(processingConsentContracts[processor].exists, "Query Error: Invalid processor address.");
        return processingConsentContracts[processor].processingConsentContractAddress;
    }
    function getAllProcessors() external view returns (address[] memory) { return registeredProcessors; }
}

