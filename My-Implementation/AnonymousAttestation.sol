pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./CertificationAuthority.sol";

contract AnonymousAttestation {

    address public admin;
    CertificationAuthority public ca;

    constructor(CertificationAuthority _ca) public {
        admin = msg.sender;
        ca = _ca;
    }

    struct AttestationRecord {

        string pseudonymVehicleId;

        string credentialId;

        string signature;

        string messageType;

        string timestamp;

        string rsu_name;
        string rsu_id;
        string rsu_endpoint;

        bool revoked;

        uint256 created_at;

        uint256 expiryTime;

        string payload;
    }

    mapping(bytes32 => AttestationRecord) private attestations;

    mapping(string => bool) private usedPseudonyms;

    event AttestationCreated(bytes32 id);
    event AttestationRevoked(bytes32 id);

    function stringToBytes32(string memory source)
        private
        pure
        returns(bytes32 result)
    {
        bytes memory temp = bytes(source);
        if(temp.length == 0) return 0x0;

        assembly {
            result := mload(add(source, 32))
        }
    }

    function createAttestation(
        string memory _id,
        string memory _pseudonymVehicleId,
        string memory _credentialId,
        string memory _signature,
        string memory _messageType,
        string memory _payload,
        string memory _timestamp
    ) public {

        require(
            ca.isRSUAuthorized(msg.sender),
            "RSU not authorized"
        );

        require(
            ca.isCredentialValid(_credentialId),
            "Invalid credential"
        );

        require(
            !usedPseudonyms[_pseudonymVehicleId],
            "Pseudonym used"
        );

        usedPseudonyms[_pseudonymVehicleId] = true;

        bytes32 id = stringToBytes32(_id);

        require(
            bytes(attestations[id].timestamp).length == 0,
            "Already exists"
        );

        (
            string memory rsuName,
            string memory rsuId,
            string memory rsuEndpoint,
            CertificationAuthority.ServiceProfile[] memory p
        ) = ca.getRSUData(msg.sender);

        require(p.length > 0, "No profile");

        attestations[id] = AttestationRecord(
            _pseudonymVehicleId,
            _credentialId,
            _signature,
            _messageType,
            _timestamp,
            rsuName,
            rsuId,
            rsuEndpoint,
            false,
            now,
            now + 1 days,
            _payload
        );

        emit AttestationCreated(id);
    }

    function verifyAttestation(string memory _id)
        public
        view
        returns(
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            bool
        )
    {
        bytes32 id = stringToBytes32(_id);

        AttestationRecord memory temp = attestations[id];

        require(bytes(temp.timestamp).length != 0, "Not found");

        require(now < temp.expiryTime, "Expired");

        return (
            temp.pseudonymVehicleId,
            temp.messageType,
            temp.timestamp,
            temp.rsu_name,
            temp.rsu_id,
            temp.rsu_endpoint,
            temp.revoked
        );
    }

    function revokeAttestation(string memory _id) public {

        require(
            ca.isRSUAuthorized(msg.sender),
            "Not RSU"
        );

        bytes32 id = stringToBytes32(_id);

        require(bytes(attestations[id].timestamp).length != 0, "Not found");

        attestations[id].revoked = true;

        emit AttestationRevoked(id);
    }
}