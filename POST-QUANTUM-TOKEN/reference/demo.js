const { ethers } = require("ethers");

const testInputs = [
  {
    test: 1,
    receiver: "0x0000000000000000000000000000000000000001",
    amount: 10,
    secret: "privacy1"
  },
  {
    test: 2,
    receiver: "0x0000000000000000000000000000000000000002",
    amount: 25,
    secret: "hidden2"
  },
  {
    test: 3,
    receiver: "0x0000000000000000000000000000000000000003",
    amount: 50,
    secret: "secure3"
  },
  {
    test: 4,
    receiver: "0x0000000000000000000000000000000000000004",
    amount: 75,
    secret: "token4"
  },
  {
    test: 5,
    receiver: "0x0000000000000000000000000000000000000005",
    amount: 100,
    secret: "quantum5"
  }
];

console.log("Reference Implementation - Ethers.js Commitment Hash");
console.log("====================================================");

for (const input of testInputs) {
  const commitment = ethers.solidityPackedKeccak256(
    ["address", "uint256", "string"],
    [input.receiver, input.amount, input.secret]
  );

  console.log(`TEST ${input.test}`);
  console.log("Receiver:", input.receiver);
  console.log("Amount:", input.amount);
  console.log("Secret:", input.secret);
  console.log("Commitment:", commitment);
  console.log("----------------------------------------------------");
}
