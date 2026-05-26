// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/LamportVerifier.sol";

/**
 * @title PostQuantumToken (PQT)
 * @author PostQuantumToken Project
 * @notice ERC20-compatible token with optional post-quantum Lamport signature protection.
 *
 * @dev This contract demonstrates a hybrid blockchain token that supports two
 * transfer modes:
 *
 * 1. STANDARD transfer()      — Uses Ethereum's native ECDSA (secp256k1).
 * Fast and cheap but VULNERABLE to quantum attack.
 *
 * 2. QUANTUM-SAFE pqTransfer() — Uses Lamport one-time signatures.
 * Hash-based, quantum-resistant, but gas-heavy.
 *
 * ─── Security Architecture ────────────────────────────────────────────────
 *
 * • Commitment scheme:     Only keccak256(publicKey) stored — 32 bytes per user.
 * Full 16 KB public key supplied at transfer time.
 *
 * • Replay protection:     Signed message includes (sender, to, amount, nonce,
 * chainId). Nonce increments after every pqTransfer.
 *
 * • Signature deduplication: sigHash stored in usedSignatureHashes.
 * Same signature bytes cannot be resubmitted.
 *
 * • Mandatory key rotation: pqTransfer atomically registers newPublicKey.
 * Lamport one-time-use invariant enforced on-chain.
 *
 * ─── Reference Implementation ─────────────────────────────────────────────
 *
 * Based on the Lamport signature scheme studied from:
 * https://github.com/Tetration-Lab/lamport-solidity  (MIT licence)
 *
 * Key differences from the reference:
 * • This project adds a full ERC20 token layer on top of the signature lib.
 * • Commitment scheme instead of full key storage (more gas-efficient).
 * • Nonce + chainId cross-chain replay protection.
 * • Signature deduplication (belt-and-suspenders alongside nonce rotation).
 *
 * @custom:security Educational implementation — not audited for production use.
 */
contract PostQuantumToken {

    // ─────────────────────────────── Metadata ──────────────────────────────

    string  public constant name     = "Post Quantum Token";
    string  public constant symbol   = "PQT";
    uint8   public constant decimals = 18;
    address public immutable owner;

    // ────────────────────────────── ERC20 State ────────────────────────────

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ──────────────────────── Post-Quantum Key State ────────────────────────

    /// @notice keccak256 commitment of each user's current Lamport public key.
    mapping(address => bytes32) public pqPublicKeyCommitment;

    /// @notice Per-account nonce — incremented after each pqTransfer.
    mapping(address => uint256) public pqNonce;

    /// @notice Whether an account has registered a PQ key.
    mapping(address => bool) public pqKeyRegistered;

    /// @notice Prevents double-submission of identical signature bytes.
    mapping(address => mapping(bytes32 => bool)) public usedSignatureHashes;

    // ─────────────────────────────── Events ────────────────────────────────

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event PQKeyRegistered(address indexed account, bytes32 commitment);
    event PQKeyRotated(address indexed account, bytes32 newCommitment);
    event Mint(address indexed to, uint256 amount);

    // ─────────────────────────── Custom Errors ──────────────────────────────

    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error PQKeyNotRegistered(address account);
    error InvalidPublicKey(address account);
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error OnlyOwner();
    error ZeroAddress();

    // ──────────────────────────── Constructor ───────────────────────────────

    /**
     * @param initialSupply  Whole-token initial supply (multiplied by 10^18).
     */
    constructor(uint256 initialSupply) {
        owner = msg.sender;
        uint256 supply = initialSupply * 10 ** uint256(decimals);
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    // ───────────────────────── Standard ERC20 ──────────────────────────────

    /**
     * @notice Transfer tokens — classical ECDSA (NOT quantum-safe).
     * @dev Vulnerable to Shor's algorithm on a quantum computer.
     * Use pqTransfer() for quantum-resistant transfers.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve a spender to move tokens on your behalf.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer tokens from an approved address.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance(allowed, amount);
        unchecked { allowance[from][msg.sender] = allowed - amount;
        }
        if (to == address(0)) revert ZeroAddress();
        _transfer(from, to, amount);
        return true;
    }

    // ──────────────────── Post-Quantum Protected Functions ──────────────────

    /**
     * @notice Register a Lamport public key for post-quantum transfers.
     * @param publicKey  256 pairs of keccak256 hash values.
     *
     * @dev Only the 32-byte commitment is stored on-chain.
     * Re-registering overwrites the previous commitment.
     */
    function registerPQKey(bytes32[2][256] calldata publicKey) external {
        bytes32 commitment = LamportVerifier.computeCommitment(publicKey);
        pqPublicKeyCommitment[msg.sender] = commitment;
        pqKeyRegistered[msg.sender]       = true;
        emit PQKeyRegistered(msg.sender, commitment);
    }

    /**
     * @notice Transfer tokens using a Lamport post-quantum signature.
     *
     * @param to           Recipient address.
     * @param amount       Amount in wei (18 decimals).
     * @param publicKey    Current Lamport public key (256 pairs of hash values).
     * @param signature    Lamport signature: 256 revealed secret preimage values.
     * @param newPublicKey Next Lamport public key (mandatory key rotation).
     *
     * @dev Verification order:
     * 1. Sender has a registered PQ key.
     * 2. Sender has sufficient balance.
     * 3. Provided publicKey matches stored commitment.
     * 4. Signature not previously used.
     * 5. Lamport signature valid for the transfer message.
     * Then: mark signature used → rotate key → increment nonce → transfer.
     */
    function pqTransfer(
        address to,
        uint256 amount,
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

        // Message = keccak256(sender || to || amount || nonce || chainId)
        // Includes chainId to prevent cross-chain replay attacks.
        bytes32 messageHash = keccak256(abi.encodePacked(
            sender, to, amount, pqNonce[sender], block.chainid
        ));

        bytes32 sigHash = keccak256(abi.encode(signature));
        if (usedSignatureHashes[sender][sigHash]) revert SignatureAlreadyUsed();

        if (!LamportVerifier.verify(messageHash, signature, publicKey))
            revert InvalidSignature();

        // Effects — checks-effects-interactions order
        usedSignatureHashes[sender][sigHash] = true;

        bytes32 newCommitment = LamportVerifier.computeCommitment(newPublicKey);
        pqPublicKeyCommitment[sender] = newCommitment;
        emit PQKeyRotated(sender, newCommitment);

        unchecked { pqNonce[sender]++; }

        _transfer(sender, to, amount);
        return true;
    }

    // ──────────────────────────── Admin ────────────────────────────────────

    /**
     * @notice Mint new PQT tokens to any address (owner only).
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (to == address(0))    revert ZeroAddress();
        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    // ────────────────────────── View Helpers ────────────────────────────────

    function getPQNonce(address account)      external view returns (uint256) { return pqNonce[account];
    }
    function getPQCommitment(address account) external view returns (bytes32) { return pqPublicKeyCommitment[account];
    }
    function hasPQKey(address account)        external view returns (bool)    { return pqKeyRegistered[account];
    }

    // ─────────────────────────── Internals ─────────────────────────────────

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
