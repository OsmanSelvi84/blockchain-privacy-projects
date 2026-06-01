// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PQToken {
    string public name = "Post Quantum Token";
    string public symbol = "PQT";
    uint256 public totalSupply;

    // ERC20 balance mapping
    mapping(address => uint256) public balances;
    

    // In Solidity, nested arrays are read backwards. So [2][256] means an array of 256 elements, each containing 2 elements.
    mapping(address => bytes32[2][256]) public registeredPublicKeys;
    
    mapping(address => bool) public isPublicKeyRegistered;
    
    // Nonce mapping to prevent Replay Attacks
    mapping(address => uint256) public nonces;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event PublicKeyRegistered(address indexed user);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * (10 ** 18);
        balances[msg.sender] = totalSupply;
    }

    // FIX: Public key size is updated to bytes32[2][256].
    function registerPublicKey(bytes32[2][256] calldata _pubKey) external {
        require(!isPublicKeyRegistered[msg.sender], "Error: Key is already registered");
        
        registeredPublicKeys[msg.sender] = _pubKey;
        isPublicKeyRegistered[msg.sender] = true;
        
        emit PublicKeyRegistered(msg.sender);
    }

    function verifyLamportSignature(
        bytes32 messageHash,
        bytes32[256] calldata signature, 
        bytes32[2][256] storage pubKey   
    ) internal view returns (bool) {
        for (uint256 i = 0; i < 256; i++) {
            uint256 byteIndex = i / 8;
            uint256 bitIndex = 7 - (i % 8);
            uint8 b = uint8(messageHash[byteIndex]);
            uint8 bit = (b >> bitIndex) & 1;

            // FIX: Hash the i-th element in the signature and compare it with the correct branch in pubKey.
            if (keccak256(abi.encodePacked(signature[i])) != pubKey[i][bit]) {
                return false; 
            }
        }
        return true; 
    }

    function pqTransfer(
        address to,
        uint256 amount,
        bytes32[256] calldata signature,       
        bytes32[2][256] calldata newPubKey     
    ) external returns (bool) {
        require(isPublicKeyRegistered[msg.sender], "Error: Public key is not registered");
        require(balances[msg.sender] >= amount, "Error: Not enough balance");

        // Hash the sender, receiver, amount, and nonce to prevent replay attacks
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, to, amount, nonces[msg.sender]));

        bool isValid = verifyLamportSignature(messageHash, signature, registeredPublicKeys[msg.sender]);
        require(isValid, "Error: Invalid Lamport signature");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        // Update the public key because Lamport is a One-Time Signature (OTS) scheme
        registeredPublicKeys[msg.sender] = newPubKey;
        nonces[msg.sender]++;

        emit Transfer(msg.sender, to, amount);
        return true;
    }
}