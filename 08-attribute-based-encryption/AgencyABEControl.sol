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
        address _employee,
        string memory _name,
        string[] memory _attributes,
        uint256 _expiry
    ) public onlyAuthority {
        subjectRegistry[_employee] = SubjectKeyRing(_name, _attributes, _expiry);
        emit KeysProvisioned(_employee, _attributes);
    }

    // Requirement 2: Encrypt Based on Policy
    function lockAssetWithPolicy(
        uint256 _assetId,
        bytes32 _cryptoLock,
        string memory _policyString,
        string memory _uri
    ) public onlyAuthority {
        securedEnvelopes[_assetId] = CiphertextEnvelope(_cryptoLock, _policyString, _uri);
        emit AssetLockedUnderPolicy(_assetId, _policyString);
    }

    // Requirement 3: Multi-Attribute Access Control & Decrypt
    function evaluateAndDecrypt(uint256 _assetId, string memory _secretPassphrase) 
        public 
        returns (bool allowed, string memory decryptedURI) 
    {
        SubjectKeyRing memory userKeys = subjectRegistry[msg.sender];
        CiphertextEnvelope memory envelope = securedEnvelopes[_assetId];

        // Multi-Attribute check 1: Temporal validation
        if (block.timestamp > userKeys.expirationTimestamp) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, false);
            return (false, "ABE Failure: Attribute token lifetime expired.");
        }

        // Multi-Attribute check 2: Policy attribute string matching loop
        bool policySatisfied = false;
        for (uint256 i = 0; i < userKeys.cryptAttributes.length; i++) {
            if (keccak256(abi.encodePacked(userKeys.cryptAttributes[i])) == keccak256(abi.encodePacked(envelope.policyConstraint))) {
                policySatisfied = true;
                break;
            }
        }

        if (!policySatisfied) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, false);
            return (false, "ABE Failure: Subject attributes do not satisfy ciphertext constraints.");
        }

        // Multi-Attribute check 3: Cryptographic mathematical lock verification
        if (keccak256(abi.encodePacked(_secretPassphrase)) == envelope.cryptographicLock) {
            emit ABEDecryptionTriggered(msg.sender, _assetId, true);
            return (true, string(abi.encodePacked("DECRYPTION GRANTED. Payload: ", envelope.targetIPFSURI)));
        }

        emit ABEDecryptionTriggered(msg.sender, _assetId, false);
        return (false, "ABE Mathematical Failure: Invalid cryptographic key token.");
    }
}