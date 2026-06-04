pragma solidity ^0.8.28;

contract DynamicConsent {
    // I keep the consent details together in one struct.
    // This makes it easier to update or read a patient's permission later.
    struct Consent {
        bool isActive;
        string purpose;
        string dataType;
        uint256 timestamp;
    }

    // Each patient can give consent to different healthcare providers.
    // First address is the patient, second address is the provider.
    mapping(address => mapping(address => Consent)) private consents;

    // These events create a simple audit trail on the blockchain.
    // They help show when a consent was given, updated, or revoked.
    event ConsentGiven(address indexed patient, address indexed provider, string purpose, string dataType);
    event ConsentUpdated(address indexed patient, address indexed provider, string newPurpose, string newDataType);
    event ConsentRevoked(address indexed patient, address indexed provider);

    // A patient gives permission to a provider for a specific purpose and data type.
    // For example: treatment purpose and blood test data.
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

    // If the patient changes their decision, they can update the purpose or data type.
    // I check that the consent exists first, so a user cannot update an empty record.
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

    // Consent should not be permanent in healthcare systems.
    // The patient can revoke access whenever they want.
    function revokeConsent(address provider) public {
        require(consents[msg.sender][provider].timestamp != 0, "Consent does not exist");
        require(consents[msg.sender][provider].isActive, "Consent is not active");

        consents[msg.sender][provider].isActive = false;
        consents[msg.sender][provider].timestamp = block.timestamp;

        emit ConsentRevoked(msg.sender, provider);
    }

    // This is a quick check function.
    // It only returns whether the consent is currently active or not.
    function checkConsent(address patient, address provider) public view returns (bool) {
        return consents[patient][provider].isActive;
    }

    // This function returns the full consent details.
    // It is useful for testing and for explaining the project during presentation.
    function getConsent(address patient, address provider)
        public
        view
        returns (bool isActive, string memory purpose, string memory dataType, uint256 timestamp)
    {
        Consent memory consent = consents[patient][provider];
        return (consent.isActive, consent.purpose, consent.dataType, consent.timestamp);
    }
}
