// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract SecretSharingEscrow {
    //deployer of the contract not owner of shares
    address public owner;
    uint256 public threshold;
    uint256 public shares;
    uint256 public shareCount;
    mapping(uint256 => uint256) sharesMap; //dictionary like python will hold index and value
    mapping(uint256 => bool) public isSaved; //to keep track of shares that has been saved

    //like __init__ in python, we call this later in the scripts to pass parameters
    constructor(uint256 k, uint256 n) {
        owner = msg.sender;
        threshold = k;
        shares = n;
        shareCount = 0;
    }

    //to save the shares on chain
    function saveShares(uint256 index, uint256 value) public {
        //index must be between 1 and shares (n)
        require(
            index >= 1 && index <= shares,
            "invalid index, must be between 1 and n"
        );

        //check if share alaready saved on chain
        require(!isSaved[index], "Data is already saved on chain");
        //if not saved --->
        isSaved[index] = true;

        //add the saved share(fx) to the sharesMap
        sharesMap[index] = value;
        shareCount++;
    }

    //to get a specific share from the chain (by index)
    function getShares(uint256 index) public view returns (uint256) {
        require(isSaved[index], "Share doesnt exist on chain");
        return sharesMap[index];
    }

    //if we have enough shares (based on threshold) to reconstruct the secret
    function isReady() public view returns (bool) {
        return shareCount >= threshold;
    }

    //delete all shares from the chain (only callable by the owner (deployer) )
    function deleteShares() public {
        require(owner == msg.sender, "Not authenticated for such an action");
        for (uint256 index = 1; index <= shares; index++) {
            delete sharesMap[index];
            delete isSaved[index];
        }
        shareCount = 0;
    }
}
