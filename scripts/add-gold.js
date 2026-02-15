// Add gold to accounts for testing
const hre = require("hardhat");

async function main() {
  const MANTLEARMADA = "0x7dC53Ba9097B4E963A0b45B50030D0Fd56138C8A";

  const accounts = [
    "0xE74686Fd89ACB480B3903724C367395d86ED4519",
    "0xb660CcCc75e92Dc5d8bCB73e00C138438e042cFb"
  ];

  const GOLD_AMOUNT = 100000;

  console.log("\n💰 Adding Gold to Test Accounts\n");

  const mantleArmada = await hre.ethers.getContractAt("MantleArmada", MANTLEARMADA);

  for (const account of accounts) {
    try {
      console.log(`Adding ${GOLD_AMOUNT} gold to ${account}...`);
      const tx = await mantleArmada.adminAddGold(account, GOLD_AMOUNT);
      await tx.wait();
      console.log(`✅ Added ${GOLD_AMOUNT} gold to ${account}\n`);
    } catch (error) {
      console.log(`❌ Failed for ${account}: ${error.message}\n`);
    }
  }

  console.log("🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
