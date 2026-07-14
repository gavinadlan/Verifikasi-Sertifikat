import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Private key is read from .env — never log or expose it.
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

if (!deployerPrivateKey) {
  console.warn(
    "⚠️  DEPLOYER_PRIVATE_KEY is not set. Deployment to live networks will fail."
  );
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    amoy: {
      url: process.env.ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
  etherscan: {
    // Etherscan API V2: satu API key (dari etherscan.io) berlaku untuk semua
    // chain, termasuk Polygon Amoy (chainId 80002 sudah dikenali bawaan).
    apiKey: process.env.POLYGONSCAN_API_KEY || "",
  },
};

export default config;