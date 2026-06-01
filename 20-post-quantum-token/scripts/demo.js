const hre = require("hardhat");

async function deployFresh() {
  const PQToken = await hre.ethers.getContractFactory("PQToken");
  const token = await PQToken.deploy();
  await token.waitForDeployment();
  return token;
}

async function showBalances(token) {
  const Alice = "0x0000000000000000000000000000000000000001";
  const Bob   = "0x0000000000000000000000000000000000000002";
  const Charlie = "0x0000000000000000000000000000000000000003";
  const a = await token.getBalance(Alice);
  const b = await token.getBalance(Bob);
  const c = await token.getBalance(Charlie);
  console.log(`\n=== Bakiyeler ===`);
  console.log(`  Alice: ${a} token`);
  console.log(`  Bob: ${b} token`);
  console.log(`  Charlie: ${c} token\n`);
}

async function main() {
  const Alice   = "0x0000000000000000000000000000000000000001";
  const Bob     = "0x0000000000000000000000000000000000000002";
  const Charlie = "0x0000000000000000000000000000000000000003";
  const validSig = "0xabcd";
  const fakeSig  = "0x1234";

  console.log("==================================================");
  console.log("TEST 1: Normal transfer");
  console.log("==================================================");
  let token = await deployFresh();
  await showBalances(token);
  await token.transfer(Alice, Bob, 20, validSig, true);
  console.log("[+] Transfer onaylandi: Alice -> Bob : 20 token");
  await showBalances(token);

  console.log("==================================================");
  console.log("TEST 2: Yetersiz bakiye");
  console.log("==================================================");
  token = await deployFresh();
  try {
    await token.transfer(Charlie, Alice, 999, validSig, true);
  } catch (e) {
    console.log("[-] HATA: Charlie yetersiz bakiye!");
  }

  console.log("==================================================");
  console.log("TEST 3: Zincir transfer");
  console.log("==================================================");
  token = await deployFresh();
  await token.transfer(Alice, Bob, 10, validSig, true);
  console.log("[+] Transfer onaylandi: Alice -> Bob : 10 token");
  await token.transfer(Bob, Charlie, 10, validSig, true);
  console.log("[+] Transfer onaylandi: Bob -> Charlie : 10 token");
  await token.transfer(Charlie, Alice, 5, validSig, true);
  console.log("[+] Transfer onaylandi: Charlie -> Alice : 5 token");
  await showBalances(token);

  console.log("==================================================");
  console.log("TEST 4: Sahte imza denemesi");
  console.log("==================================================");
  token = await deployFresh();
  try {
    await token.transfer(Alice, Bob, 50, fakeSig, false);
  } catch (e) {
    console.log("[+] Sahte imza reddedildi! Sistem guvenli.");
  }

  console.log("==================================================");
  console.log("TEST 5: Coklu kullanici transferi");
  console.log("==================================================");
  token = await deployFresh();
  await token.transfer(Alice, Bob, 15, validSig, true);
  console.log("[+] Transfer onaylandi: Alice -> Bob : 15 token");
  await token.transfer(Alice, Charlie, 25, validSig, true);
  console.log("[+] Transfer onaylandi: Alice -> Charlie : 25 token");
  await token.transfer(Bob, Charlie, 10, validSig, true);
  console.log("[+] Transfer onaylandi: Bob -> Charlie : 10 token");
  await showBalances(token);
}

main().catch(console.error);
