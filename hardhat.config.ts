import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers"; // Toolbox yerine sadece ethers eklentisi!

const config: HardhatUserConfig = {
  solidity: "0.4.24",
};

export default config;