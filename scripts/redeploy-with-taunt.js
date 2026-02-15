/**
 * redeploy-with-taunt.js
 * Redeploys only WagerArena (with taunt support) + PredictionMarket.
 * Reuses existing AgentController — agents keep their bankrolls and ELO.
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// Keep all previously deployed addresses — only WagerArena + PredictionMarket change
const EXISTING = {
  ArmadaToken:     "0x1D8D70AD07C8E7E442AD78E4AC0A16f958Eba7F0",
  ArmadaGuild:     "0xA9e6Bfa2BF53dE88FEb19761D9b2eE2e821bF1Bf",
  BattlePass:      "0x1E3b98102e19D3a164d239BdD190913C2F02E756",
  ShipNFT:         "0x3fdc08D815cc4ED3B7F69Ee246716f2C8bCD6b07",
  MantleArmada:    "0x286B8DecD5ED79c962b2d8F4346CD97FF0E2C352",
  SEASToken:       "0xb868Cc77A95a65F42611724AF05Aa2d3B6Ec05F2",
  TournamentArena: "0x9338CA7d556248055f5751d85cDA7aD6eF254433",
  AgentController: "0x70E5370b8981Abc6e14C91F4AcE823954EFC8eA3",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Seven Seas — Redeploy WagerArena (+ taunt support)");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Deployer:        ${deployer.address}`);
  console.log(`  Balance:         ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} MON`);
  console.log(`  AgentController: ${EXISTING.AgentController} (reused — agents keep ELO & bankrolls)`);
  console.log();

  // ── Deploy WagerArena (with taunt) ───────────────────────────
  console.log("📦 Deploying WagerArena (with taunt)...");
  const WagerArena = await hre.ethers.getContractFactory("WagerArena");
  const wagerArena = await WagerArena.deploy(
    EXISTING.MantleArmada,
    EXISTING.AgentController,
    EXISTING.SEASToken,
    deployer.address, // treasury
  );
  await wagerArena.waitForDeployment();
  const wagerArenaAddr = await wagerArena.getAddress();
  console.log(`  ✅ WagerArena: ${wagerArenaAddr}`);

  // ── Deploy PredictionMarket (wired to new WagerArena) ────────
  console.log("📦 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(EXISTING.SEASToken, deployer.address);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddr = await predictionMarket.getAddress();
  console.log(`  ✅ PredictionMarket: ${predictionMarketAddr}`);

  // ── Wire permissions ─────────────────────────────────────────
  console.log("\n🔗 Wiring permissions...");

  const gameContract    = await hre.ethers.getContractAt("MantleArmada",    EXISTING.MantleArmada);
  const agentController = await hre.ethers.getContractAt("AgentController", EXISTING.AgentController);

  console.log("  → MantleArmada.setArenaContract(WagerArena)");
  await (await gameContract.setArenaContract(wagerArenaAddr)).wait();

  console.log("  → AgentController.setWagerArena(WagerArena)");
  await (await agentController.setWagerArena(wagerArenaAddr)).wait();

  console.log("  → WagerArena.setPredictionMarket()");
  await (await wagerArena.setPredictionMarket(predictionMarketAddr)).wait();

  console.log("  → PredictionMarket.setWagerArena()");
  await (await predictionMarket.setWagerArena(wagerArenaAddr)).wait();

  console.log("  ✅ All permissions wired\n");

  // ── Save addresses ────────────────────────────────────────────
  const newAddresses = {
    ...EXISTING,
    WagerArena:       wagerArenaAddr,
    PredictionMarket: predictionMarketAddr,
  };

  const outFile = path.join(__dirname, `../deployed-addresses-monad-${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(newAddresses, null, 2));
  console.log(`💾 Saved: ${path.basename(outFile)}`);

  // ── Update .env.local ─────────────────────────────────────────
  const envPath = path.join(__dirname, "../.env.local");
  let env = fs.readFileSync(envPath, "utf8");
  const patch = {
    NEXT_PUBLIC_WAGER_ARENA_ADDRESS:       wagerArenaAddr,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: predictionMarketAddr,
  };
  for (const [k, v] of Object.entries(patch)) {
    if (new RegExp(`^${k}=`, "m").test(env)) {
      env = env.replace(new RegExp(`^(${k}=).*$`, "m"), `$1${v}`);
    } else {
      env += `\n${k}=${v}`;
    }
  }
  fs.writeFileSync(envPath, env);
  console.log("💾 .env.local updated\n");

  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅  Done!");
  console.log(`     WagerArena:       ${wagerArenaAddr}`);
  console.log(`     PredictionMarket: ${predictionMarketAddr}`);
  console.log("  →  Restart agents: pnpm agents:testnet");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
