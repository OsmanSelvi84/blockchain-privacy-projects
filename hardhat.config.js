require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        // Bellek icinde gecici Hardhat network (her testte sifirlanir)
        hardhat: {
            chainId: 31337,
        },
        // 'npx hardhat node' ile baslatilan kalici local node
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
    },
};
