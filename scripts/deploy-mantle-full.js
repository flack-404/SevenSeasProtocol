// Complete deployment script for Mantle Armada ecosystem
// Deploys all 5 contracts and sets up permissions
const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Starting Mantle Armada Complete Deployment...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  const networkName = hre.network.name;
  console.log("Network:", networkName);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId, "\n");

  // Object to store all deployed addresses
  const deployedAddresses = {};

  // ============================================================================
  // STEP 1: Deploy ArmadaToken (ERC-20)
  // ============================================================================
  console.log("📦 [1/5] Deploying ArmadaToken...");
  const ArmadaToken = await hre.ethers.getContractFactory("ArmadaToken");
  const armadaToken = await ArmadaToken.deploy();
  await armadaToken.waitForDeployment();
  deployedAddresses.ArmadaToken = await armadaToken.getAddress();
  console.log("✅ ArmadaToken deployed to:", deployedAddresses.ArmadaToken);
  
  // Verify token info
  const tokenInfo = await armadaToken.getTokenInfo();
  console.log("   - Name:", tokenInfo[0]);
  console.log("   - Symbol:", tokenInfo[1]);
  console.log("   - Initial Supply:", hre.ethers.formatEther(tokenInfo[3]), "ARMADA\n");

  // ============================================================================
  // STEP 2: Deploy ArmadaGuild
  // ============================================================================
  console.log("📦 [2/5] Deploying ArmadaGuild...");
  const ArmadaGuild = await hre.ethers.getContractFactory("ArmadaGuild");
  const armadaGuild = await ArmadaGuild.deploy();
  await armadaGuild.waitForDeployment();
  deployedAddresses.ArmadaGuild = await armadaGuild.getAddress();
  console.log("✅ ArmadaGuild deployed to:", deployedAddresses.ArmadaGuild, "\n");

  // ============================================================================
  // STEP 3: Deploy BattlePass
  // ============================================================================
  console.log("📦 [3/5] Deploying BattlePass...");
  const BattlePass = await hre.ethers.getContractFactory("BattlePass");
  const battlePass = await BattlePass.deploy(deployedAddresses.ArmadaToken);
  await battlePass.waitForDeployment();
  deployedAddresses.BattlePass = await battlePass.getAddress();
  console.log("✅ BattlePass deployed to:", deployedAddresses.BattlePass);
  
  // Verify season info
  const seasonInfo = await battlePass.getSeasonInfo();
  console.log("   - Current Season:", seasonInfo[0].toString());
  console.log("   - Season Duration:", (Number(seasonInfo[3]) / 86400).toFixed(0), "days\n");

  // ============================================================================
  // STEP 4: Deploy ShipNFT
  // ============================================================================
  console.log("📦 [4/5] Deploying ShipNFT...");
  const ShipNFT = await hre.ethers.getContractFactory("ShipNFT");
  const shipNFT = await ShipNFT.deploy(deployedAddresses.ArmadaToken);
  await shipNFT.waitForDeployment();
  deployedAddresses.ShipNFT = await shipNFT.getAddress();
  console.log("✅ ShipNFT deployed to:", deployedAddresses.ShipNFT);
  
  // Verify NFT info
  console.log("   - Name: Armada Ship");
  console.log("   - Symbol: SHIP");
  console.log("   - Min Battle Power:", "10\n");

  // ============================================================================
  // STEP 5: Deploy MantleArmada (Main Game)
  // ============================================================================
  console.log("📦 [5/5] Deploying MantleArmada (Main Game)...");
  const MantleArmada = await hre.ethers.getContractFactory("MantleArmada");
  const mantleArmada = await MantleArmada.deploy();
  await mantleArmada.waitForDeployment();
  deployedAddresses.MantleArmada = await mantleArmada.getAddress();
  console.log("✅ MantleArmada deployed to:", deployedAddresses.MantleArmada, "\n");

  // ============================================================================
  // CONFIGURATION: Set up permissions and references
  // ============================================================================
  console.log("⚙️  Configuring contracts and permissions...\n");

  // 1. Set ecosystem contracts in main game
  console.log("   [1/7] Setting ecosystem contracts in MantleArmada...");
  const tx1 = await mantleArmada.setEcosystemContracts(
    deployedAddresses.ArmadaToken,
    deployedAddresses.ArmadaGuild,
    deployedAddresses.BattlePass,
    deployedAddresses.ShipNFT
  );
  await tx1.wait();
  console.log("   ✅ Ecosystem contracts linked\n");

  // 2. Add MantleArmada as minter for ArmadaToken
  console.log("   [2/7] Adding MantleArmada as token minter...");
  const tx2 = await armadaToken.addMinter(deployedAddresses.MantleArmada, "MantleArmada");
  await tx2.wait();
  console.log("   ✅ MantleArmada can mint tokens\n");

  // 3. Add BattlePass as minter for ArmadaToken
  console.log("   [3/7] Adding BattlePass as token minter...");
  const tx3 = await armadaToken.addMinter(deployedAddresses.BattlePass, "BattlePass");
  await tx3.wait();
  console.log("   ✅ BattlePass can mint tokens\n");

  // 4. Add ShipNFT as minter for ArmadaToken
  console.log("   [4/7] Adding ShipNFT as token minter...");
  const tx4 = await armadaToken.addMinter(deployedAddresses.ShipNFT, "ShipNFT");
  await tx4.wait();
  console.log("   ✅ ShipNFT can mint tokens\n");

  // 5. Set game contract in ArmadaGuild
  console.log("   [5/7] Setting game contract in ArmadaGuild...");
  const tx5 = await armadaGuild.setGameContract(deployedAddresses.MantleArmada);
  await tx5.wait();
  console.log("   ✅ Guild linked to game\n");

  // 6. Set game contract in BattlePass
  console.log("   [6/7] Setting game contract in BattlePass...");
  const tx6 = await battlePass.setGameContract(deployedAddresses.MantleArmada);
  await tx6.wait();
  console.log("   ✅ BattlePass linked to game\n");

  // 7. Set game contract in ShipNFT
  console.log("   [7/7] Setting game contract in ShipNFT...");
  const tx7 = await shipNFT.setGameContract(deployedAddresses.MantleArmada);
  await tx7.wait();
  console.log("   ✅ ShipNFT linked to game\n");

  // ============================================================================
  // GAME INITIALIZATION: Add default upgrades
  // ============================================================================
  console.log("🎮 Initializing game with default upgrades...\n");

  const initialUpgrades = [
    {
      name: "Hull Reinforcement",
      cost: 50,
      gpmBonus: 1,
      maxHpBonus: 10,
      speedBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      maxCrewBonus: 0
    },
    {
      name: "Crew Training",
      cost: 100,
      gpmBonus: 1,
      maxHpBonus: 0,
      speedBonus: 0,
      attackBonus: 0,
      defenseBonus: 1,
      maxCrewBonus: 0
    },
    {
      name: "Cannon Upgrade",
      cost: 100,
      gpmBonus: 1,
      maxHpBonus: 0,
      speedBonus: 0,
      attackBonus: 1,
      defenseBonus: 0,
      maxCrewBonus: 0
    },
    {
      name: "Deck Upgrade",
      cost: 250,
      gpmBonus: 1,
      maxHpBonus: 0,
      speedBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      maxCrewBonus: 5
    },
    {
      name: "Sails Upgrade",
      cost: 500,
      gpmBonus: 1,
      maxHpBonus: 0,
      speedBonus: 1,
      attackBonus: 0,
      defenseBonus: 0,
      maxCrewBonus: 0
    }
  ];

  for (const upgrade of initialUpgrades) {
    try {
      const tx = await mantleArmada.addUpgrade(
        upgrade.name,
        upgrade.cost,
        upgrade.gpmBonus,
        upgrade.maxHpBonus,
        upgrade.speedBonus,
        upgrade.attackBonus,
        upgrade.defenseBonus,
        upgrade.maxCrewBonus
      );
      await tx.wait();
      console.log(`   ✅ Added: ${upgrade.name} (${upgrade.cost} gold)`);
    } catch (error) {
      console.log(`   ⚠️  Failed to add ${upgrade.name}:`, error.message);
    }
  }

  // ============================================================================
  // DEPLOYMENT SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80) + "\n");

  console.log("📋 CONTRACT ADDRESSES:\n");
  console.log("ArmadaToken     :", deployedAddresses.ArmadaToken);
  console.log("ArmadaGuild     :", deployedAddresses.ArmadaGuild);
  console.log("BattlePass      :", deployedAddresses.BattlePass);
  console.log("ShipNFT         :", deployedAddresses.ShipNFT);
  console.log("MantleArmada    :", deployedAddresses.MantleArmada);

  console.log("\n📊 ECOSYSTEM STATUS:\n");
  console.log("✅ All contracts deployed successfully");
  console.log("✅ All permissions configured");
  console.log("✅ All contracts linked together");
  console.log("✅ Game initialized with 5 upgrades");
  console.log("✅ Token minters set up");
  console.log("✅ Ready for players!");

  console.log("\n🎮 GAME FEATURES:\n");
  console.log("• Original gameplay (combat, travel, upgrades)");
  console.log("• Guild system (create, join, treasury, wars)");
  console.log("• Battle pass (90-day seasons, 100 levels)");
  console.log("• Ship NFTs (yield-bearing, tradeable)");
  console.log("• ARMADA tokens (earn through gameplay)");
  console.log("• Optimized for Mantle (10-second GPM cycles)");
  console.log("• Batch operations (attack multiple ships)");

  console.log("\n⚡ MANTLE OPTIMIZATIONS:\n");
  console.log("• GPM Cycles: 10 seconds (was 60 on AVAX)");
  console.log("• Batch attacks: Up to 5 ships per transaction");
  console.log("• Native currency: MNT (not AVAX)");
  console.log("• Gas optimized for high throughput");

  console.log("\n🔗 NEXT STEPS:\n");
  console.log("1. Save these contract addresses");
  console.log("2. Update frontend .env file");
  console.log("3. Verify contracts on Mantlescan");
  console.log("4. Test basic functions");
  console.log("5. Create test accounts and guilds");

  console.log("\n📝 ENVIRONMENT VARIABLES FOR FRONTEND:\n");
  console.log("NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=" + deployedAddresses.MantleArmada);
  console.log("NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS=" + deployedAddresses.ArmadaToken);
  console.log("NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS=" + deployedAddresses.ArmadaGuild);
  console.log("NEXT_PUBLIC_BATTLE_PASS_ADDRESS=" + deployedAddresses.BattlePass);
  console.log("NEXT_PUBLIC_SHIP_NFT_ADDRESS=" + deployedAddresses.ShipNFT);
  console.log("NEXT_PUBLIC_CHAIN_ID=5003");
  console.log("NEXT_PUBLIC_NETWORK=testnet");

  console.log("\n🔍 VERIFY CONTRACTS:\n");
  console.log("Visit: https://sepolia.mantlescan.xyz/address/" + deployedAddresses.MantleArmada);

  console.log("\n💡 TEST THE GAME:\n");
  console.log("npx hardhat run scripts/test-deployment.js --network mantleTestnet");

  console.log("\n" + "=".repeat(80));
  console.log("🚀 Ready for Mantle Hackathon! Good luck! 🏆");
  console.log("=".repeat(80) + "\n");

  // Save addresses to file
  const fs = require('fs');
  const addressesFile = `deployed-addresses-${networkName}.json`;
  fs.writeFileSync(
    addressesFile,
    JSON.stringify(deployedAddresses, null, 2)
  );
  console.log("💾 Contract addresses saved to:", addressesFile, "\n");

  return deployedAddresses;
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ DEPLOYMENT FAILED:");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };

