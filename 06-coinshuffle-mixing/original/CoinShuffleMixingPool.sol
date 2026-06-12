// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
// CoinShuffleMixingPool.sol
// Solidity port of coinshuffle_mixing.py (the original Python implementation)
// ============================================================================
//
// This contract is the on-chain equivalent of the MixingPool class.
// It enforces the same protocol rules: registration -> announce -> shuffle ->
// verify -> finalize. Each phase can only run after the previous one.
//
// Design notes on the port:
//   * Python's RSA-OAEP + AES (hybrid encryption) is NOT used here because
//     running RSA in Solidity would be prohibitively expensive in gas and,
//     more importantly, every ciphertext stored on-chain would be public —
//     defeating CoinShuffle's unlinkability. The on-chain version therefore
//     uses a commit-reveal pattern with keccak256, which gives a clean
//     auditable mixing pool but does not match the off-chain privacy of the
//     original. True on-chain unlinkability for Ethereum requires zk-SNARKs
//     (as in Tornado Cash).
//
//   * The Python `Player` class becomes a `Participant` struct here, since
//     Solidity has no per-user objects with methods.
//
//   * The Python `_log` calls become Solidity `event` emissions, which is the
//     idiomatic way to expose timeline data on-chain.
//
// CLI/test:
//   - Open this file in Remix (https://remix.ethereum.org).
//   - Compile with Solidity 0.8.20+.
//   - Deploy with a mixingAmount (e.g. 100000000000000000 for 0.1 ETH).
//   - Use the registered functions in order.

contract CoinShuffleMixingPool {

    // =========================================================================
    // 1) STATE MACHINE
    // -----------------------------------------------------------------------
    // Mirrors the `self.phase = "IDLE/ANNOUNCED/SHUFFLED/VERIFIED/FINALIZED"`
    // attribute in the Python MixingPool. Each function below checks that the
    // contract is in the expected phase before running, exactly like the
    // Python version raises RuntimeError on out-of-order calls.
    // =========================================================================

    enum Phase { IDLE, ANNOUNCED, SHUFFLED, VERIFIED, FINALIZED }

    Phase public phase;
    address public coordinator;      // whoever deployed the contract
    uint256 public mixingAmount;     // every participant must deposit this exact amount
    uint256 public constant MIN_PARTICIPANTS = 2;


    // =========================================================================
    // 2) PARTICIPANTS
    // -----------------------------------------------------------------------
    // Equivalent of the Python `Player` class. A struct here because Solidity
    // has no per-user objects.
    //
    // outputCommitment is keccak256(outputAddress, salt). The participant
    // reveals (outputAddress, salt) later; the contract checks the hash
    // matches, replicating the "I committed to this address" guarantee that
    // CoinShuffle gets from layered encryption.
    // =========================================================================

    struct Participant {
        address inputAddress;       // msg.sender when they registered
        bytes32 outputCommitment;   // keccak256(outputAddress, salt)
        address outputAddress;      // populated in the reveal step
        bool hasRevealed;
    }

    mapping(uint256 => Participant) public participants;
    uint256 public participantCount;

    address[] public shuffledOutputs;   // becomes the final list once shuffled


    // =========================================================================
    // 3) EVENTS
    // (these are the on-chain equivalent of the Python `self._log(...)` lines)
    // =========================================================================

    event Registered(uint256 indexed id, address indexed input, bytes32 outputCommitment);
    event Announced(uint256 participantCount);
    event Shuffled(address[] outputs);
    event Verified();
    event Finalized();
    event Refunded(uint256 indexed id, address indexed input);


    // =========================================================================
    // 4) MODIFIERS (access + phase checks)
    // =========================================================================

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "only coordinator");
        _;
    }

    modifier atPhase(Phase expected) {
        require(phase == expected, "wrong phase");
        _;
    }


    // =========================================================================
    // 5) CONSTRUCTOR
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.__init__(mixing_amount, seed)` in Python.
    // =========================================================================

    constructor(uint256 _mixingAmount) {
        coordinator = msg.sender;
        mixingAmount = _mixingAmount;
        phase = Phase.IDLE;
    }


    // =========================================================================
    // 6) Phase 0 -> register()
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.register(player)` in Python.
    // A participant calls this with msg.value == mixingAmount and commits to
    // their (output address + salt). They will reveal it later.
    // =========================================================================

    function register(bytes32 _outputCommitment) external payable atPhase(Phase.IDLE) {
        require(msg.value == mixingAmount, "wrong amount");

        participants[participantCount] = Participant({
            inputAddress:     msg.sender,
            outputCommitment: _outputCommitment,
            outputAddress:    address(0),
            hasRevealed:      false
        });

        emit Registered(participantCount, msg.sender, _outputCommitment);
        participantCount++;
    }


    // =========================================================================
    // 7) Phase 1 -> announcePhase()
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.announce_phase()`. Closes registration once
    // the coordinator confirms at least MIN_PARTICIPANTS are in. No actual
    // public-key broadcast happens here (in Python it does); in the on-chain
    // version the commitments above already pin every participant.
    // =========================================================================

    function announcePhase() external onlyCoordinator atPhase(Phase.IDLE) {
        require(participantCount >= MIN_PARTICIPANTS, "need at least 2 players");

        phase = Phase.ANNOUNCED;
        emit Announced(participantCount);
    }


    // =========================================================================
    // 8) revealOutput()
    // -----------------------------------------------------------------------
    // A participant reveals their (outputAddress, salt). The contract checks
    // the keccak256 matches the commitment that was made during register().
    // This is the on-chain analogue of "P_i contributes encrypted onion" —
    // they cannot change their output address after registration.
    // =========================================================================

    function revealOutput(uint256 _id, address _outputAddress, bytes32 _salt)
        external
        atPhase(Phase.ANNOUNCED)
    {
        require(_id < participantCount, "bad id");
        require(participants[_id].inputAddress == msg.sender, "not your slot");
        require(!participants[_id].hasRevealed, "already revealed");

        bytes32 expected = keccak256(abi.encodePacked(_outputAddress, _salt));
        require(expected == participants[_id].outputCommitment, "commitment mismatch");

        participants[_id].outputAddress = _outputAddress;
        participants[_id].hasRevealed = true;
    }


    // =========================================================================
    // 9) Phase 2 -> shufflePhase()
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.shuffle_phase()` in Python. Builds the
    // output list, shuffles with a seed using Fisher-Yates, stores the
    // result. The coordinator passes the seed (deterministic by design — the
    // Python version also uses a seeded RNG so test runs are reproducible).
    // =========================================================================

    function shufflePhase(uint256 _seed) external onlyCoordinator atPhase(Phase.ANNOUNCED) {
        uint256 n = participantCount;

        for (uint256 i = 0; i < n; i++) {
            require(participants[i].hasRevealed, "not all revealed");
        }

        address[] memory outs = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            outs[i] = participants[i].outputAddress;
        }

        // Fisher-Yates shuffle, deterministic in _seed
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(_seed, i))) % (i + 1);
            (outs[i], outs[j]) = (outs[j], outs[i]);
        }

        shuffledOutputs = outs;
        phase = Phase.SHUFFLED;
        emit Shuffled(outs);
    }


    // =========================================================================
    // 10) Phase 3 -> verifyPhase()
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.verify_phase()`. Every revealed output
    // address must appear in the shuffled list. If even one is missing, the
    // mix is aborted and `refund()` can be called to return each deposit.
    // =========================================================================

    function verifyPhase() external onlyCoordinator atPhase(Phase.SHUFFLED) {
        for (uint256 i = 0; i < participantCount; i++) {
            address myOutput = participants[i].outputAddress;
            bool found = false;
            for (uint256 j = 0; j < shuffledOutputs.length; j++) {
                if (shuffledOutputs[j] == myOutput) { found = true; break; }
            }
            require(found, "verify failed: missing output");
        }

        phase = Phase.VERIFIED;
        emit Verified();
    }


    // =========================================================================
    // 11) Phase 4 -> finalize()
    // -----------------------------------------------------------------------
    // Counterpart of `MixingPool.finalize()`. Pays out `mixingAmount` to each
    // shuffled output address. After this completes, the protocol round is
    // over.
    // =========================================================================

    function finalize() external onlyCoordinator atPhase(Phase.VERIFIED) {
        phase = Phase.FINALIZED;   // set first to block reentrancy

        for (uint256 i = 0; i < shuffledOutputs.length; i++) {
            (bool ok, ) = payable(shuffledOutputs[i]).call{value: mixingAmount}("");
            require(ok, "payout failed");
        }

        emit Finalized();
    }


    // =========================================================================
    // 12) Safety: refund()
    // -----------------------------------------------------------------------
    // If verifyPhase ever reverts (e.g. a malicious participant), this
    // function lets participants reclaim their deposit. Not in the Python
    // version (which just raises and the simulation ends), but on-chain we
    // must let funds out.
    // =========================================================================

    function refund(uint256 _id) external {
        require(phase != Phase.FINALIZED, "already finalized");
        require(_id < participantCount, "bad id");
        Participant storage p = participants[_id];
        require(p.inputAddress == msg.sender, "not your slot");

        address payable to = payable(p.inputAddress);
        p.inputAddress = address(0);     // mark as refunded (effects-before-interaction)

        (bool ok, ) = to.call{value: mixingAmount}("");
        require(ok, "refund failed");

        emit Refunded(_id, to);
    }


    // =========================================================================
    // 13) Read helpers (analogue of `unlinkability_report()` in Python)
    // =========================================================================

    function getShuffledOutputs() external view returns (address[] memory) {
        return shuffledOutputs;
    }

    function anonymitySetSize() external view returns (uint256) {
        return participantCount;
    }

    function possibleMappings() external view returns (uint256) {
        return factorial(participantCount);
    }

    function factorial(uint256 n) internal pure returns (uint256) {
        if (n <= 1) return 1;
        uint256 r = 1;
        for (uint256 i = 2; i <= n; i++) { r *= i; }
        return r;
    }
}
