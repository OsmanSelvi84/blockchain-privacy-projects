// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MimbleWimbleCT
 * @notice Simulates MimbleWimble-style Confidential Transactions on Ethereum.
 *
 * True MimbleWimble runs on its own elliptic curve chain (secp256k1 with blinding
 * factors).  On the EVM we cannot do cheap EC scalar multiplication natively, so
 * this contract approximates the core privacy properties:
 *
 *  • Pedersen Commitments  C = r*G + v*H  are represented as a 32-byte hash that
 *    commits to (blinding_factor, amount) without revealing either.
 *  • A UTXO set of commitments tracks spendable outputs.
 *  • Transaction validation checks that ΣC_inputs = ΣC_outputs in "commitment space"
 *    — enforced here by verifying the algebraic sum of serialised commitments equals
 *    zero (excess = kernel commitment).
 *  • A simple range-proof flag prevents negative-value exploits.
 */
contract MimbleWimbleCT {

    // ─── Data structures ────────────────────────────────────────────────────

    struct Commitment {
        bytes32 value;   // hash(blindingFactor, amount, owner)
        address owner;
        bool spent;
    }

    struct RangeProof {
        bytes32 commitmentHash; // the commitment this proof covers
        uint256 minValue;       // proven lower bound  (always 0)
        uint256 maxValue;       // proven upper bound  (2^64 − 1)
        bytes32 proofHash;      // hash of (commitment, range bounds, nonce)
        bool valid;
    }

    struct Transaction {
        bytes32[]  inputCommitments;
        bytes32[]  outputCommitments;
        bytes32    kernelCommitment; // excess = Σblinding_outputs − Σblinding_inputs
        bytes32    kernelSignature;  // Schnorr-style: hash(kernel, nonce)
        bool       finalized;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    mapping(bytes32 => Commitment) public commitments;
    mapping(bytes32 => RangeProof) public rangeProofs;
    mapping(bytes32 => Transaction) public transactions;

    bytes32[] public utxoSet;         // unspent commitment hashes
    bytes32[] public transactionIds;

    uint256 public totalCommitments;
    uint256 public totalTransactions;

    // ─── Events ──────────────────────────────────────────────────────────────

    event CommitmentCreated(bytes32 indexed commitmentHash, address indexed owner);
    event CommitmentSpent(bytes32 indexed commitmentHash, address indexed spender);
    event RangeProofSubmitted(bytes32 indexed commitmentHash, bool valid);
    event TransactionCreated(bytes32 indexed txId);
    event TransactionFinalized(bytes32 indexed txId);
    event CoinbaseCommitment(bytes32 indexed commitmentHash, address indexed recipient);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error CommitmentAlreadyExists(bytes32 hash);
    error CommitmentDoesNotExist(bytes32 hash);
    error CommitmentAlreadySpent(bytes32 hash);
    error NotCommitmentOwner(bytes32 hash, address caller);
    error InvalidRangeProof(bytes32 hash);
    error RangeProofMissing(bytes32 hash);
    error TransactionAlreadyFinalized(bytes32 txId);
    error TransactionDoesNotExist(bytes32 txId);
    error InputOutputImbalance();
    error KernelSignatureInvalid();
    error EmptyInputs();
    error EmptyOutputs();

    // ─── Commitment operations ────────────────────────────────────────────────

    /**
     * @notice Create a Pedersen-style commitment  C = hash(r || v || owner).
     * @param blindingFactor  Secret scalar r (kept off-chain; only its hash lands here).
     * @param amount          Plaintext amount v — caller proves knowledge via range proof.
     */
    function createCommitment(bytes32 blindingFactor, uint256 amount)
        external
        returns (bytes32 commitmentHash)
    {
        commitmentHash = _computeCommitment(blindingFactor, amount, msg.sender);

        if (commitments[commitmentHash].owner != address(0)) {
            revert CommitmentAlreadyExists(commitmentHash);
        }

        commitments[commitmentHash] = Commitment({
            value: commitmentHash,
            owner: msg.sender,
            spent: false
        });

        utxoSet.push(commitmentHash);
        totalCommitments++;

        emit CommitmentCreated(commitmentHash, msg.sender);
    }

    /**
     * @notice Submit a range proof asserting 0 ≤ v < 2^64.
     *         In production this would be a Bulletproof; here we verify that
     *         the caller knows (r, v) such that hash(r, v, owner) == commitmentHash
     *         and that v fits inside uint64.
     */
    function submitRangeProof(
        bytes32 commitmentHash,
        bytes32 blindingFactor,
        uint256 amount,
        bytes32 nonce
    ) external returns (bool) {
        if (commitments[commitmentHash].owner == address(0)) {
            revert CommitmentDoesNotExist(commitmentHash);
        }

        // Verify the caller knows the opening (r, v)
        bytes32 recomputed = _computeCommitment(
            blindingFactor,
            amount,
            commitments[commitmentHash].owner
        );
        bool valid = (recomputed == commitmentHash) && (amount < type(uint64).max);

        bytes32 proofHash = keccak256(abi.encodePacked(commitmentHash, uint256(0), uint256(type(uint64).max), nonce));

        rangeProofs[commitmentHash] = RangeProof({
            commitmentHash: commitmentHash,
            minValue: 0,
            maxValue: type(uint64).max,
            proofHash: proofHash,
            valid: valid
        });

        emit RangeProofSubmitted(commitmentHash, valid);
        return valid;
    }

    // ─── Transaction operations ───────────────────────────────────────────────

    /**
     * @notice Create a confidential transaction.
     * @param inputCommitments   Commitment hashes being spent.
     * @param outputCommitments  New commitment hashes being created.
     * @param kernelCommitment   Excess blinding factor commitment (Σr_out − Σr_in)*G.
     * @param kernelSignature    Schnorr-like: hash(kernelCommitment, nonce).
     */
    function createTransaction(
        bytes32[] calldata inputCommitments,
        bytes32[] calldata outputCommitments,
        bytes32 kernelCommitment,
        bytes32 kernelSignature
    ) external returns (bytes32 txId) {
        if (inputCommitments.length == 0) revert EmptyInputs();
        if (outputCommitments.length == 0) revert EmptyOutputs();

        // All inputs must exist, be unspent, and have valid range proofs
        for (uint256 i = 0; i < inputCommitments.length; i++) {
            bytes32 c = inputCommitments[i];
            if (commitments[c].owner == address(0))  revert CommitmentDoesNotExist(c);
            if (commitments[c].spent)                revert CommitmentAlreadySpent(c);
            if (commitments[c].owner != msg.sender)  revert NotCommitmentOwner(c, msg.sender);
            if (!rangeProofs[c].valid)               revert RangeProofMissing(c);
        }

        // All outputs must exist and have valid range proofs
        for (uint256 i = 0; i < outputCommitments.length; i++) {
            bytes32 c = outputCommitments[i];
            if (commitments[c].owner == address(0))  revert CommitmentDoesNotExist(c);
            if (!rangeProofs[c].valid)               revert RangeProofMissing(c);
        }

        // Verify commitment balance: XOR-based excess check (approximation of
        // Σ C_inputs ⊕ Σ C_outputs == kernelCommitment).
        if (!_verifyBalance(inputCommitments, outputCommitments, kernelCommitment)) {
            revert InputOutputImbalance();
        }

        // Verify kernel signature: keccak256(kernel ‖ keccak256(abi.encode(inputs, outputs)))
        // This is computable off-chain before the transaction is submitted.
        bytes32 txContent  = keccak256(abi.encode(inputCommitments, outputCommitments));
        bytes32 expectedSig = keccak256(abi.encodePacked(kernelCommitment, txContent));
        if (kernelSignature != expectedSig) revert KernelSignatureInvalid();

        // txId includes timestamp+sender for uniqueness (not covered by signature)
        txId = keccak256(abi.encodePacked(expectedSig, block.timestamp, msg.sender));

        transactions[txId] = Transaction({
            inputCommitments:  inputCommitments,
            outputCommitments: outputCommitments,
            kernelCommitment:  kernelCommitment,
            kernelSignature:   kernelSignature,
            finalized:         false
        });

        transactionIds.push(txId);
        totalTransactions++;

        emit TransactionCreated(txId);
    }

    /**
     * @notice Finalize a transaction: mark inputs spent, add outputs to UTXO set.
     */
    function finalizeTransaction(bytes32 txId) external {
        Transaction storage txn = transactions[txId];
        if (txn.kernelCommitment == bytes32(0)) revert TransactionDoesNotExist(txId);
        if (txn.finalized) revert TransactionAlreadyFinalized(txId);

        // Mark inputs spent
        for (uint256 i = 0; i < txn.inputCommitments.length; i++) {
            bytes32 c = txn.inputCommitments[i];
            commitments[c].spent = true;
            _removeFromUtxoSet(c);
            emit CommitmentSpent(c, msg.sender);
        }

        // Register outputs (they were pre-created by receiver)
        for (uint256 i = 0; i < txn.outputCommitments.length; i++) {
            // already in commitments map; just ensure UTXO listing is correct
            // (outputs may have been pushed during createCommitment already)
        }

        txn.finalized = true;
        emit TransactionFinalized(txId);
    }

    // ─── Coinbase / genesis ───────────────────────────────────────────────────

    /**
     * @notice Mint a genesis commitment (no inputs required — simulates coinbase).
     */
    function mintCoinbase(bytes32 blindingFactor, uint256 amount, address recipient)
        external
        returns (bytes32 commitmentHash)
    {
        commitmentHash = _computeCommitment(blindingFactor, amount, recipient);

        if (commitments[commitmentHash].owner != address(0)) {
            revert CommitmentAlreadyExists(commitmentHash);
        }

        commitments[commitmentHash] = Commitment({
            value: commitmentHash,
            owner: recipient,
            spent: false
        });

        utxoSet.push(commitmentHash);
        totalCommitments++;

        emit CoinbaseCommitment(commitmentHash, recipient);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUtxoSet() external view returns (bytes32[] memory) {
        return utxoSet;
    }

    function getUtxoCount() external view returns (uint256) {
        return utxoSet.length;
    }

    function isUnspent(bytes32 commitmentHash) external view returns (bool) {
        return !commitments[commitmentHash].spent && commitments[commitmentHash].owner != address(0);
    }

    function getTransaction(bytes32 txId)
        external
        view
        returns (
            bytes32[] memory inputCommitments,
            bytes32[] memory outputCommitments,
            bytes32 kernelCommitment,
            bytes32 kernelSignature,
            bool finalized
        )
    {
        Transaction storage txn = transactions[txId];
        return (
            txn.inputCommitments,
            txn.outputCommitments,
            txn.kernelCommitment,
            txn.kernelSignature,
            txn.finalized
        );
    }

    function computeCommitmentHash(bytes32 blindingFactor, uint256 amount, address owner)
        external
        pure
        returns (bytes32)
    {
        return _computeCommitment(blindingFactor, amount, owner);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _computeCommitment(bytes32 r, uint256 v, address owner)
        internal
        pure
        returns (bytes32)
    {
        // C = keccak256(r || v || owner)  approximates  r*G + v*H
        return keccak256(abi.encodePacked(r, v, owner));
    }

    /**
     * @notice Homomorphic balance check: XOR of all input commitments XOR'd with
     *         all output commitments should equal kernelCommitment.
     *
     *         This mirrors the MW property: Σ C_in = Σ C_out + kernel,
     *         where kernel encodes the excess blinding factor.
     */
    function _verifyBalance(
        bytes32[] memory inputs,
        bytes32[] memory outputs,
        bytes32 kernel
    ) internal pure returns (bool) {
        bytes32 inputSum  = bytes32(0);
        bytes32 outputSum = bytes32(0);

        for (uint256 i = 0; i < inputs.length;  i++) inputSum  = inputSum  ^ inputs[i];
        for (uint256 i = 0; i < outputs.length; i++) outputSum = outputSum ^ outputs[i];

        // inputSum = outputSum XOR kernelCommitment  ⟹  inputSum XOR outputSum == kernel
        return (inputSum ^ outputSum) == kernel;
    }

    function _removeFromUtxoSet(bytes32 commitmentHash) internal {
        uint256 len = utxoSet.length;
        for (uint256 i = 0; i < len; i++) {
            if (utxoSet[i] == commitmentHash) {
                utxoSet[i] = utxoSet[len - 1];
                utxoSet.pop();
                return;
            }
        }
    }
}
