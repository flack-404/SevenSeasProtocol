// Update existing contracts to recognize the new MantleArmada
// Run this AFTER deploying the new MantleArmada contract
const hre = require("hardhat");

async function main() {
  // NEW MantleArmada address from deployment (with pirate vs pirate + admin functions)
  const NEW_MANTLEARMADA = "0x7dC53Ba9097B4E963A0b45B50030D0Fd56138C8A";

  // Existing contract addresses (these don't change)
  const EXISTING_CONTRACTS = {
    ArmadaToken: "0x76C25bf63B05a286e967857080b230f762e29772",
    ArmadaGuild: "0x1dd10f7d8c5C558A936e62E2ace11F1353dc5a25",
    BattlePass: "0xa3a52de616052408F1F571B52aCAa7609487fc31",
    ShipNFT: "0xB6048f00925E89c6266D041Cc00f232715B59d1a"
  };

  console.log("\n🔧 Updating Existing Contracts\n");
  console.log("New MantleArmada Address:", NEW_MANTLEARMADA);
  console.log("");

  try {
    // 1. Update ArmadaToken - Add new MantleArmada as minter
    console.log("[1/4] Updating ArmadaToken...");
    const armadaToken = await hre.ethers.getContractAt("ArmadaToken", EXISTING_CONTRACTS.ArmadaToken);
    const tx1 = await armadaToken.addMinter(NEW_MANTLEARMADA, "MantleArmada");
    await tx1.wait();
    console.log("✅ ArmadaToken can now be minted by new MantleArmada\n");

    // 2. Update ArmadaGuild - Set new game contract
    console.log("[2/4] Updating ArmadaGuild...");
    const armadaGuild = await hre.ethers.getContractAt("ArmadaGuild", EXISTING_CONTRACTS.ArmadaGuild);
    const tx2 = await armadaGuild.setGameContract(NEW_MANTLEARMADA);
    await tx2.wait();
    console.log("✅ ArmadaGuild linked to new MantleArmada\n");

    // 3. Update BattlePass - Set new game contract
    console.log("[3/4] Updating BattlePass...");
    const battlePass = await hre.ethers.getContractAt("BattlePass", EXISTING_CONTRACTS.BattlePass);
    const tx3 = await battlePass.setGameContract(NEW_MANTLEARMADA);
    await tx3.wait();
    console.log("✅ BattlePass linked to new MantleArmada\n");

    // 4. Update ShipNFT - Set new game contract
    console.log("[4/4] Updating ShipNFT...");
    const shipNFT = await hre.ethers.getContractAt("ShipNFT", EXISTING_CONTRACTS.ShipNFT);
    const tx4 = await shipNFT.setGameContract(NEW_MANTLEARMADA);
    await tx4.wait();
    console.log("✅ ShipNFT linked to new MantleArmada\n");

    console.log("=".repeat(80));
    console.log("🎉 ALL CONTRACTS UPDATED SUCCESSFULLY!");
    console.log("=".repeat(80) + "\n");

    console.log("✅ New MantleArmada is now fully integrated with:");
    console.log("   - ArmadaToken (can mint tokens)");
    console.log("   - ArmadaGuild (guild treasury works)");
    console.log("   - BattlePass (XP and rewards work)");
    console.log("   - ShipNFT (NFT minting works)\n");

    console.log("📝 NEXT STEPS:\n");
    console.log("1. Update .env.local:");
    console.log("   NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=" + NEW_MANTLEARMADA);
    console.log("");
    console.log("2. Restart dev server:");
    console.log("   pnpm dev");
    console.log("");
    console.log("3. Test referral system with 2 wallets!\n");

  } catch (error) {
    console.error("\n❌ UPDATE FAILED:");
    console.error(error.message);
    console.error("\nMake sure:");
    console.error("- You're using the correct deployer wallet");
    console.error("- The wallet owns the existing contracts");
    console.error("- You have MNT for gas fees\n");
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
