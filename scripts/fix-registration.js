/**
 * fix-registration.js
 * Re-registers TheGhost and Admiralty on the current AgentController.
 * Claims SEAS faucet if wallet balance is too low, then registers.
 */

const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

const AGENT_ALIASES = ["Blackbeard", "Ironclad", "TheGhost", "Admiralty", "Tempest"];
const AGENT_TYPES   = [0, 1, 2, 3, 4];
const MIN_BANKROLL  = hre.ethers.parseEther("100");  // 100 SEAS

const SEAS_TOKEN_ADDR       = process.env.NEXT_PUBLIC_SEAS_TOKEN_ADDRESS;
const AGENT_CONTROLLER_ADDR = process.env.NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS;

async function main() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Seven Seas — Fix Agent Registration");
  console.log("═══════════════════════════════════════════════");
  console.log(`  AgentController: ${AGENT_CONTROLLER_ADDR}`);
  console.log(`  SEASToken      : ${SEAS_TOKEN_ADDR}\n`);

  const seasToken       = await hre.ethers.getContractAt("SEASToken", SEAS_TOKEN_ADDR);
  const agentController = await hre.ethers.getContractAt("AgentController", AGENT_CONTROLLER_ADDR);

  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (!pk) { console.log(`  ⚠️  Missing AGENT_PRIVATE_KEY_${i}`); continue; }

    const wallet = new hre.ethers.Wallet(pk, hre.ethers.provider);
    const alias  = AGENT_ALIASES[i];
    const type   = AGENT_TYPES[i];

    // Check registration
    const isReg = await agentController.isRegistered(wallet.address);
    if (isReg) {
      console.log(`  ✅ ${alias} already registered — skipping`);
      continue;
    }

    console.log(`\n  🔧 Fixing ${alias} (${wallet.address})`);

    // Check SEAS balance
    const seasBal = await seasToken.balanceOf(wallet.address);
    console.log(`     SEAS wallet balance: ${hre.ethers.formatEther(seasBal)} SEAS`);

    // Claim faucet if below MIN_BANKROLL
    if (seasBal < MIN_BANKROLL) {
      console.log(`     Balance < 100 SEAS — claiming faucet...`);
      const monBal = await hre.ethers.provider.getBalance(wallet.address);
      if (monBal < hre.ethers.parseEther("0.01")) {
        console.log(`     ⚠️  MON balance too low for gas: ${hre.ethers.formatEther(monBal)} MON — skipping`);
        continue;
      }
      const seasSigner = seasToken.connect(wallet);
      await (await seasSigner.claimFaucet()).wait();
      const newBal = await seasToken.balanceOf(wallet.address);
      console.log(`     ✅ Faucet claimed — new balance: ${hre.ethers.formatEther(newBal)} SEAS`);
    }

    // Approve AgentController
    const seasWallet = seasToken.connect(wallet);
    process.stdout.write(`     → Approving 100 SEAS...`);
    await (await seasWallet.approve(AGENT_CONTROLLER_ADDR, MIN_BANKROLL)).wait();
    console.log(" ✅");

    // Register
    const ctrlWallet = agentController.connect(wallet);
    process.stdout.write(`     → Registering as type ${type} (alias: ${alias})...`);
    await (await ctrlWallet.registerAgent(type, MIN_BANKROLL, alias)).wait();
    console.log(" ✅");

    // Verify
    const nowReg = await agentController.isRegistered(wallet.address);
    console.log(`     isRegistered: ${nowReg}`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  ✅  Done — pnpm run agents:start");
  console.log("═══════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
