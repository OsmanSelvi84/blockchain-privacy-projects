const { expect } = require("chai");
const { ethers } = require("hardhat");

// --- OFF-CHAIN LAMPORT ALGORITHM HELPER FUNCTIONS ---

// 1. Private Key Generation (256 pairs of random numbers)
function generatePrivateKey() {
    let privKey = [];
    for (let i = 0; i < 256; i++) {
        privKey.push([
            ethers.hexlify(ethers.randomBytes(32)), // For bit 0
            ethers.hexlify(ethers.randomBytes(32))  // For bit 1
        ]);
    }
    return privKey;
}

// 2. Public Key Generation (Hashed version of private keys)
function generatePublicKey(privKey) {
    let pubKey = [];
    for (let i = 0; i < 256; i++) {
        pubKey.push([
            ethers.keccak256(privKey[i][0]), 
            ethers.keccak256(privKey[i][1])  
        ]);
    }
    return pubKey;
}

// 3. Signing the Message (Revealing private keys based on hash bits)
function signMessage(messageHash, privKey) {
    let signature = [];
    let hashBytes = ethers.getBytes(messageHash);
    
    for (let i = 0; i < 256; i++) {
        let byteIndex = Math.floor(i / 8);
        let bitIndex = 7 - (i % 8);
        let bit = (hashBytes[byteIndex] >> bitIndex) & 1;
        
        // If bit is 0, add the first part to the signature. If 1, add the second part.
        signature.push(privKey[i][bit]);
    }
    return signature;
}

// --- 5 EVALUATION SCENARIOS REQUIRED BY THE INSTRUCTOR ---
describe("Post-Quantum Token (PQ-ERC20) Tests", function () {
    let PQToken, token;
    let owner, addr1;
    let privKey1, pubKey1; // Owner's first key
    let privKey2, pubKey2; // Owner's second key to update after the transaction
    let wrongPrivKey, wrongPubKey; // For the invalid signature test

    before(async function () {
        [owner, addr1] = await ethers.getSigners();

        // Deploy the contract (Initial supply: 1000 PQT)
        PQToken = await ethers.getContractFactory("PQToken");
        token = await PQToken.deploy(1000);

        // Generate the necessary keys for the tests before starting
        privKey1 = generatePrivateKey();
        pubKey1 = generatePublicKey(privKey1);
        
        privKey2 = generatePrivateKey();
        pubKey2 = generatePublicKey(privKey2);
        
        wrongPrivKey = generatePrivateKey();
        wrongPubKey = generatePublicKey(wrongPrivKey);
    });

    it("1. Successful Registration", async function () {
        // User registers their public key to the system
        await expect(token.connect(owner).registerPublicKey(pubKey1))
            .to.emit(token, "PublicKeyRegistered")
            .withArgs(owner.address);

        // Verify that it is saved in the system
        expect(await token.isPublicKeyRegistered(owner.address)).to.be.true;
    });

    it("2. Successful Transfer with Valid Signature", async function () {
        let amount = ethers.parseEther("10"); // We will transfer 10 tokens
        let nonce = await token.nonces(owner.address);

        // JavaScript version of the keccak256(abi.encodePacked(...)) process in Solidity
        let messageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256"],
            [owner.address, addr1.address, amount, nonce]
        );

        // Off-chain signature generation
        let signature = signMessage(messageHash, privKey1);

        // Make the transfer and give the 2nd public key to the system (OTS Rule)
        await expect(token.connect(owner).pqTransfer(addr1.address, amount, signature, pubKey2))
            .to.emit(token, "Transfer")
            .withArgs(owner.address, addr1.address, amount);

        // Verify that the balance is updated
        expect(await token.balances(addr1.address)).to.equal(amount);
    });

    it("3. Reject Transfer with Invalid Signature", async function () {
        let amount = ethers.parseEther("5");
        let nonce = await token.nonces(owner.address);

        let messageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256"],
            [owner.address, addr1.address, amount, nonce]
        );

        // CREATE ERROR: Sign the message with a wrong private key instead of the correct one
        let badSignature = signMessage(messageHash, wrongPrivKey);
        
        let privKey3 = generatePrivateKey();
        let pubKey3 = generatePublicKey(privKey3);

        // Expect the transaction to fail and revert
        await expect(token.connect(owner).pqTransfer(addr1.address, amount, badSignature, pubKey3))
            .to.be.reverted; 
    });

    it("4. Replay Attack Prevention", async function () {
        let amount = ethers.parseEther("10");
        // MALICIOUS ACTION: Try to send the transaction again using the old nonce=0 from test 2
        let oldNonce = 0; 
        
        let oldMessageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256"],
            [owner.address, addr1.address, amount, oldNonce]
        );

        // Old (already used) signature
        let usedSignature = signMessage(oldMessageHash, privKey1);
        let randomPubKey = generatePublicKey(generatePrivateKey());

        // The system must reject this because the nonce changed and the key was already used
        await expect(token.connect(owner).pqTransfer(addr1.address, amount, usedSignature, randomPubKey))
            .to.be.reverted;
    });

    it("5. Insufficient Balance Check", async function () {
        // addr1 currently has only 10 tokens. Let's try to send 50 tokens.
        let amount = ethers.parseEther("50");
        
        // First, let's register a key for addr1
        let addr1PrivKey = generatePrivateKey();
        let addr1PubKey = generatePublicKey(addr1PrivKey);
        await token.connect(addr1).registerPublicKey(addr1PubKey);

        let nonce = await token.nonces(addr1.address);
        let messageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256"],
            [addr1.address, owner.address, amount, nonce]
        );

        // Signed with the correct key (The signature is valid)
        let signature = signMessage(messageHash, addr1PrivKey);
        let newAddr1PubKey = generatePublicKey(generatePrivateKey());

        // But it should give an error because the balance is not enough
        await expect(token.connect(addr1).pqTransfer(owner.address, amount, signature, newAddr1PubKey))
            .to.be.revertedWith("Error: Not enough balance");
    });
});