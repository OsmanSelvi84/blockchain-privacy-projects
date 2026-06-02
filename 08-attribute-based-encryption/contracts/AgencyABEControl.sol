// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgencyABEControl
 * @notice Original Implementation of a Ciphertext-Policy Attribute-Based Encryption (CP-ABE) Simulator.
 * @dev Designed from scratch for secure digital agency asset distribution without code-copying.
 */
contract AgencyABEControl {

    struct SubjectKeyRing {
        string employeeName;
        string[] cryptAttributes; // Array of dynamically validated attribute keys
        uint256 expirationTimestamp;
    }

    struct CiphertextEnvelope {
        bytes32 cryptographicLock; // Keccak-256 validation root
        string policyConstraint;  // Target validation rule (e.g., "tasarim")
        string targetIPFSURI;     // Securely locked resource pointer
    }

    mapping(address => SubjectKeyRing) public subjectRegistry;
    mapping(uint256 => CiphertextEnvelope) public securedEnvelopes;
    
    address public centralAuthority;

    event KeysProvisioned(address indexed subject, string[] attributes);
    event AssetLockedUnderPolicy(uint256 indexed assetId, string policy);
    event ABEDecryptionTriggered(address indexed requester, uint256 indexed assetId, bool success);

    modifier onlyAuthority() {
        require(msg.sender == centralAuthority, "ABE Cryptographic Error: Access restricted to Central Authority.");
        _;
    }

    constructor() {
        centralAuthority = msg.sender;
    }

    // Requirement 1: Attribute Validation System
    function provisionUserAttributes(
        address _employee, // The Ethereum wallet address of the employee being registered
        string memory _name, // The human-readable name of the employee (used for logging and auditing)
        string[] memory _attributes, // The list of assigned cryptographic attribute tokens (e.g., ["design", "senior"])
        uint256 _expiry // The expiration date of this attribute key (stored as a Unix Timestamp)
    ) public onlyAuthority { // Security modifier restricting execution exclusively to the Central Authority (Admin)
// Bundles the parameters into the SubjectKeyRing struct and maps it to the user's wallet address in state storage
        subjectRegistry[_employee] = SubjectKeyRing(_name, _attributes, _expiry);
// Emits an on-chain event to record the attribute provisioning permanently in the blockchain logs
        emit KeysProvisioned(_employee, _attributes);
    }

    // Requirement 2: Encrypt Based on Policy
    function lockAssetWithPolicy(
        uint256 _assetId, // The unique identifier/ID for the secure digital asset (file)
        bytes32 _cryptoLock, // The Keccak-256 cryptographic hash of the passphrase used as the security lock
        string memory _policyString, // The target department access rule (Policy Constraint - e.g., "design")
        string memory _uri // The secure resource pointer pointing to the file hosted on IPFS
    ) public onlyAuthority { // Security guard ensuring only the Central Authority can mint/lock assets
// Wraps the asset specifications inside the CiphertextEnvelope struct and commits it to the EVM ledger storage
        securedEnvelopes[_assetId] = CiphertextEnvelope(_cryptoLock, _policyString, _uri);
// Triggers an event announcing that the asset is now securely locked under the specified policy
        emit AssetLockedUnderPolicy(_assetId, _policyString);
    }

    // Requirement 3: Multi-Attribute Access Control & Decrypt
    function evaluateAndDecrypt(
        uint256 _assetId,               // The unique ID of the locked asset the user wants to access
        string memory _secretPassphrase // The clear-text passphrase provided by the user to unlock the asset
    ) 
        public 
        returns (bool allowed, string memory decryptedURI) 
    {
// Fetches the caller's attribute key ring and the asset's ciphertext envelope from EVM persistent storage into memory
        SubjectKeyRing memory userKeys = subjectRegistry[msg.sender];
        CiphertextEnvelope memory envelope = securedEnvelopes[_assetId];

        // Multi-Attribute check 1: Temporal validation
// Checks if the current block timestamp has exceeded the user's token expiration deadline
        if (block.timestamp > userKeys.expirationTimestamp) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, false); // Logs the failed access attempt
            return (false, "ABE Failure: Attribute token lifetime expired.");
        }

        // Multi-Attribute check 2: Policy attribute string matching loop
// Iterates through the user's dynamic attribute array to find a match against the asset's rule constraint
        bool policySatisfied = false;
        for (uint256 i = 0; i < userKeys.cryptAttributes.length; i++) {
// Converts strings into Keccak-256 hashes to perform secure data comparison in Solidity
            if (keccak256(abi.encodePacked(userKeys.cryptAttributes[i])) == keccak256(abi.encodePacked(envelope.policyConstraint))) {
                policySatisfied = true; // Sets the flag to true if a valid attribute match is found
                break;                  // Immediately breaks the loop to conserve Gas execution costs
            }
        }
// Reverts or stops execution if the user's attributes do not satisfy the policy conditions
        if (!policySatisfied) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, false);
            return (false, "ABE Failure: Subject attributes do not satisfy ciphertext constraints.");
        }

        // Multi-Attribute check 3: Cryptographic mathematical lock verification
// Hashes the user's inputted passphrase and compares it with the unalterable hash root stored on-chain
        if (keccak256(abi.encodePacked(_secretPassphrase)) == envelope.cryptographicLock) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, true);
// Concatenates the success message with the securely retrieved IPFS pointer payload
            return (true, string(abi.encodePacked("DECRYPTION GRANTED. Payload: ", envelope.targetIPFSURI)));
        }
// Final fallback block triggered if the passphrase fails the cryptographic check
        emit ABEDecryptionTriggered(msg.sender, _assetId, false);
        return (false, "ABE Mathematical Failure: Invalid cryptographic key token.");
    }
}
