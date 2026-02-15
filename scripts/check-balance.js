// Simple script to check account balance on any network
const hre = require("hardhat");

async function main() {
  const [account] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(account.address);
  
  console.log("Network:", hre.network.name);
  console.log("Account:", account.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "tokens");
  
  if (balance === 0n) {
    console.log("\n⚠️ WARNING: Balance is 0! You need testnet tokens.");
    console.log("Get tokens from:");
    
    if (hre.network.name.includes('mantle')) {
      console.log("- Mantle Faucet: https://faucet.sepolia.mantle.xyz");
    } else if (hre.network.name.includes('avalanche')) {
      console.log("- Avalanche Faucet: https://faucet.avax.network");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

