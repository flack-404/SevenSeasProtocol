/**
 * redeploy-arena.js
 * Redeploys only WagerArena + AgentController (min wager 1 SEAS fix),
 * then re-wires permissions and re-registers agents.
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const AGENT_ALIASES   = ["Blackbeard", "Ironclad", "TheGhost", "Admiralty", "Tempest"];
const AGENT_TYPES     = [0, 1, 2, 3, 4];
const AGENT_INITIAL_BANKROLL = hre.ethers.parseEther("500"); // 500 SEAS each

// Keep previously deployed addresses
const EXISTING = {
  ArmadaToken:      "0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2",
  ArmadaGuild:      "0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8",
  BattlePass:       "0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB",
  ShipNFT:          "0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC",
  MantleArmada:     "0x13733EFB060e4427330F4Aeb0C46550EAE16b772",
  SEASToken:        "0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6",
  TournamentArena:  "0xac8DfFBCF084bb67c94D75C826ed2701456de29C",
};

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();

  // Build agent wallets
  const agentWallets = [];
  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (!pk) throw new Error(`Missing AGENT_PRIVATE_KEY_${i}`);
    agentWallets.push(new hre.ethers.Wallet(pk, hre.ethers.provider));
  }

  // Pick deployer: use the wallet with most MON
  let deployer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, hre.ethers.provider);
  let deployerBal = await hre.ethers.provider.getBalance(deployer.address);
  for (const w of agentWallets) {
    const b = await hre.ethers.provider.getBalance(w.address);
    if (b > deployerBal) { deployer = w; deployerBal = b; }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Seven Seas — Redeploy WagerArena + AgentController");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance : ${hre.ethers.formatEther(deployerBal)} MON\n`);

  agentWallets.forEach((w, i) => console.log(`  Agent ${i} (${AGENT_ALIASES[i]}): ${w.address}`));
  console.log();

  // ── Deploy AgentController ───────────────────────────────────
  console.log("📦 Deploying AgentController (min wager: 1 SEAS)...");
  const AgentController = await hre.ethers.getContractFactory("AgentController", deployer);
  const agentController = await AgentController.deploy(EXISTING.MantleArmada, EXISTING.SEASToken);
  await agentController.waitForDeployment();
  const agentControllerAddr = await agentController.getAddress();
  console.log(`  ✅ AgentController: ${agentControllerAddr}`);

  // ── Deploy WagerArena ────────────────────────────────────────
  console.log("📦 Deploying WagerArena (min wager: 1 SEAS)...");
  const WagerArena = await hre.ethers.getContractFactory("WagerArena", deployer);
  const wagerArena = await WagerArena.deploy(
    EXISTING.MantleArmada,
    agentControllerAddr,
    EXISTING.SEASToken,
    deployer.address, // treasury
  );
  await wagerArena.waitForDeployment();
  const wagerArenaAddr = await wagerArena.getAddress();
  console.log(`  ✅ WagerArena: ${wagerArenaAddr}`);

  // ── Deploy PredictionMarket (fresh, wired to new WagerArena) ─
  console.log("📦 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket", deployer);
  const predictionMarket = await PredictionMarket.deploy(EXISTING.SEASToken, deployer.address);
  await predictionMarket.waitForDeployment();
  const predictionMarketAddr = await predictionMarket.getAddress();
  console.log(`  ✅ PredictionMarket: ${predictionMarketAddr}`);

  // ── Wire permissions ─────────────────────────────────────────
  console.log("\n🔗 Wiring permissions...");

  // MantleArmada → new WagerArena as arena
  const gameContract = await hre.ethers.getContractAt("MantleArmada", EXISTING.MantleArmada);
  console.log("  → MantleArmada.setArenaContract(WagerArena)");
  await (await gameContract.setArenaContract(wagerArenaAddr)).wait();

  // AgentController → new WagerArena
  console.log("  → AgentController.setWagerArena()");
  await (await agentController.setWagerArena(wagerArenaAddr)).wait();

  // WagerArena → PredictionMarket
  console.log("  → WagerArena.setPredictionMarket()");
  await (await wagerArena.setPredictionMarket(predictionMarketAddr)).wait();

  // PredictionMarket → WagerArena
  console.log("  → PredictionMarket.setWagerArena()");
  await (await predictionMarket.setWagerArena(wagerArenaAddr)).wait();

  console.log("  ✅ Permissions wired\n");

  // ── Register agents (approve + register) ─────────────────────
  console.log("🤖 Registering agents...");
  const seasToken = await hre.ethers.getContractAt("SEASToken", EXISTING.SEASToken);

  for (let i = 0; i < 5; i++) {
    const agentSigner = agentWallets[i].connect(hre.ethers.provider);
    const agentSeas   = seasToken.connect(agentSigner);
    const agentCtrl   = agentController.connect(agentSigner);

    // Check if already registered
    const isReg = await agentController.isRegistered(agentWallets[i].address);
    if (isReg) {
      console.log(`  ⏭️  ${AGENT_ALIASES[i]} already registered`);
      continue;
    }

    process.stdout.write(`  → Approving SEAS for ${AGENT_ALIASES[i]}...`);
    await (await agentSeas.approve(agentControllerAddr, AGENT_INITIAL_BANKROLL)).wait();
    console.log(" ✅");

    process.stdout.write(`  → Registering ${AGENT_ALIASES[i]} (type ${AGENT_TYPES[i]})...`);
    await (await agentCtrl.registerAgent(AGENT_TYPES[i], AGENT_INITIAL_BANKROLL, AGENT_ALIASES[i])).wait();
    console.log(" ✅");
  }
  console.log();

  // ── Save new addresses ────────────────────────────────────────
  const newAddresses = {
    ...EXISTING,
    AgentController:  agentControllerAddr,
    WagerArena:       wagerArenaAddr,
    PredictionMarket: predictionMarketAddr,
  };

  const outFile = path.join(__dirname, `../deployed-addresses-monad-${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(newAddresses, null, 2));
  console.log(`💾 Saved: ${path.basename(outFile)}`);

  // Update .env.local
  const envPath = path.join(__dirname, "../.env.local");
  let env = fs.readFileSync(envPath, "utf8");
  const patch = {
    NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS:  agentControllerAddr,
    NEXT_PUBLIC_WAGER_ARENA_ADDRESS:       wagerArenaAddr,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: predictionMarketAddr,
  };
  for (const [k, v] of Object.entries(patch)) {
    env = env.replace(new RegExp(`^(${k}=).*$`, "m"), `$1${v}`);
  }
  fs.writeFileSync(envPath, env);
  console.log("💾 .env.local updated\n");

  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅  Done! New addresses:");
  console.log(`     AgentController:  ${agentControllerAddr}`);
  console.log(`     WagerArena:       ${wagerArenaAddr}`);
  console.log(`     PredictionMarket: ${predictionMarketAddr}`);
  console.log("  →  pnpm run agents:start");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
