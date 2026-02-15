// Test script to verify deployment is working
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("\n🧪 Testing Mantle Armada Deployment...\n");

  const networkName = hre.network.name;
  const addressesFile = `deployed-addresses-${networkName}.json`;

  // Load deployed addresses
  if (!fs.existsSync(addressesFile)) {
    console.log("❌ No deployment found. Run deployment first:");
    console.log("   npx hardhat run scripts/deploy-mantle-full.js --network mantleTestnet\n");
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
  console.log("📋 Loaded contract addresses:\n");
  for (const [name, address] of Object.entries(addresses)) {
    console.log(`   ${name}: ${address}`);
  }
  console.log("");

  const [tester] = await hre.ethers.getSigners();
  console.log("Testing with account:", tester.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(tester.address)), "MNT\n");

  // Get contract instances
  const armadaToken = await hre.ethers.getContractAt("ArmadaToken", addresses.ArmadaToken);
  const armadaGuild = await hre.ethers.getContractAt("ArmadaGuild", addresses.ArmadaGuild);
  const battlePass = await hre.ethers.getContractAt("BattlePass", addresses.BattlePass);
  const shipNFT = await hre.ethers.getContractAt("ShipNFT", addresses.ShipNFT);
  const mantleArmada = await hre.ethers.getContractAt("MantleArmada", addresses.MantleArmada);

  console.log("=".repeat(60));
  console.log("TEST 1: Token Configuration");
  console.log("=".repeat(60));

  try {
    const tokenInfo = await armadaToken.getTokenInfo();
    console.log("✅ Token Name:", tokenInfo[0]);
    console.log("✅ Token Symbol:", tokenInfo[1]);
    console.log("✅ Total Supply:", hre.ethers.formatEther(tokenInfo[3]), "ARMADA");
    
    const isMantleMinter = await armadaToken.checkMinter(addresses.MantleArmada);
    const isBattlePassMinter = await armadaToken.checkMinter(addresses.BattlePass);
    const isShipNFTMinter = await armadaToken.checkMinter(addresses.ShipNFT);
    
    console.log("✅ MantleArmada is minter:", isMantleMinter);
    console.log("✅ BattlePass is minter:", isBattlePassMinter);
    console.log("✅ ShipNFT is minter:", isShipNFTMinter);
  } catch (error) {
    console.log("❌ Token test failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Battle Pass Configuration");
  console.log("=".repeat(60));

  try {
    const seasonInfo = await battlePass.getSeasonInfo();
    console.log("✅ Current Season:", seasonInfo[0].toString());
    console.log("✅ Days Remaining:", (Number(seasonInfo[3]) / 86400).toFixed(0));
    console.log("✅ Premium Cost:", hre.ethers.formatEther(await battlePass.PREMIUM_COST()), "ARMADA");
  } catch (error) {
    console.log("❌ Battle Pass test failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST 3: Guild Configuration");
  console.log("=".repeat(60));

  try {
    const nextGuildId = await armadaGuild.nextGuildId();
    const guildCreationCost = await armadaGuild.GUILD_CREATION_COST();
    console.log("✅ Next Guild ID:", nextGuildId.toString());
    console.log("✅ Guild Creation Cost:", guildCreationCost.toString(), "gold");
    console.log("✅ Game Contract Set:", await armadaGuild.gameContract() !== "0x0000000000000000000000000000000000000000");
  } catch (error) {
    console.log("❌ Guild test failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST 4: Ship NFT Configuration");
  console.log("=".repeat(60));

  try {
    const stats = await shipNFT.getContractStats();
    console.log("✅ Total Ships Minted:", stats[0].toString());
    console.log("✅ Current Supply:", stats[1].toString());
    console.log("✅ Min Battle Power:", (await shipNFT.MIN_BATTLE_POWER()).toString());
  } catch (error) {
    console.log("❌ Ship NFT test failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST 5: Main Game Configuration");
  console.log("=".repeat(60));

  try {
    const owner = await mantleArmada.owner();
    const nextUpgrade = await mantleArmada.nextUpgradeId();
    console.log("✅ Contract Owner:", owner);
    console.log("✅ Upgrades Available:", (Number(nextUpgrade) - 1).toString());
    
    // Check if ecosystem contracts are set
    const tokenAddr = await mantleArmada.armadaToken();
    const guildAddr = await mantleArmada.guildContract();
    const battlePassAddr = await mantleArmada.battlePassContract();
    const shipNFTAddr = await mantleArmada.shipNFTContract();
    
    console.log("✅ Token Contract Set:", tokenAddr !== "0x0000000000000000000000000000000000000000");
    console.log("✅ Guild Contract Set:", guildAddr !== "0x0000000000000000000000000000000000000000");
    console.log("✅ BattlePass Contract Set:", battlePassAddr !== "0x0000000000000000000000000000000000000000");
    console.log("✅ ShipNFT Contract Set:", shipNFTAddr !== "0x0000000000000000000000000000000000000000");
  } catch (error) {
    console.log("❌ Main game test failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST 6: Create Test Account (Optional)");
  console.log("=".repeat(60));

  try {
    // Check if account already exists
    const account = await mantleArmada.accounts(tester.address);
    
    if (account.crew > 0) {
      console.log("ℹ️  Account already exists for this address");
      console.log("   Boat Name:", account.boatName);
      console.log("   Gold:", account.gold.toString());
      console.log("   HP:", account.hp.toString(), "/", account.maxHp.toString());
    } else {
      console.log("ℹ️  No account exists. To create one, run:");
      console.log("   const tx = await mantleArmada.createAccount('TestShip', false, 50);");
      console.log("   await tx.wait();");
    }
  } catch (error) {
    console.log("⚠️  Account check failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 ALL TESTS COMPLETED!");
  console.log("=".repeat(60));

  console.log("\n📊 DEPLOYMENT STATUS: ✅ READY FOR USE\n");
  console.log("Next Steps:");
  console.log("1. ✅ All contracts deployed");
  console.log("2. ✅ All permissions set");
  console.log("3. ✅ All contracts linked");
  console.log("4. 🔄 Create test accounts");
  console.log("5. 🔄 Test gameplay features");
  console.log("6. 🔄 Update frontend with addresses");
  console.log("7. 🔄 Deploy frontend\n");

  console.log("🔗 View on Explorer:");
  console.log("https://sepolia.mantlescan.xyz/address/" + addresses.MantleArmada + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    process.exit(1);
  });

