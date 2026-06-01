// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PQToken {
    mapping(address => uint256) public balances;
    
    struct Block {
        uint256 index;
        address from;
        address to;
        uint256 amount;
        bytes32 previousHash;
        bytes signature;
        uint256 timestamp;
    }
    
    Block[] public chain;
    
    event Transfer(address indexed from, address indexed to, uint256 amount);
    
    constructor() {
        chain.push(Block({
            index: 0,
            from: address(0),
            to: address(0),
            amount: 0,
            previousHash: bytes32(0),
            signature: "",
            timestamp: block.timestamp
        }));
        
        balances[address(0x1)] = 100;
        balances[address(0x2)] = 50;
        balances[address(0x3)] = 30;
    }
    
    function getBlockHash(uint256 index) public view returns (bytes32) {
        Block memory b = chain[index];
        return keccak256(abi.encodePacked(
            b.index, b.from, b.to, b.amount, b.previousHash, b.timestamp
        ));
    }
    
    function transfer(
        address from,
        address to,
        uint256 amount,
        bytes memory signature,
        bool isValid
    ) public {
        require(balances[from] >= amount, "Yetersiz bakiye");
        require(isValid, "Gecersiz imza");
        
        bytes32 previousHash = getBlockHash(chain.length - 1);
        
        chain.push(Block({
            index: chain.length,
            from: from,
            to: to,
            amount: amount,
            previousHash: previousHash,
            signature: signature,
            timestamp: block.timestamp
        }));
        
        balances[from] -= amount;
        balances[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    function getBalance(address account) public view returns (uint256) {
        return balances[account];
    }
    
    function getChainLength() public view returns (uint256) {
        return chain.length;
    }
}
