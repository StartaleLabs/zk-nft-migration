import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition"
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/.env" });
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY || "";
console.log("PrivateKey set:", !!MAINNET_PRIVATE_KEY)
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
      url: "http://localhost:8545/",
    },
    sepolia: {
      accounts: [process.env.TESTNET_PRIVATE_KEY || ""],
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      // forking: {
      //   url: "https://ethereum-sepolia-rpc.publicnode.com",
      // }
    },
    op_sepolia: {
      accounts: [process.env.TESTNET_PRIVATE_KEY || ""],
      url: "https://sepolia.optimism.io",
      chainId: 11155420,
    },
    osaki: {
      accounts: [process.env.TESTNET_PRIVATE_KEY || ""],
      url: "https://rpc.stg.hypersonicl2.com/",
      chainId: 200200,
    },
    opinuL1: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
      url: "http://64.226.109.176:8545",
      chainId: 900,
    },
    minato: {
      accounts: [process.env.TESTNET_PRIVATE_KEY || ""],
      url: "http://rpc.minato.soneium.org/",
      chainId: 1946,
    },
    soneium: {
      accounts: [process.env.MAINNET_PRIVATE_KEY || ""],
      url: "https://rpc.soneium.org/",
      chainId: 1868,
    },
    mainnet: {
      accounts: [process.env.MAINNET_PRIVATE_KEY || ""],
      url: "https://eth-mainnet.public.blastapi.io"
    },
    shibuya: {
      url: `https://evm.shibuya.astar.network`,
      accounts: [MAINNET_PRIVATE_KEY]
    },
    astarZkEvm: {
      url: `https://rpc.startale.com/astar-zkevm`,
      accounts: [MAINNET_PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: {
      minato: " ",
      soneium: " ",
      astarZkEvm: " "
    },
    customChains: [
      {
        network: "minato",
        chainId: 1946,
        urls: {
          apiURL: "https://soneium-minato.blockscout.com/api",
          browserURL: "https://soneium-minato.blockscout.com/",
        },
      },
      {
        network: "astarZkEvm",
        chainId: 3776,
        urls: {
          apiURL: "https://astar-zkevm.explorer.startale.com/api",
          browserURL: "https://astar-zkevm.explorer.startale.com/",
        },
      }
    ],
  },
};

export default config;