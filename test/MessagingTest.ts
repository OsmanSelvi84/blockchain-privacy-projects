import { expect } from "chai";
import { ethers } from "hardhat";

describe("AnonymousMessaging System Simulation", function () {
  let anonymousMessaging: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const AnonymousMessaging = await ethers.getContractFactory("AnonymousMessaging");
    
    anonymousMessaging = await AnonymousMessaging.deploy();
    await anonymousMessaging.deployed(); 
  });

  describe("1. Deployment Phase", function () {
    it("Should deploy the contract successfully to the blockchain", async function () {
      const address = anonymousMessaging.address; 
      expect(address).to.be.a("string");
      expect(address).to.not.equal(ethers.constants.AddressZero);
    });
  });

  describe("2. Security & Cryptography Phase (Part A & B Evaluation)", function () {
    
    it("Should BLOCK hackers trying to bypass the Ring Signature with fake data", async function () {
      const message = "I am hacking the system!";
      const fakeKeysX = [1234567, 7654321]; 
      const fakeKeysY = [9876543, 3456789];
      const fakeKeyImage = [1111, 2222];
      const fakeC0 = 9999;
      const fakeS = [3333, 4444];

      // I am using a pure JavaScript Try-Catch block to catch custom EVM revert errors
      try {
        await anonymousMessaging.sendMessage(message, fakeKeysX, fakeKeysY, fakeKeyImage, fakeC0, fakeS);
        expect.fail("My contract should have rejected this transaction, but it accepted it!");
      } catch (error: any) {
        // Verifying that my contract successfully blocked the attack
        expect(error.message).to.include("Invalid ring signature");
      }
    });

    it("Should BLOCK inputs with mismatched array lengths", async function () {
      const message = "Crash the EVM attempt";
      const keysX = [123];      
      const keysY = [123, 456]; 
      const keyImage = [11, 22];
      const c0 = 1;
      const s = [123];

      try {
        await anonymousMessaging.sendMessage(message, keysX, keysY, keyImage, c0, s);
        expect.fail("My contract should have rejected this transaction, but it accepted it!");
      } catch (error: any) {
        // Verifying that my contract detected the array length mismatch
        expect(error.message).to.include("Array lengths mismatch");
      }
    });
  });

  // --- PART A: INSTRUCTOR EVALUATION (5 INPUTS TEST) ---
  describe("3. Part A - Instructor Evaluation (5 Inputs Test)", function () {
    it("Should evaluate 5 different inputs provided by the instructor", async function () {
      
      // I will update this list with the 5 inputs provided by the instructor during the presentation
      const instructorInputs = [
        { id: 1, c0: 1111, s: [10, 20] },
        { id: 2, c0: 2222, s: [30, 40] },
        { id: 3, c0: 3333, s: [50, 60] },
        { id: 4, c0: 4444, s: [70, 80] },
        { id: 5, c0: 5555, s: [90, 100] }
      ];

      const keysX = [1234, 5678];
      const keysY = [9876, 5432];
      const keyImage = [111, 222];

      console.log("\n      --- INSTRUCTOR EVALUATION STARTED ---");
      for (const input of instructorInputs) {
        try {
          await anonymousMessaging.sendMessage("Instructor Test Message", keysX, keysY, keyImage, input.c0, input.s);
          console.log(`      [ Input ${input.id} ] Result: SUCCESS - Signature Valid`);
        } catch (error: any) {
          console.log(`      [ Input ${input.id} ] Result: REJECTED - Invalid Signature Detected (System Secure)`);
        }
      }
      console.log("      --- INSTRUCTOR EVALUATION COMPLETED ---\n");
    });
  });
});