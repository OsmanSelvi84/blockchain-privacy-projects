// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PostQuantumToken
/// @notice A token whose transfers are authorized by Lamport one-time signatures.
/// @dev Uses SHA-256 to match the reference implementation (simple-lamport).
contract PostQuantumToken {
    /// @notice Bits in message hash. SHA-256 -> 256 bits.
    uint256 public constant N = 256;

    // --- Storage ---
    mapping(address => uint256) public balanceOf;
    mapping(address => bytes32) public publicKeyCommitment;
    mapping(address => uint256) public nonce;

    // --- Events ---
    event Registered(address indexed account, bytes32 pkCommitment, uint256 initialBalance);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    /// @notice Register an account with a Lamport public key commitment and initial balance.
    function register(bytes32 pkCommitment, uint256 initialBalance) external {
        require(publicKeyCommitment[msg.sender] == bytes32(0), "Already registered");
        publicKeyCommitment[msg.sender] = pkCommitment;
        balanceOf[msg.sender] = initialBalance;
        emit Registered(msg.sender, pkCommitment, initialBalance);
    }

    /// @notice Transfer tokens, authorized by a Lamport one-time signature.
    function transfer(
        address to,
        uint256 amount,
        bytes32 nextPkCommitment,
        bytes32[N] calldata pk0,
        bytes32[N] calldata pk1,
        bytes32[N] calldata signature
    ) external {
        require(to != address(0), "Invalid recipient");

        // 1. Provided public key must match stored commitment.
        require(
            keccak256(abi.encodePacked(pk0, pk1)) == publicKeyCommitment[msg.sender],
            "Public key mismatch"
        );

        // 2. Build the message hash (SHA-256 to match reference).
        bytes32 msgHash = sha256(
            abi.encodePacked(msg.sender, to, amount, nonce[msg.sender], nextPkCommitment)
        );

        // 3. Verify Lamport signature.
        require(verifyLamport(msgHash, signature, pk0, pk1), "Invalid Lamport signature");

        // 4. Sufficient balance.
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        // 5. Execute transfer.
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        // 6. Rotate key + bump nonce.
        publicKeyCommitment[msg.sender] = nextPkCommitment;
        nonce[msg.sender] += 1;

        emit Transfer(msg.sender, to, amount);
    }

    /// @notice Verify a Lamport one-time signature.
    /// @param msgHash The SHA-256 hash of the signed message.
    /// @param signature 256 revealed preimages (one per bit).
    /// @param pk0 256 public key components for bit = 0.
    /// @param pk1 256 public key components for bit = 1.
    function verifyLamport(
        bytes32 msgHash,
        bytes32[N] calldata signature,
        bytes32[N] calldata pk0,
        bytes32[N] calldata pk1
    ) public pure returns (bool) {
        uint256 h = uint256(msgHash);
        for (uint256 i = 0; i < N; i++) {
            uint256 bit = (h >> i) & 1;
            bytes32 expected = bit == 0 ? pk0[i] : pk1[i];
            if (sha256(abi.encodePacked(signature[i])) != expected) {
                return false;
            }
        }
        return true;
    }
}
