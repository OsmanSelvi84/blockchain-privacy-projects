// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DIDRegistry {
    struct DIDDocument {
        address owner;
        string document;
        uint256 created;
        uint256 updated;
        bool active;
    }

    mapping(string => DIDDocument) private didRegistry;
    mapping(address => string[]) private ownerDIDs;

    event DIDCreated(string indexed did, address indexed owner);
    event DIDUpdated(string indexed did, address indexed owner);
    event DIDRevoked(string indexed did, address indexed owner);

    modifier onlyDIDOwner(string memory did) {
        require(didRegistry[did].owner == msg.sender, "Not DID owner");
        require(didRegistry[did].active, "DID is revoked");
        _;
    }

    function createDID(string memory did, string memory document) public {
        require(didRegistry[did].owner == address(0), "DID already exists");
        didRegistry[did] = DIDDocument({
            owner: msg.sender,
            document: document,
            created: block.timestamp,
            updated: block.timestamp,
            active: true
        });
        ownerDIDs[msg.sender].push(did);
        emit DIDCreated(did, msg.sender);
    }

    function updateDID(string memory did, string memory newDocument) 
        public onlyDIDOwner(did) {
        didRegistry[did].document = newDocument;
        didRegistry[did].updated = block.timestamp;
        emit DIDUpdated(did, msg.sender);
    }

    function revokeDID(string memory did) public onlyDIDOwner(did) {
        didRegistry[did].active = false;
        emit DIDRevoked(did, msg.sender);
    }

    function resolveDID(string memory did) public view returns (
        address owner,
        string memory document,
        uint256 created,
        uint256 updated,
        bool active
    ) {
        require(didRegistry[did].owner != address(0), "DID not found");
        DIDDocument memory doc = didRegistry[did];
        return (doc.owner, doc.document, doc.created, doc.updated, doc.active);
    }

    function getDIDsByOwner(address owner) public view returns (string[] memory) {
        return ownerDIDs[owner];
    }
}
