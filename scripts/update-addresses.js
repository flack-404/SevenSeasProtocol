// This script can be run to manually update contract addresses in .env file
const hre = require("hardhat");
const { updateEnvFile } = require("./update-env");

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/update-addresses.js --network <network> <networkType> <seasOfLinkardiaAddress>");
    console.error("Example: npx hardhat run scripts/update-addresses.js --network AvalancheTestnet testnet 0x1234567890abcdef...");
    process.exit(1);
  }
  
  const networkType = args[0];
  const seasOfLinkardiaAddress = args[1];
  
  if (networkType !== 'mainnet' && networkType !== 'testnet') {
    console.error("Network type must be 'mainnet' or 'testnet'");
    process.exit(1);
  }
  
  // Validate contract address format
  if (!seasOfLinkardiaAddress || !seasOfLinkardiaAddress.startsWith('0x') || seasOfLinkardiaAddress.length !== 42) {
    console.error("Invalid contract address format. Must be a valid Ethereum address (0x...)");
    process.exit(1);
  }
  
  // Create contract addresses object   
  const contractAddresses = {
    SeasOfLinkardia: seasOfLinkardiaAddress
  };
  
  // Update environment variables
  await updateEnvFile(networkType, contractAddresses);
  console.log(`✅ Updated environment variables for ${networkType}`);
  console.log(`📋 SeasOfLinkardia contract address: ${seasOfLinkardiaAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 