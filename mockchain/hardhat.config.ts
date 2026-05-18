import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

const MOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL ?? "https://skirmish-thicken-derived.ngrok-free.dev";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: MOCKCHAIN_RPC_URL,
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "../contracts/test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
