// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  IPostQuantumToken
 * @notice Interface for the Post-Quantum Token (PQT) contract.
 */
interface IPostQuantumToken {

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event PQKeyRegistered(address indexed account, bytes32 commitment);
    event PQKeyRotated(address indexed account, bytes32 newCommitment);
    event Mint(address indexed to, uint256 amount);

    function name()        external view returns (string memory);
    function symbol()      external view returns (string memory);
    function decimals()    external view returns (uint8);
    function totalSupply() external view returns (uint256);

    function balanceOf(address account)
        external view returns (uint256);

    function transfer(address to, uint256 amount)
        external returns (bool);

    function transferFrom(address from, address to, uint256 amount)
        external returns (bool);

    function approve(address spender, uint256 amount)
        external returns (bool);

    function allowance(address owner, address spender)
        external view returns (uint256);

    /**
     * @notice Register a Lamport public key (stores only the 32-byte commitment).
     * @param  publicKey  256 pairs of keccak256 hash values.
     */
    function registerPQKey(bytes32[2][256] calldata publicKey) external;

    /**
     * @notice Transfer tokens secured by a Lamport one-time signature.
     * @param  to           Recipient address.
     * @param  amount       Amount in wei (18 decimals).
     * @param  publicKey    Current Lamport public key.
     * @param  signature    256 revealed preimage values.
     * @param  newPublicKey Next Lamport public key (mandatory key rotation).
     * @return              True on success.
     */
    function pqTransfer(
        address         to,
        uint256         amount,
        bytes32[2][256] calldata publicKey,
        bytes32[256]    calldata signature,
        bytes32[2][256] calldata newPublicKey
    ) external returns (bool);

    function hasPQKey(address account)        external view returns (bool);
    function getPQNonce(address account)      external view returns (uint256);
    function getPQCommitment(address account) external view returns (bytes32);
}
