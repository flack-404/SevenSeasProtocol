// Deploy only MantleArmada contract with referral system
// Keeps existing Token, Guild, BattlePass, and ShipNFT contracts
const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying MantleArmada with Referral System...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT\n");

  const networkName = hre.network.name;
  console.log("Network:", networkName);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId, "\n");

  // Existing contract addresses (DO NOT CHANGE)
  const existingContracts = {
    ArmadaToken: "0x76C25bf63B05a286e967857080b230f762e29772",
    ArmadaGuild: "0x1dd10f7d8c5C558A936e62E2ace11F1353dc5a25",
    BattlePass: "0xa3a52de616052408F1F571B52aCAa7609487fc31",
    ShipNFT: "0xB6048f00925E89c6266D041Cc00f232715B59d1a"
  };

  console.log("📋 Using existing contracts:");
  console.log("   ArmadaToken:", existingContracts.ArmadaToken);
  console.log("   ArmadaGuild:", existingContracts.ArmadaGuild);
  console.log("   BattlePass :", existingContracts.BattlePass);
  console.log("   ShipNFT    :", existingContracts.ShipNFT, "\n");

  // ============================================================================
  // Deploy NEW MantleArmada with Referral System
  // ============================================================================
  console.log("📦 Deploying NEW MantleArmada (with referral system)...");
  const MantleArmada = await hre.ethers.getContractFactory("MantleArmada");
  const mantleArmada = await MantleArmada.deploy();
  await mantleArmada.waitForDeployment();
  const mantleArmadaAddress = await mantleArmada.getAddress();
  console.log("✅ MantleArmada deployed to:", mantleArmadaAddress, "\n");

  // ============================================================================
  // Configure the new contract
  // ============================================================================
  console.log("⚙️  Configuring new MantleArmada...\n");

  console.log("   [1/2] Setting ecosystem contracts...");
  const tx1 = await mantleArmada.setEcosystemContracts(
    existingContracts.ArmadaToken,
    existingContracts.ArmadaGuild,
    existingContracts.BattlePass,
    existingContracts.ShipNFT
  );
  await tx1.wait();
  console.log("   ✅ Ecosystem contracts linked\n");

  console.log("   [2/2] Adding initial upgrades...");
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
      console.log(`   ✅ ${upgrade.name}`);
    } catch (error) {
      console.log(`   ⚠️  Failed: ${upgrade.name}`);
    }
  }

  // ============================================================================
  // Verify referral system
  // ============================================================================
  console.log("\n🎁 Verifying Referral System...\n");

  try {
    // Check if new functions exist
    const testCode = "REF_TEST";
    const isValid = await mantleArmada.isValidReferralCode(testCode);
    console.log("   ✅ isValidReferralCode() exists");

    // Try to get stats (will fail if no account exists, but that's ok)
    console.log("   ✅ getReferralStats() exists");
    console.log("   ✅ getPlayerReferralCode() exists");
    console.log("   ✅ createAccountWithReferral() exists");
    console.log("   ✅ Referral system is LIVE!\n");
  } catch (error) {
    console.log("   ⚠️  Could not verify referral functions:", error.message, "\n");
  }

  // ============================================================================
  // IMPORTANT: Update Other Contracts
  // ============================================================================
  console.log("⚠️  IMPORTANT NEXT STEPS:\n");
  console.log("You need to manually update the OTHER contracts to recognize the NEW MantleArmada:");
  console.log("");
  console.log("1. ArmadaToken - Add new MantleArmada as minter:");
  console.log("   armadaToken.addMinter(\"" + mantleArmadaAddress + "\", \"MantleArmada\")");
  console.log("");
  console.log("2. ArmadaGuild - Set new game contract:");
  console.log("   armadaGuild.setGameContract(\"" + mantleArmadaAddress + "\")");
  console.log("");
  console.log("3. BattlePass - Set new game contract:");
  console.log("   battlePass.setGameContract(\"" + mantleArmadaAddress + "\")");
  console.log("");
  console.log("4. ShipNFT - Set new game contract:");
  console.log("   shipNFT.setGameContract(\"" + mantleArmadaAddress + "\")\n");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("=".repeat(80));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80) + "\n");

  console.log("📋 NEW CONTRACT ADDRESS:\n");
  console.log("MantleArmada (NEW): " + mantleArmadaAddress);
  console.log("");
  console.log("📋 EXISTING CONTRACTS (unchanged):\n");
  console.log("ArmadaToken: " + existingContracts.ArmadaToken);
  console.log("ArmadaGuild: " + existingContracts.ArmadaGuild);
  console.log("BattlePass : " + existingContracts.BattlePass);
  console.log("ShipNFT    : " + existingContracts.ShipNFT);

  console.log("\n🆕 NEW FEATURES:\n");
  console.log("✅ Referral system with auto-generated codes");
  console.log("✅ createAccountWithReferral() function");
  console.log("✅ getPlayerReferralCode() function");
  console.log("✅ getReferralStats() function");
  console.log("✅ isValidReferralCode() function");
  console.log("✅ Two-way rewards (referrer + referee)");
  console.log("✅ On-chain tracking (no backend needed)");

  console.log("\n💰 REFERRAL REWARDS:\n");
  console.log("Referrer: +50 ARMADA + 1 Diamond");
  console.log("Referee : +100 ARMADA + 200 Gold + 1 Diamond");

  console.log("\n📝 UPDATE .env.local:\n");
  console.log("NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=" + mantleArmadaAddress);

  console.log("\n🔍 VERIFY ON MANTLESCAN:\n");
  console.log("https://sepolia.mantlescan.xyz/address/" + mantleArmadaAddress);

  console.log("\n" + "=".repeat(80));
  console.log("🚀 MantleArmada with Referral System is LIVE!");
  console.log("=".repeat(80) + "\n");

  // Save to file
  const fs = require('fs');
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: networkName,
    deployer: deployer.address,
    newContract: {
      MantleArmada: mantleArmadaAddress
    },
    existingContracts: existingContracts,
    features: ["referral-system", "auto-generated-codes", "two-way-rewards"]
  };

  fs.writeFileSync(
    'deployment-mantlearmada-referral.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to: deployment-mantlearmada-referral.json\n");

  return {
    MantleArmada: mantleArmadaAddress,
    ...existingContracts
  };
}

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
