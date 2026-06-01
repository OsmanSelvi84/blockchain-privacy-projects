const chalk = require("chalk");
const request = require("request-promise");
const fs = require("fs");
const Web3 = require("web3");
const Utility = artifacts.require("dUtility");
const OwnedSet = artifacts.require("OwnedSet");
const dUtilityBenchmark = artifacts.require("dUtilityBenchmark");

const AUTHORITY_RPC = "http://127.0.0.1:8545";
const web3Helper = require("../helpers/web3");
const asyncUtils = require("../helpers/async-utils");
const { address, password } = require("../household-server-config");
const {
  UTILITY_ADDRESS,
  AUTHORITY_ADDRESS,
  OTHER_AUTHORITY_ADDRESSES,
  OWNED_SET_ADDRESS,
  TESTS_FAKE_ADDRESS,
  VERIFIER_ADDRESS
} = require("../helpers/constants");
const options = { resolveWithFullResponse: true };

async function unlockAuthority(web3) {
  await web3.eth.personal.unlockAccount(AUTHORITY_ADDRESS, password, 3600);
}

async function addValidator(validator, ownedSet, web3) {
  process.stdout.write(`  Adding ${validator} to OwnedSet contract ... `);
  await unlockAuthority(web3);
  await ownedSet.methods.addValidator(validator).send({
    from: AUTHORITY_ADDRESS,
    gas: 6000000
  });
  process.stdout.write(chalk.green("done\n"));
}

async function finalizeChange(ownedSet, web3) {
  process.stdout.write(`  Finalizing changes to OwnedSet contract ... `);
  await unlockAuthority(web3);
  await ownedSet.methods.finalizeChange().send({
    from: AUTHORITY_ADDRESS,
    gas: 6000000
  });
  process.stdout.write(chalk.green("done\n"));
}

async function callRPC(methodSignature, port, params = []) {
  const { statusCode, body } = await request(`http://localhost:${port}`, {
    method: "POST",
    json: {
      jsonrpc: "2.0",
      method: methodSignature,
      params: params,
      id: 0
    },
    ...options
  });

  return { statusCode, body };
}

module.exports = async (deployer, network, [authority]) => {
  switch (network) {
    case "ganache": {
      await deployer.deploy(Utility);
      const utilityInstance = await Utility.deployed();
      await utilityInstance.addHousehold(authority);
      break;
    }
    case "authority": {
      const web3 = new Web3(AUTHORITY_RPC);
      const block = await web3.eth.getBlockNumber();
      process.stdout.write(`  Connected to Parity (block ${block}) ... `);
      process.stdout.write(chalk.green("ok\n"));

      const utility = new web3.eth.Contract(Utility.abi, UTILITY_ADDRESS);
      const ownedSet = new web3.eth.Contract(OwnedSet.abi, OWNED_SET_ADDRESS);

      process.stdout.write("  Set verifier contract address ... ");
      await unlockAuthority(web3);
      await utility.methods.setVerifier(VERIFIER_ADDRESS).send({
        from: AUTHORITY_ADDRESS,
        gas: 6000000
      });
      process.stdout.write(chalk.green("done\n"));

      process.stdout.write("  Adding admin node to Utility contract ... ");
      await unlockAuthority(web3);
      await utility.methods.addHousehold(AUTHORITY_ADDRESS).send({
        from: AUTHORITY_ADDRESS,
        gas: 6000000
      });
      process.stdout.write(chalk.green("done\n"));

      process.stdout.write("  Transfer ownership of Utility contract ... ");
      await unlockAuthority(web3);
      await utility.methods.transferOwnership(OWNED_SET_ADDRESS).send({
        from: AUTHORITY_ADDRESS,
        gas: 6000000
      });
      process.stdout.write(chalk.green("done\n"));

      process.stdout.write("  Adding authority addresses ...\n");
      await asyncUtils.asyncForEach(OTHER_AUTHORITY_ADDRESSES, async a => {
        await addValidator(a, ownedSet, web3);
        process.stdout.write(
          `Sending ether from ${AUTHORITY_ADDRESS} to ${a} ...`
        );
        const params = [
          {
            from: AUTHORITY_ADDRESS,
            to: "0x" + a,
            value: "0xde0b6b3a7640000"
          },
          "node0"
        ];
        await callRPC("personal_sendTransaction", 8545, params).body;
        process.stdout.write(chalk.green("done\n"));
      });

      await addValidator(TESTS_FAKE_ADDRESS, ownedSet, web3);
      await finalizeChange(ownedSet, web3);

      process.stdout.write("  Removing 'fake' authority addresses ...");
      await unlockAuthority(web3);
      await ownedSet.methods.removeValidator(TESTS_FAKE_ADDRESS).send({
        from: AUTHORITY_ADDRESS,
        gas: 6000000
      });
      process.stdout.write(chalk.green("done\n"));
      await finalizeChange(ownedSet, web3);
      break;
    }
    case "benchmark": {
      // Requires contracts/Verifier.sol (Solc 0.6) — not used for authority / Ubuntu demo
      const verifier = artifacts.require("Verifier");
      const web3 = web3Helper.initWeb3("benchmark");
      await web3.eth.personal.unlockAccount(address, password, null);
      const contractAddress = await deployer.deploy(dUtilityBenchmark)
        .then(inst => {
          return inst.address;
        });

      await web3.eth.personal.unlockAccount(address, password, null);
      const verifierAddress = await deployer.deploy(verifier, { gas: 20000000})
        .then(inst => {
          return inst.address;
        });
      await web3.eth.personal.unlockAccount(address, password, null);
      fs.writeFile('tmp/addresses.txt', JSON.stringify({contract: contractAddress, verifier: verifierAddress}),
        function (err) {
          if (err) throw err;
        }
      );
      break;
    }
    default: {
      deployer.deploy(Utility);
      break;
    }
  }
};
