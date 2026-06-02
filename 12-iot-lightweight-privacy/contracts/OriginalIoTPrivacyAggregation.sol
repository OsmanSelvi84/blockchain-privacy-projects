// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OriginalIoTPrivacyAggregation {
    enum RequestStatus {
        SETUP,
        IN_PROGRESS,
        FINISHED
    }

    struct Device {
        address owner;
        address signer;
        bytes32 policyHash;
        bool active;
    }

    struct PrivateRequest {
        address consumer;
        address aggregator;
        bytes32 termsHash;
        bytes32 aggregationHash;
        bytes32 encryptionKeyCommitment;
        uint256 expiresAt;
        RequestStatus status;
        uint256 acceptedCount;
        bytes32 resultHash;
    }

    struct PrivateReading {
        bytes32 payloadHash;
        bytes32 commitment;
        bytes32 nullifierHash;
        bool accepted;
    }

    mapping(bytes32 => Device) private devices;
    mapping(bytes32 => PrivateRequest) private requests;
    mapping(bytes32 => mapping(bytes32 => bool)) public policyMatched;
    mapping(bytes32 => mapping(bytes32 => PrivateReading)) private readings;
    mapping(bytes32 => mapping(bytes32 => bool)) public usedNullifiers;

    event DeviceRegistered(bytes32 indexed deviceId, address indexed owner, address indexed signer, bytes32 policyHash);
    event RequestCreated(
        bytes32 indexed requestId,
        address indexed consumer,
        address indexed aggregator,
        bytes32 termsHash,
        bytes32 aggregationHash,
        bytes32 encryptionKeyCommitment,
        uint256 expiresAt
    );
    event PolicyMatched(bytes32 indexed requestId, bytes32 indexed deviceId, bool matched);
    event RequestOpened(bytes32 indexed requestId);
    event PrivateReadingSubmitted(
        bytes32 indexed requestId,
        bytes32 indexed deviceId,
        bytes32 payloadHash,
        bytes32 commitment,
        bytes32 nullifierHash,
        address relayer
    );
    event RequestFinalized(bytes32 indexed requestId, bytes32 resultHash);

    error DeviceAlreadyRegistered(bytes32 deviceId);
    error DeviceNotFound(bytes32 deviceId);
    error RequestAlreadyExists(bytes32 requestId);
    error RequestNotFound(bytes32 requestId);
    error InvalidAddress();
    error InvalidDeviceSignature(address recovered);
    error InvalidState(RequestStatus status);
    error NotConsumer(address caller);
    error NotDeviceOwner(address caller);
    error NotAggregator(address caller);
    error PolicyNotMatched(bytes32 requestId, bytes32 deviceId);
    error ReadingAlreadySubmitted(bytes32 requestId, bytes32 deviceId);
    error NullifierAlreadyUsed(bytes32 nullifierHash);
    error RequestExpired(uint256 expiresAt);
    error ZeroValue();

    modifier onlyConsumer(bytes32 requestId) {
        PrivateRequest storage request = requests[requestId];
        if (request.consumer == address(0)) revert RequestNotFound(requestId);
        if (request.consumer != msg.sender) revert NotConsumer(msg.sender);
        _;
    }

    modifier onlyDeviceOwner(bytes32 deviceId) {
        Device storage device = devices[deviceId];
        if (device.owner == address(0)) revert DeviceNotFound(deviceId);
        if (device.owner != msg.sender) revert NotDeviceOwner(msg.sender);
        _;
    }

    function registerDevice(bytes32 deviceId, address signer, bytes32 policyHash) external {
        if (deviceId == bytes32(0) || policyHash == bytes32(0)) revert ZeroValue();
        if (signer == address(0)) revert InvalidAddress();
        if (devices[deviceId].owner != address(0)) revert DeviceAlreadyRegistered(deviceId);

        devices[deviceId] = Device({
            owner: msg.sender,
            signer: signer,
            policyHash: policyHash,
            active: true
        });

        emit DeviceRegistered(deviceId, msg.sender, signer, policyHash);
    }

    function createRequest(
        bytes32 requestId,
        bytes32 termsHash,
        bytes32 aggregationHash,
        uint256 waitingTimeSeconds,
        address aggregator,
        bytes32 encryptionKeyCommitment
    ) external {
        if (
            requestId == bytes32(0) ||
            termsHash == bytes32(0) ||
            aggregationHash == bytes32(0) ||
            encryptionKeyCommitment == bytes32(0)
        ) {
            revert ZeroValue();
        }
        if (aggregator == address(0)) revert InvalidAddress();
        if (requests[requestId].consumer != address(0)) revert RequestAlreadyExists(requestId);

        uint256 expiresAt = block.timestamp + waitingTimeSeconds;
        requests[requestId] = PrivateRequest({
            consumer: msg.sender,
            aggregator: aggregator,
            termsHash: termsHash,
            aggregationHash: aggregationHash,
            encryptionKeyCommitment: encryptionKeyCommitment,
            expiresAt: expiresAt,
            status: RequestStatus.SETUP,
            acceptedCount: 0,
            resultHash: bytes32(0)
        });

        emit RequestCreated(
            requestId,
            msg.sender,
            aggregator,
            termsHash,
            aggregationHash,
            encryptionKeyCommitment,
            expiresAt
        );
    }

    function setPolicyMatch(bytes32 requestId, bytes32 deviceId, bool matched) external onlyDeviceOwner(deviceId) {
        if (requests[requestId].consumer == address(0)) revert RequestNotFound(requestId);
        policyMatched[requestId][deviceId] = matched;
        emit PolicyMatched(requestId, deviceId, matched);
    }

    function openRequest(bytes32 requestId) external onlyConsumer(requestId) {
        PrivateRequest storage request = requests[requestId];
        if (request.status != RequestStatus.SETUP) revert InvalidState(request.status);
        request.status = RequestStatus.IN_PROGRESS;
        emit RequestOpened(requestId);
    }

    function submitPrivateReading(
        bytes32 requestId,
        bytes32 deviceId,
        bytes32 payloadHash,
        bytes32 commitment,
        bytes32 nullifierHash,
        bytes calldata signature
    ) external {
        PrivateRequest storage request = requests[requestId];
        Device storage device = devices[deviceId];

        if (request.consumer == address(0)) revert RequestNotFound(requestId);
        if (device.owner == address(0)) revert DeviceNotFound(deviceId);
        if (request.status != RequestStatus.IN_PROGRESS) revert InvalidState(request.status);
        if (block.timestamp >= request.expiresAt) revert RequestExpired(request.expiresAt);
        if (!policyMatched[requestId][deviceId]) revert PolicyNotMatched(requestId, deviceId);
        if (readings[requestId][deviceId].accepted) revert ReadingAlreadySubmitted(requestId, deviceId);
        if (usedNullifiers[requestId][nullifierHash]) revert NullifierAlreadyUsed(nullifierHash);
        if (payloadHash == bytes32(0) || commitment == bytes32(0) || nullifierHash == bytes32(0)) revert ZeroValue();

        bytes32 signedHash = _toEthSignedMessageHash(
            readingMessageHash(requestId, deviceId, payloadHash, commitment, nullifierHash)
        );
        address recovered = _recover(signedHash, signature);
        if (recovered != device.signer) revert InvalidDeviceSignature(recovered);

        readings[requestId][deviceId] = PrivateReading({
            payloadHash: payloadHash,
            commitment: commitment,
            nullifierHash: nullifierHash,
            accepted: true
        });
        usedNullifiers[requestId][nullifierHash] = true;
        request.acceptedCount += 1;

        emit PrivateReadingSubmitted(requestId, deviceId, payloadHash, commitment, nullifierHash, msg.sender);
    }

    function finalizeRequest(bytes32 requestId, bytes32 resultHash) external {
        PrivateRequest storage request = requests[requestId];
        if (request.consumer == address(0)) revert RequestNotFound(requestId);
        if (request.aggregator != msg.sender) revert NotAggregator(msg.sender);
        if (request.status != RequestStatus.IN_PROGRESS) revert InvalidState(request.status);
        if (resultHash == bytes32(0)) revert ZeroValue();

        request.resultHash = resultHash;
        request.status = RequestStatus.FINISHED;

        emit RequestFinalized(requestId, resultHash);
    }

    function verifyPayloadHash(bytes memory encryptedPayload, bytes32 payloadHash) external pure returns (bool) {
        return keccak256(encryptedPayload) == payloadHash;
    }

    function getDevice(bytes32 deviceId)
        external
        view
        returns (address owner, address signer, bytes32 policyHash, bool active)
    {
        Device storage device = devices[deviceId];
        if (device.owner == address(0)) revert DeviceNotFound(deviceId);
        return (device.owner, device.signer, device.policyHash, device.active);
    }

    function getRequest(bytes32 requestId)
        external
        view
        returns (
            address consumer,
            address aggregator,
            bytes32 termsHash,
            bytes32 aggregationHash,
            bytes32 encryptionKeyCommitment,
            uint256 expiresAt,
            RequestStatus status,
            uint256 acceptedCount,
            bytes32 resultHash
        )
    {
        PrivateRequest storage request = requests[requestId];
        if (request.consumer == address(0)) revert RequestNotFound(requestId);
        return (
            request.consumer,
            request.aggregator,
            request.termsHash,
            request.aggregationHash,
            request.encryptionKeyCommitment,
            request.expiresAt,
            request.status,
            request.acceptedCount,
            request.resultHash
        );
    }

    function getReading(bytes32 requestId, bytes32 deviceId)
        external
        view
        returns (bytes32 payloadHash, bytes32 commitment, bytes32 nullifierHash, bool accepted)
    {
        PrivateReading storage reading = readings[requestId][deviceId];
        return (reading.payloadHash, reading.commitment, reading.nullifierHash, reading.accepted);
    }

    function computeRequestId(address consumer, string calldata label, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("ORIGINAL-IOT-REQUEST", consumer, label, salt));
    }

    function computeDeviceId(address signer, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("ORIGINAL-IOT-DEVICE", signer, salt));
    }

    function computeTermsHash(
        string calldata requestedData,
        string calldata requestedPurpose,
        string calldata requestedOperation,
        string calldata requestedDisclosure,
        uint256 retention
    ) external pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "ORIGINAL-IOT-TERMS",
                requestedData,
                requestedPurpose,
                requestedOperation,
                requestedDisclosure,
                retention
            )
        );
    }

    function computePolicyHash(bytes32 termsHash, bool needExplicitConsent) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("ORIGINAL-IOT-POLICY", termsHash, needExplicitConsent));
    }

    function computePayloadHash(bytes calldata encryptedPayload) external pure returns (bytes32) {
        return keccak256(encryptedPayload);
    }

    function computeCommitment(bytes32 deviceSecretHash, bytes32 payloadHash, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("ORIGINAL-IOT-COMMITMENT", deviceSecretHash, payloadHash, salt));
    }

    function computeNullifier(bytes32 deviceSecretHash, bytes32 requestId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("ORIGINAL-IOT-NULLIFIER", deviceSecretHash, requestId));
    }

    function readingMessageHash(
        bytes32 requestId,
        bytes32 deviceId,
        bytes32 payloadHash,
        bytes32 commitment,
        bytes32 nullifierHash
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(address(this), block.chainid, requestId, deviceId, payloadHash, commitment, nullifierHash)
        );
    }

    function _toEthSignedMessageHash(bytes32 hash) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function _recover(bytes32 signedHash, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) revert InvalidDeviceSignature(address(0));

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidDeviceSignature(address(0));

        address recovered = ecrecover(signedHash, v, r, s);
        if (recovered == address(0)) revert InvalidDeviceSignature(address(0));
        return recovered;
    }
}
