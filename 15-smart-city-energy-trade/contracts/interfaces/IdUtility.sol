pragma solidity >=0.5.0 <0.6.0;

/**
 * @title IdUtility — public surface for the smart-city on-chain settlement registry.
 * @dev Households publish hashed meter deltas; netting proofs are verified via checkNetting.
 */
interface IdUtility {
  event NewHousehold(address indexed household);
  event NettingSuccess();
  event CheckHashesSuccess();
  event RenewableEnergyChanged(address indexed household, bytes32 newDeltaEnergy);
  event NonRenewableEnergyChanged(address indexed household, bytes32 newDeltaEnergy);

  function addHousehold(address household) external returns (bool);

  function getHousehold(address household)
    external
    view
    returns (bool initialized, bytes32 renewableHash, bytes32 nonRenewableHash);

  function getHouseholdAfterNettingHash(address household) external view returns (bytes32);

  function removeHousehold(address household) external returns (bool);

  function setVerifier(address verifier) external returns (bool);

  function checkNetting(
    address[] calldata households,
    uint256[2] calldata proofA,
    uint256[2][2] calldata proofB,
    uint256[2] calldata proofC,
    uint256[8] calldata publicInputs
  ) external returns (bool);

  function getTransfersLength() external view returns (uint256);

  function updateRenewableEnergy(address household, bytes32 deltaHash) external returns (bool);

  function updateNonRenewableEnergy(address household, bytes32 deltaHash) external returns (bool);
}
