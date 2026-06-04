// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SocialRecoveryWallet {
    // this is Recovery struct that collects guardian votes for a proposed owner in a particular recovery round
    struct Recovery {
        address proposedOwner;   
        uint256 recoveryRound;   
        bool    usedInExecute;
    }

    address public owner;
    bool    public inRecovery;
    uint256 public currentRecoveryRound;
    address public proposedOwner;
    uint256 public threshold;
    uint256 public guardianCount;

    // saves the commitments and returns true or false (commitment → registered?)
    mapping(bytes32 => bool) public guardianCommitments;

    // saves all the nullifiers that were spent/used to avoid double usage of the same nullifier
    mapping(bytes32 => bool) public usedNullifiers;

    // this stores the gardian's vote details using their commitment
    mapping(bytes32 => Recovery) public guardianToRecovery;

    // Guardian removal timelock (same time as the reference)
    uint256 public constant GUARDIAN_TIMELOCK = 3 days;

    // this is a struct that collects the details about the removal request
    struct RemovalRequest {
        bytes32 newGuardianCommitment;
        uint256 queuedAt;
    }
    mapping(bytes32 => RemovalRequest) public pendingRemovals;

    //events 
    event RecoveryInitiated(bytes32 indexed commitment, address proposedOwner, uint256 recoveryRound); 
    event RecoverySupported(bytes32 indexed commitment, address proposedOwner, uint256 recoveryRound);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner, uint256 recoveryRound);
    event RecoveryCancelled(uint256 recoveryRound);
    event GuardianAdded(bytes32 indexed commitment);
    event GuardianRemovalQueued(bytes32 indexed oldCommitment, bytes32 indexed newCommitment);
    event GuardianRemovalExecuted(bytes32 indexed oldCommitment, bytes32 indexed newCommitment);
    event EtherReceived(address indexed sender, uint256 amount);
    event TransactionExecuted(address indexed target, uint256 value);

    // MODIFIERS
    modifier onlyOwner() {
        require(msg.sender == owner, " You are not the owner");
        _;
    }

    modifier onlyInRecovery() {
        require(inRecovery, "This operation can only work in recovery mode");
        _;
    }

    modifier notInRecovery() {
        require(!inRecovery, "This operation can't work during recovery");
        _;
    }

    // this is a constructor that runs as soon as the contract is deployed

    constructor(uint256 _threshold) {
        require(_threshold > 0, "SRW: threshold must be > 0");
        owner     = msg.sender;
        threshold = _threshold;
    }

    // This function let's the owner add new guardians by their commitments
    function addGuardian(bytes32 commitment) external onlyOwner notInRecovery {
        require(commitment != bytes32(0), "Invalid commitment");
        require(!guardianCommitments[commitment], "You entered an already existing commitment");
        guardianCommitments[commitment] = true;
        guardianCount++;
        emit GuardianAdded(commitment);
    }

    // this function let's the owner initiate a guardian removal process which takes 3 days (same as the reference)
    //oldCommitment is the commitment of the guardian to be removed
    //newCommitment is the commitment of the the guardian to be added
    function initiateGuardianRemoval(bytes32 oldCommitment, bytes32 newCommitment)
        external onlyOwner notInRecovery
    {
        require(guardianCommitments[oldCommitment], "Not an existing guardian");
        require(newCommitment != bytes32(0), "SRW: Invalid commitment");
        pendingRemovals[oldCommitment] = RemovalRequest(newCommitment, block.timestamp);
        emit GuardianRemovalQueued(oldCommitment, newCommitment);
    }

    //this function let's the owner remove a guardian after 3 days from initiation
    function executeGuardianRemoval(bytes32 oldCommitment) external onlyOwner notInRecovery {
        RemovalRequest memory req = pendingRemovals[oldCommitment];
        require(req.queuedAt != 0, "No removals were initiated");
        require(
            block.timestamp >= req.queuedAt + GUARDIAN_TIMELOCK,
            "Wait at least 3 days!!"
        );
        delete pendingRemovals[oldCommitment];
        guardianCommitments[oldCommitment] = false;
        guardianCommitments[req.newGuardianCommitment] = true;
        // guardianCount stays the same (swap, not net change)
        emit GuardianRemovalExecuted(oldCommitment, req.newGuardianCommitment);
    }

    // Recovery phase
    // This function let's on of the chosen guardians to initiate recovery
    function initiateRecovery(bytes32 secret, bytes32 nullifier, address newOwner)
        external notInRecovery
    {
        require(newOwner != address(0), "Invalid address");
        bytes32 commitment = _deriveAndVerify(secret, nullifier);

        usedNullifiers[nullifier] = true;

        inRecovery= true;
        currentRecoveryRound++;
        proposedOwner = newOwner;
        guardianToRecovery[commitment] = Recovery(newOwner, currentRecoveryRound, false);

        emit RecoveryInitiated(commitment, newOwner, currentRecoveryRound);
    }

    // This function let's the remaining guardians to vote/support in during recovery
    function supportRecovery(bytes32 secret, bytes32 nullifier, address newOwner)
        external onlyInRecovery
    {
        require(newOwner == proposedOwner, " A different owner was proposed");
        bytes32 commitment = _deriveAndVerify(secret, nullifier);
        require(
            guardianToRecovery[commitment].recoveryRound < currentRecoveryRound,
            "You have already supported this round"
        );

        usedNullifiers[nullifier] = true;
        guardianToRecovery[commitment] = Recovery(newOwner, currentRecoveryRound, false);

        emit RecoverySupported(commitment, newOwner, currentRecoveryRound);
    }
    // This function let's one of the guardians to execute recovery only when the threshold is reached
    function executeRecovery(bytes32[] calldata commitments) external onlyInRecovery {
        uint256 supportCount;
        for (uint256 i = 0; i < commitments.length; i++) {
            bytes32 c = commitments[i];
            Recovery storage rec = guardianToRecovery[c];
            if (
                guardianCommitments[c] &&
                rec.recoveryRound == currentRecoveryRound &&
                !rec.usedInExecute
            ) {
                rec.usedInExecute = true;
                supportCount++;
            }
        }
        require(supportCount >= threshold, "Threshold not reached");

        address oldOwner = owner;
        owner            = proposedOwner;
        inRecovery       = false;
        proposedOwner    = address(0);

        emit RecoveryExecuted(oldOwner, owner, currentRecoveryRound);
    }

    function cancelRecovery() external onlyOwner onlyInRecovery {
        inRecovery    = false;
        proposedOwner = address(0);
        emit RecoveryCancelled(currentRecoveryRound);
    }

    // Wallete transactions
    
    function executeExternalTx(address target, uint256 value, bytes calldata data)
        external onlyOwner
        returns (bytes memory)
    {
        require(target != address(0), "SRW: zero target");
        (bool ok, bytes memory result) = target.call{value: value}(data);
        require(ok, "SRW: tx failed");
        emit TransactionExecuted(target, value);
        return result;
    }

    function _deriveAndVerify(bytes32 secret, bytes32 nullifier)
        internal view returns (bytes32 commitment)
    {
        commitment = keccak256(abi.encodePacked(secret, nullifier));
        require(guardianCommitments[commitment], "This not a registered guardian");
        require(!usedNullifiers[nullifier],      "This nullifier is already used");
    }

    function deriveCommitment(bytes32 secret, bytes32 nullifier)
        external pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(secret, nullifier));
    }

    function verifyProof(bytes32 secret, bytes32 nullifier)
        external view returns (bool valid, bytes32 commitment)
    {
        commitment = keccak256(abi.encodePacked(secret, nullifier));
        valid = guardianCommitments[commitment] && !usedNullifiers[nullifier];
    }


    function getBalance() external view returns (uint256) { return address(this).balance; }

    function isGuardian(bytes32 commitment) external view returns (bool) {
        return guardianCommitments[commitment];
    }

    function getRecoveryStatus() external view returns (
        bool   active,
        address proposed,
        uint256 round,
        uint256 requiredApprovals
    ) {
        active            = inRecovery;
        proposed          = proposedOwner;
        round             = currentRecoveryRound;
        requiredApprovals = threshold;
    }

    receive()  external payable { emit EtherReceived(msg.sender, msg.value); }
    fallback() external payable {}
}
