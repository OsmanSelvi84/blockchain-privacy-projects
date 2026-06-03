// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DynamicConsent {
    struct Consent {
        bool isActive;
        string purpose;
        string dataType;
        uint256 timestamp;
    }

    mapping(address => mapping(address => Consent)) private consents;

    event ConsentGiven(address indexed patient, address indexed provider, string purpose, string dataType);
    event ConsentUpdated(address indexed patient, address indexed provider, string newPurpose, string newDataType);
    event ConsentRevoked(address indexed patient, address indexed provider);

    function giveConsent(address provider, string memory purpose, string memory dataType) public {
        require(provider != address(0), "Invalid provider address");
        require(bytes(purpose).length > 0, "Purpose is required");
        require(bytes(dataType).length > 0, "Data type is required");

        consents[msg.sender][provider] = Consent({
            isActive: true,
            purpose: purpose,
            dataType: dataType,
            timestamp: block.timestamp
        });

        emit ConsentGiven(msg.sender, provider, purpose, dataType);
    }

    function updateConsent(address provider, string memory newPurpose, string memory newDataType) public {
        require(consents[msg.sender][provider].timestamp != 0, "Consent does not exist");
        require(consents[msg.sender][provider].isActive, "Consent is not active");
        require(bytes(newPurpose).length > 0, "Purpose is required");
        require(bytes(newDataType).length > 0, "Data type is required");

        consents[msg.sender][provider].purpose = newPurpose;
        consents[msg.sender][provider].dataType = newDataType;
        consents[msg.sender][provider].timestamp = block.timestamp;

        emit ConsentUpdated(msg.sender, provider, newPurpose, newDataType);
    }

    function revokeConsent(address provider) public {
        require(consents[msg.sender][provider].timestamp != 0, "Consent does not exist");
        require(consents[msg.sender][provider].isActive, "Consent is not active");

        consents[msg.sender][provider].isActive = false;
        consents[msg.sender][provider].timestamp = block.timestamp;

        emit ConsentRevoked(msg.sender, provider);
    }

    function checkConsent(address patient, address provider) public view returns (bool) {
        return consents[patient][provider].isActive;
    }

    function getConsent(address patient, address provider)
        public
        view
        returns (bool isActive, string memory purpose, string memory dataType, uint256 timestamp)
    {
        Consent memory consent = consents[patient][provider];
        return (consent.isActive, consent.purpose, consent.dataType, consent.timestamp);
    }
}
