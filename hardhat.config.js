require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");
require("dotenv").config({ path: ".env.local" });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const MONAD_API_KEY = process.env.MONAD_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      mining: {
        auto: true,
        interval: 1000,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    anvilFork: {
      url: "http://127.0.0.1:8545",
      chainId: 10143,
      accounts: [PRIVATE_KEY],
    },
    monadTestnet: {
      chainId: 10143,
      url: process.env.MONAD_RPC_URL_TESTNET || "https://testnet-rpc.monad.xyz",
      accounts:
        PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000"
          ? [PRIVATE_KEY]
          : [],
    },
    monadMainnet: {
      chainId: 41454,
      url: process.env.MONAD_RPC_URL_MAINNET || "https://rpc.monad.xyz",
      accounts:
        PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000"
          ? [PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    apiKey: {
      monadTestnet: MONAD_API_KEY,
      monadMainnet: MONAD_API_KEY,
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadexplorer.com/api",
          browserURL: "https://testnet.monadexplorer.com",
        },
      },
      {
        network: "monadMainnet",
        chainId: 41454,
        urls: {
          apiURL: "https://monadexplorer.com/api",
          browserURL: "https://monadexplorer.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    token: "MON",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
  },
  mocha: {
    timeout: 60000,
  },
};
