#!/usr/bin/env node
const major = parseInt(process.versions.node.split(".")[0], 10);
if (major !== 10) {
  console.error(
    "\n[decentralized-energy-trading] Node " +
      process.version +
      " detected.\n" +
      "This project requires Node 10.x (web3 1.2 + Truffle 5.1).\n" +
      "Run: nvm install 10.24.1 && nvm use 10\n"
  );
  process.exit(1);
}
