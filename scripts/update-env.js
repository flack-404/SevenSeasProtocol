// This script updates the .env file with contract addresses after deployment
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

async function updateEnvFile(networkType, contractAddresses) {
  // Load the current .env file
  const envPath = path.resolve(process.cwd(), '.env');
  
  // Check if .env file exists, if not create it
  if (!fs.existsSync(envPath)) {
    console.log(".env file not found, creating a new one...");
    const defaultEnvContent = `# Contract addresses will be populated by deploy script
PRIVATE_KEY=
NETWORK_TYPE=${networkType}

`;
    fs.writeFileSync(envPath, defaultEnvContent);
  }

  // Read the current content
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse the current content
  const envConfig = dotenv.parse(envContent);
  
  // Update the appropriate values based on network type
  const networkSuffix = networkType.toUpperCase();
  
  // Set network type
  envConfig.NETWORK_TYPE = networkType;
  
  // Update environment variables for SeasOfLinkardia contract
  if (contractAddresses.SeasOfLinkardia) {
    envConfig[`NEXT_PUBLIC_SEASOFLINKARDIA_CONTRACT_ADDRESS_${networkSuffix}`] = contractAddresses.SeasOfLinkardia;
  }
  
  // Legacy support for gameContract naming
  if (contractAddresses.gameContract) {
    envConfig[`NEXT_PUBLIC_GAME_CONTRACT_ADDRESS_${networkSuffix}`] = contractAddresses.gameContract;
  }
  
  // Convert back to string
  const newEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Write back to .env file
  fs.writeFileSync(envPath, newEnvContent);
  
  console.log(`Updated .env file with ${networkSuffix} contract addresses`);
  
  // Log what was updated
  if (contractAddresses.SeasOfLinkardia) {
    console.log(`  - NEXT_PUBLIC_SEASOFLINKARDIA_CONTRACT_ADDRESS_${networkSuffix}: ${contractAddresses.SeasOfLinkardia}`);
  }
}

module.exports = { updateEnvFile }; 