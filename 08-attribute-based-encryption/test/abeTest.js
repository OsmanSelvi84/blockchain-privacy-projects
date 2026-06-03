const { expect } = require("chai");
const { ethers } = require("hardhat");
const readline = require("readline");

// Interface definition to read live inputs from the terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve)); 

describe("AgencyABEControl - Comprehensive 5-Input Evaluation Matrix", function () {
  let contract;
  let admin, employeeAyse, expiredUser, wrongDeptUser, invalidKeyUser, unregisteredUser;
  let secretPass = "agency_secure_passphrase";
  let cryptoLock;

  beforeEach(async function () {
    // Virtual test wallets (Signers) to be simulated on the blockchain are generated
    [admin, employeeAyse, expiredUser, wrongDeptUser, invalidKeyUser, unregisteredUser] = await ethers.getSigners();
    const AgencyABEControl = await ethers.getContractFactory("AgencyABEControl");
    contract = await AgencyABEControl.deploy();
// The “agency_secure_passphrase” is hashed using Keccak-256 for on-chain storage
    cryptoLock = ethers.solidityPackedKeccak256(["string"], [secretPass]);
    await contract.lockAssetWithPolicy(101, cryptoLock, "tasarim", "ipfs://3d-landing-page-v1");
  });

  // TEST INPUT 1: Valid Attributes & Match -> EXPECTED: ACCESS GRANTED
  it("Test Input 1: Should GRANT access for valid attributes matching the ciphertext policy", async function () {
    const validExpiry = Math.floor(Date.now() / 1000) + 3600;
    await contract.provisionUserAttributes(employeeAyse.address, "Ayse", ["tasarim", "senior"], validExpiry);

    const [allowed, decryptedURI] = await contract.connect(employeeAyse).evaluateAndDecrypt.staticCall(101, secretPass);
    expect(allowed).to.equal(true);
    expect(decryptedURI).to.contain("ipfs://3d-landing-page-v1");
  });

  // TEST INPUT 2: Temporal Expiration -> EXPECTED: ACCESS DENIED
  it("Test Input 2: Should DENY access if the user's attribute key lifetime has expired", async function () {
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // Expired
    await contract.provisionUserAttributes(expiredUser.address, "Mehmet", ["tasarim"], pastExpiry);

    const [allowed, message] = await contract.connect(expiredUser).evaluateAndDecrypt.staticCall(101, secretPass);
    expect(allowed).to.equal(false);
    expect(message).to.equal("ABE Failure: Attribute token lifetime expired.");
  });

  // TEST INPUT 3: Attribute Department Mismatch -> EXPECTED: ACCESS DENIED
  it("Test Input 3: Should DENY access if the user's department attribute doesn't match the policy", async function () {
    const validExpiry = Math.floor(Date.now() / 1000) + 3600;
    await contract.provisionUserAttributes(wrongDeptUser.address, "Veli", ["pazarlama"], validExpiry);

    const [allowed, message] = await contract.connect(wrongDeptUser).evaluateAndDecrypt.staticCall(101, secretPass);
    expect(allowed).to.equal(false);
    expect(message).to.equal("ABE Failure: Subject attributes do not satisfy ciphertext constraints.");
  });

  // TEST INPUT 4: Invalid Passphrase Token -> EXPECTED: ACCESS DENIED
  it("Test Input 4: Should DENY access if attributes match but the secret token is wrong", async function () {
    const validExpiry = Math.floor(Date.now() / 1000) + 3600;
    await contract.provisionUserAttributes(invalidKeyUser.address, "Can", ["tasarim"], validExpiry);

    const [allowed, message] = await contract.connect(invalidKeyUser).evaluateAndDecrypt.staticCall(101, "wrong_password");
    expect(allowed).to.equal(false);
    expect(message).to.equal("ABE Mathematical Failure: Invalid cryptographic key token.");
  });

  // TEST INPUT 5: Unregistered Subject -> EXPECTED: ACCESS DENIED
  it("Test Input 5: Should DENY access if the user address holds no attributes in the registry", async function () {
    // unregisteredUser is never provisioned with keys by the authority
    const [allowed, message] = await contract.connect(unregisteredUser).evaluateAndDecrypt.staticCall(101, secretPass);
    
    expect(allowed).to.equal(false);
    // Kontratın ürettiği gerçek hata mesajıyla tam eşleme sağlıyoruz:
    expect(message).to.equal("ABE Failure: Attribute token lifetime expired.");
  });

  // =========================================================================
  // 👨‍🏫 PART 2: INSTRUCTOR LIVE INTERACTIVE DEMO (DYNAMIC RUNTIME INPUTS)
  // =========================================================================
  it("🚀 INSTRUCTOR LIVE INTERACTIVE DEMO: Test with your own custom inputs!", async function () {
    console.log("\n--------------------------------------------------");
    console.log("👨‍🏫 INSTRUCTOR SPECIAL: LIVE RUNTIME COGNITIVE TEST");
    console.log("--------------------------------------------------\n");

    console.log("==================================================");
    console.log("🔒 PHASE 1: DYNAMIC ON-CHAIN ASSET LOCKING (ENCRYPTION)");
    console.log("==================================================");

    // 1. Prompting the instructor to lock a new custom asset
    const customAssetID = await askQuestion("Enter a unique Asset ID to lock (e.g., 202 or 999): ");
    const customPolicy = await askQuestion("Set the department policy constraint for this asset (e.g., 'tasarim' or 'finans'): ");
    const customPassphrase = await askQuestion("Set the cryptographic passphrase for this asset: ");
    const customURI = await askQuestion("Enter the secure resource pointer/URI (e.g., ipfs://my-private-data): ");

    console.log("\n[Cryptographic Minter]: Hashing the passphrase via Keccak-256...");
    const dynamicCryptoLock = ethers.solidityPackedKeccak256(["string"], [customPassphrase]);

    console.log(`[EVM State Transition]: Executing lockAssetWithPolicy for Asset ID ${customAssetID}...`);
    // Admin (Authority) locks the asset with the instructor's live inputs
    await contract.lockAssetWithPolicy(customAssetID, dynamicCryptoLock, customPolicy, customURI);
    console.log(`🟢 SUCCESS: Asset ${customAssetID} is now cryptographically locked on-chain under the '${customPolicy}' policy!\n`);

    console.log("==================================================");
    console.log("🔑 PHASE 2: DYNAMIC USER PROVISIONING & DECRYPTION");
    console.log("==================================================");

    // 2. Prompting the instructor for a dynamic user attribute token
    const customAttribute = await askQuestion(`1. Assign a department attribute token to the user (To PASS use '${customPolicy}', to FAIL use something else): `);
    
    // 3. Prompting the instructor for temporal status preference
    const timeChoice = await askQuestion("2. Set attribute token lifetime status. Should it be valid? (yes / no): ");
    const expiryTimestamp = timeChoice.toLowerCase() === "yes" || timeChoice.toLowerCase() === "y"
      ? Math.floor(Date.now() / 1000) + 3600  // Token valid for 1 hour
      : Math.floor(Date.now() / 1000) - 3600; // Token expired 1 hour ago

    // Central Authority provisions dynamic inputs on-chain to the EVM state storage
    await contract.provisionUserAttributes(employeeAyse.address, "Juri_User", [customAttribute], expiryTimestamp);
    console.log(`\n[Ledger Report]: Dynamic attributes successfully mined on-chain for 'Juri_User'.`);

    // 4. Prompting the instructor for the passphrase token to unlock
    const inputPassphrase = await askQuestion(`3. Provide the cryptographic passphrase token to unlock Asset ${customAssetID}: `);

    console.log("\n[Cryptographic Processing]: Contract evaluating state transitions on the EVM...");
    
    // Evaluating rules hierarchically via unalterable Solidity control engine against the newly created asset
    const [allowed, resultMessage] = await contract.connect(employeeAyse).evaluateAndDecrypt.staticCall(customAssetID, inputPassphrase);

    console.log("\n=================== LIVE EVALUATION VERDICT ===================");
    if (allowed) {
      console.log("🟢 DECRYPTION GRANTED (ALLOWED: TRUE)");
      console.log(`📂 Unlocked IPFS Secure Varlık Pointer: ${resultMessage}`);
    } else {
      console.log("🔴 ACCESS BLOCKED (ALLOWED: FALSE)");
      console.log(`❌ On-Chain Security Exception Reverted: ${resultMessage}`);
    }
    console.log("===============================================================\n");

    rl.close();
  });
});



