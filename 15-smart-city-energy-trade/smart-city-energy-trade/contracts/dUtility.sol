pragma solidity >=0.5.0 <0.6.0;

import "./interfaces/IdUtility.sol";
import "./interfaces/IVerifier.sol";
import "./Mortal.sol";

/**
 * @title dUtility — on-chain registry for hashed meter readings and zk netting checks.
 * @dev Smart City Energy Trade. Logic follows course settlement invariants; implementation is project-owned.
 */
contract dUtility is Mortal, IdUtility {
  struct MemberState {
    bool active;
    bytes32 renewableHash;
    bytes32 nonRenewableHash;
    bytes32 postNettingHash;
  }

  mapping(address => MemberState) private members;
  uint256[] public settlementBlocks;

  IVerifier private proofVerifier;

  uint256 private inputPairCursor;
  uint256 private matchedInputPairs;

  modifier onlyMember(address member) {
    require(msg.sender == member, "Caller must be the household address");
    _;
  }

  modifier memberMustExist(address member) {
    require(members[member].active, "Unknown household");
    _;
  }

  // --- Household registry (owner) ---

  function addHousehold(address household) external onlyOwner returns (bool) {
    require(!members[household].active, "Household already exists");
    MemberState storage row = members[household];
    row.active = true;
    row.renewableHash = bytes32(0);
    row.nonRenewableHash = bytes32(0);
    row.postNettingHash = bytes32(0);
    emit NewHousehold(household);
    return true;
  }

  function removeHousehold(address household)
    external
    onlyOwner
    memberMustExist(household)
    returns (bool)
  {
    delete members[household];
    return true;
  }

  function setVerifier(address verifier) external onlyOwner returns (bool) {
    proofVerifier = IVerifier(verifier);
    return true;
  }

  // --- Views ---

  function getHousehold(address household)
    external
    view
    memberMustExist(household)
    returns (bool initialized, bytes32 renewableHash, bytes32 nonRenewableHash)
  {
    MemberState memory row = members[household];
    return (row.active, row.renewableHash, row.nonRenewableHash);
  }

  function getHouseholdAfterNettingHash(address household)
    external
    view
    memberMustExist(household)
    returns (bytes32)
  {
    return members[household].postNettingHash;
  }

  function getTransfersLength() external view returns (uint256) {
    return settlementBlocks.length;
  }

  // --- Household-signed hash updates ---

  function updateRenewableEnergy(address household, bytes32 deltaHash)
    external
    onlyMember(household)
    memberMustExist(household)
    returns (bool)
  {
    return _storeEnergyHash(household, deltaHash, true);
  }

  function updateNonRenewableEnergy(address household, bytes32 deltaHash)
    external
    onlyMember(household)
    memberMustExist(household)
    returns (bool)
  {
    return _storeEnergyHash(household, deltaHash, false);
  }

  // --- Netting verification entry point ---

  function checkNetting(
    address[] calldata households,
    uint256[2] calldata proofA,
    uint256[2][2] calldata proofB,
    uint256[2] calldata proofC,
    uint256[8] calldata publicInputs
  ) external returns (bool) {
    require(_reconcileSubmittedHashes(households, publicInputs), "Hashes not matching");
    require(_verifyProof(proofA, proofB, proofC, publicInputs), "Netting proof failed");
    emit NettingSuccess();
    return true;
  }

  // --- Internal: hash bookkeeping for zk public inputs ---

  function _storeEnergyHash(address household, bytes32 deltaHash, bool renewable)
    internal
    returns (bool)
  {
    MemberState storage row = members[household];
    if (renewable) {
      row.renewableHash = deltaHash;
      emit RenewableEnergyChanged(household, deltaHash);
    } else {
      row.nonRenewableHash = deltaHash;
      emit NonRenewableEnergyChanged(household, deltaHash);
    }
    return true;
  }

  function _reconcileSubmittedHashes(address[] memory households, uint256[8] memory inputs)
    internal
    returns (bool)
  {
    inputPairCursor = 0;
    matchedInputPairs = 0;
    uint256 halfLen = inputs.length / 2;

    for (uint256 i = 0; i < households.length; i++) {
      address who = households[i];
      bytes32 onChain = members[who].renewableHash;
      bytes32 fromProof = _nextNonZeroPackedHash(inputs);
      require(onChain == fromProof, "Household energy hash mismatch");
      _writePostNettingHash(
        who,
        inputs[inputPairCursor + halfLen - 2],
        inputs[inputPairCursor + halfLen - 1]
      );
    }

    require(households.length == matchedInputPairs, "Household count vs proof inputs mismatch");
    return true;
  }

  function _nextNonZeroPackedHash(uint256[8] memory inputs) private returns (bytes32 packed) {
    while (inputPairCursor < inputs.length / 2) {
      if (inputs[inputPairCursor] != 0) {
        packed = bytes32(
          uint256(inputs[inputPairCursor] << 128 | inputs[inputPairCursor + 1])
        );
        matchedInputPairs += 1;
        inputPairCursor += 2;
        break;
      }
      inputPairCursor += 2;
    }
    return packed;
  }

  function _writePostNettingHash(address household, uint256 limbHi, uint256 limbLo) internal {
    members[household].postNettingHash = bytes32(uint256(limbHi << 128 | limbLo));
  }

  function _verifyProof(
    uint256[2] memory proofA,
    uint256[2][2] memory proofB,
    uint256[2] memory proofC,
    uint256[8] memory publicInputs
  ) internal returns (bool ok) {
    ok = proofVerifier.verifyTx(proofA, proofB, proofC, publicInputs);
    if (ok) {
      settlementBlocks.push(block.number);
    }
  }

  /** @dev Used by dUtilityBenchmark only. */
  function _assignVerifier(address verifier) internal {
    proofVerifier = IVerifier(verifier);
  }

  function _registerMember(address household) internal {
    require(!members[household].active, "Household already exists");
    MemberState storage row = members[household];
    row.active = true;
    emit NewHousehold(household);
  }

  function _applyRenewableHash(address household, bytes32 deltaHash) internal {
    _storeEnergyHash(household, deltaHash, true);
  }
}
