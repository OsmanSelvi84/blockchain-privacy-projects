// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/LamportVerifier.sol";

/**
 * @title  PostQuantumToken (PQT)
 * @notice Hybrid ERC-20 token with an optional post-quantum transfer layer.
 *
 * Two transfer modes:
 *   1. transfer()    Standard ERC-20 backed by Ethereum ECDSA.
 *                    Fast and cheap, but vulnerable to Shor's algorithm.
 *   2. pqTransfer()  Quantum-safe using Lamport one-time signatures.
 *                    Security relies only on keccak256 being one-way.
 *
 * Security features:
 *   - Commitment scheme    : Only keccak256(publicKey) stored (32 bytes).
 *   - Replay protection    : Message includes (sender, to, amount, nonce, chainId).
 *   - Signature dedup      : keccak256(signature) recorded after each use.
 *   - Mandatory key rotation: pqTransfer atomically registers newPublicKey.
 *
 * Reference: https://github.com/Tetration-Lab/lamport-solidity (MIT)
 */
contract PostQuantumToken {

    string  public constant name     = "Post Quantum Token";
    string  public constant symbol   = "PQT";
    uint8   public constant decimals = 18;

    address public immutable owner;

    uint256 public totalSupply;

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    mapping(address => bytes32) public pqPublicKeyCommitment;
    mapping(address => uint256) public pqNonce;
    mapping(address => bool)    public pqKeyRegistered;
    mapping(address => mapping(bytes32 => bool)) public usedSignatureHashes;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event PQKeyRegistered(address indexed account, bytes32 commitment);
    event PQKeyRotated(address indexed account, bytes32 newCommitment);
    event Mint(address indexed to, uint256 amount);

    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error PQKeyNotRegistered(address account);
    error InvalidPublicKey(address account);
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error OnlyOwner();
    error ZeroAddress();

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        uint256 supply        = initialSupply * 10 ** uint256(decimals);
        totalSupply           = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    // ── ERC-20 ────────────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance(allowed, amount);
        unchecked { allowance[from][msg.sender] = allowed - amount; }
        if (to == address(0)) revert ZeroAddress();
        _transfer(from, to, amount);
        return true;
    }

    // ── Post-Quantum ──────────────────────────────────────────────────────────

    function registerPQKey(bytes32[2][256] calldata publicKey) external {
        bytes32 commitment                = LamportVerifier.computeCommitment(publicKey);
        pqPublicKeyCommitment[msg.sender] = commitment;
        pqKeyRegistered[msg.sender]       = true;
        emit PQKeyRegistered(msg.sender, commitment);
    }

    function pqTransfer(
        address         to,
        uint256         amount,
        bytes32[2][256] calldata publicKey,
        bytes32[256]    calldata signature,
        bytes32[2][256] calldata newPublicKey
    ) external returns (bool) {
        address sender = msg.sender;

        if (!pqKeyRegistered[sender])
            revert PQKeyNotRegistered(sender);

        if (balanceOf[sender] < amount)
            revert InsufficientBalance(balanceOf[sender], amount);

        if (!LamportVerifier.verifyCommitment(publicKey, pqPublicKeyCommitment[sender]))
            revert InvalidPublicKey(sender);

        bytes32 messageHash = keccak256(abi.encodePacked(
            sender, to, amount, pqNonce[sender], block.chainid
        ));

        bytes32 sigHash = keccak256(abi.encode(signature));
        if (usedSignatureHashes[sender][sigHash]) revert SignatureAlreadyUsed();

        if (!LamportVerifier.verify(messageHash, signature, publicKey))
            revert InvalidSignature();

        usedSignatureHashes[sender][sigHash] = true;

        bytes32 newCommitment             = LamportVerifier.computeCommitment(newPublicKey);
        pqPublicKeyCommitment[sender]     = newCommitment;
        emit PQKeyRotated(sender, newCommitment);

        unchecked { pqNonce[sender]++; }

        _transfer(sender, to, amount);
        return true;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (to == address(0))   revert ZeroAddress();
        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function hasPQKey(address account)        external view returns (bool)    { return pqKeyRegistered[account]; }
    function getPQNonce(address account)      external view returns (uint256) { return pqNonce[account]; }
    function getPQCommitment(address account) external view returns (bytes32) { return pqPublicKeyCommitment[account]; }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        if (balanceOf[from] < amount)
            revert InsufficientBalance(balanceOf[from], amount);
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }
}
