pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./AnonymousAttestation.sol";

contract CertificationAuthority {

    address public admin;

    mapping(address => RSUAuthority) private rsuAuthorities;
    mapping(address => ServiceProfile[]) private rsuProfiles;

    mapping(string => bool) private validCredentials;

    event RSURegistered(string rsuName);

    constructor() public {
        admin = msg.sender;
    }

    struct ServiceProfile {
        string service_name;
    }

    struct RSUAuthority {
        string rsu_name;
        string rsu_id;
        string rsu_endpoint;
        uint256 registration_time;
    }

    function registerRSU(
        address _address,
        string memory _rsu_name,
        string memory _rsu_id,
        string memory _rsu_endpoint,
        ServiceProfile[] memory _profiles
    ) public returns(bool) {

        require(msg.sender == admin, "Only admin");

        require(
            bytes(rsuAuthorities[_address].rsu_name).length == 0,
            "Already registered"
        );

        require(_profiles.length > 0, "Need profile");

        rsuAuthorities[_address] = RSUAuthority(
            _rsu_name,
            _rsu_id,
            _rsu_endpoint,
            now
        );

        for(uint i = 0; i < _profiles.length; i++) {
            rsuProfiles[_address].push(_profiles[i]);
        }

        emit RSURegistered(_rsu_name);

        return true;
    }

    function issueAttestationCredential(string memory _credentialId)
        public
        returns(bool)
    {
        require(
            bytes(rsuAuthorities[msg.sender].rsu_name).length > 0,
            "Not RSU"
        );

        validCredentials[_credentialId] = true;
        return true;
    }

    function isCredentialValid(string memory _credentialId)
        public
        view
        returns(bool)
    {
        return validCredentials[_credentialId];
    }

    function getRSUData(address _address)
        public
        view
        returns(
            string memory,
            string memory,
            string memory,
            ServiceProfile[] memory
        )
    {
        require(
            AnonymousAttestation(msg.sender).admin() == admin,
            "Unauthorized"
        );

        RSUAuthority memory temp = rsuAuthorities[_address];

        require(bytes(temp.rsu_name).length > 0, "Not found");

        return (
            temp.rsu_name,
            temp.rsu_id,
            temp.rsu_endpoint,
            rsuProfiles[_address]
        );
    }

    function isRSUAuthorized(address _address)
        public
        view
        returns(bool)
    {
        return bytes(rsuAuthorities[_address].rsu_name).length > 0;
    }
}