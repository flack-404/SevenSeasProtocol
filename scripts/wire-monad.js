/**
 * wire-monad.js
 * Resume script — wires permissions and sets up agents for already-deployed contracts.
 * Run after a partial deployment where contracts are live but setup didn't complete.
 *
 * Usage:  npx hardhat run scripts/wire-monad.js --network monadTestnet
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const AGENT_ALIASES    = ["Blackbeard", "Ironclad", "TheGhost", "Admiralty", "Tempest"];
const AGENT_TYPES      = [0, 1, 2, 3, 4];
const AGENT_LOCATIONS  = [10, 30, 50, 70, 90];
const AGENT_FACTIONS   = [true, false, true, false, true];
const AGENT_INITIAL_BANKROLL = hre.ethers.parseEther("1000");
const AGENT_SEAS_FUND        = hre.ethers.parseEther("10000");

// ── Already-deployed addresses from the partial run ──────────────
const ADDRESSES = {
  ArmadaToken:      "0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2",
  ArmadaGuild:      "0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8",
  BattlePass:       "0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB",
  ShipNFT:          "0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC",
  MantleArmada:     "0x13733EFB060e4427330F4Aeb0C46550EAE16b772",
  SEASToken:        "0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6",
  AgentController:  "0x81f2d233a13859046d45BDCE0F5CF58C60774ADb",
  WagerArena:       "0x1800887213B863Cebd7F067B7ED08f03F02445C9",
  TournamentArena:  "0xac8DfFBCF084bb67c94D75C826ed2701456de29C",
  PredictionMarket: "0x9d84b98DBE548e6309D70633cA5680631d00588f",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { chainId } = await hre.ethers.provider.getNetwork();

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Seven Seas Protocol — Monad Wire & Setup");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network : ${hre.network.name} (chainId: ${chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance : ${hre.ethers.formatEther(balance)} MON`);
  console.log("═══════════════════════════════════════════════════\n");

  // Build agent wallets from private keys
  const agentWallets = [];
  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (!pk) throw new Error(`Missing AGENT_PRIVATE_KEY_${i} in .env.local`);
    agentWallets.push(new hre.ethers.Wallet(pk, hre.ethers.provider));
  }

  agentWallets.forEach((w, i) => {
    console.log(`  Agent ${i} (${AGENT_ALIASES[i]}): ${w.address}`);
  });
  console.log();

  // ── Attach to deployed contracts ─────────────────────────────
  const armadaToken     = await hre.ethers.getContractAt("ArmadaToken",      ADDRESSES.ArmadaToken);
  const armadaGuild     = await hre.ethers.getContractAt("ArmadaGuild",      ADDRESSES.ArmadaGuild);
  const battlePass      = await hre.ethers.getContractAt("BattlePass",       ADDRESSES.BattlePass);
  const shipNFT         = await hre.ethers.getContractAt("ShipNFT",          ADDRESSES.ShipNFT);
  const gameContract    = await hre.ethers.getContractAt("MantleArmada",     ADDRESSES.MantleArmada);
  const seasToken       = await hre.ethers.getContractAt("SEASToken",        ADDRESSES.SEASToken);
  const agentController = await hre.ethers.getContractAt("AgentController",  ADDRESSES.AgentController);
  const wagerArena      = await hre.ethers.getContractAt("WagerArena",       ADDRESSES.WagerArena);
  const predictionMarket= await hre.ethers.getContractAt("PredictionMarket", ADDRESSES.PredictionMarket);

  // Set SKIP_WIRING=1 to skip already-completed steps
  const SKIP_WIRING   = process.env.SKIP_WIRING === "1";
  const SKIP_UPGRADES = process.env.SKIP_UPGRADES === "1";
  const SKIP_FUNDING  = process.env.SKIP_FUNDING === "1";

  // ── Wire permissions ─────────────────────────────────────────
  if (SKIP_WIRING) {
    console.log("⏭️  Skipping wiring (SKIP_WIRING=1)");
  } else {
  console.log("🔗 Wiring contract permissions...");

  console.log("  → MantleArmada.setEcosystemContracts()");
  await (await gameContract.setEcosystemContracts(
    ADDRESSES.ArmadaToken,
    ADDRESSES.ArmadaGuild,
    ADDRESSES.BattlePass,
    ADDRESSES.ShipNFT,
  )).wait();

  console.log("  → MantleArmada.setArenaContract(WagerArena)");
  await (await gameContract.setArenaContract(ADDRESSES.WagerArena)).wait();

  console.log("  → AgentController.setWagerArena()");
  await (await agentController.setWagerArena(ADDRESSES.WagerArena)).wait();

  console.log("  → PredictionMarket.setWagerArena()");
  await (await predictionMarket.setWagerArena(ADDRESSES.WagerArena)).wait();

  console.log("  → WagerArena.setPredictionMarket()");
  await (await wagerArena.setPredictionMarket(ADDRESSES.PredictionMarket)).wait();

  console.log("  → ArmadaToken.addMinter(MantleArmada)");
  await (await armadaToken.addMinter(ADDRESSES.MantleArmada, "MantleArmada")).wait();

  console.log("  ✅ All permissions wired\n");
  } // end if !SKIP_WIRING

  // ── Ship upgrades ─────────────────────────────────────────────
  if (SKIP_UPGRADES) {
    console.log("⏭️  Skipping upgrades (SKIP_UPGRADES=1)");
  } else {
  console.log("⚓ Adding ship upgrades...");
  const upgrades = [
    { name: "Hull Reinforcement", cost: 100, gpm: 0,  maxHp: 25, speed: 0, atk: 0, def: 5,  crew: 0 },
    { name: "Cannon Battery",     cost: 150, gpm: 0,  maxHp: 0,  speed: 0, atk: 8, def: 0,  crew: 0 },
    { name: "Speed Sails",        cost: 120, gpm: 0,  maxHp: 0,  speed: 2, atk: 0, def: 0,  crew: 0 },
    { name: "Crew Quarters",      cost: 80,  gpm: 0,  maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 10 },
    { name: "GPM Engine I",       cost: 200, gpm: 5,  maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 0 },
    { name: "GPM Engine II",      cost: 400, gpm: 10, maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 0 },
    { name: "Iron Armor",         cost: 300, gpm: 0,  maxHp: 50, speed: 0, atk: 0, def: 10, crew: 0 },
    { name: "Master Cannons",     cost: 500, gpm: 0,  maxHp: 0,  speed: 0, atk: 15,def: 0,  crew: 0 },
  ];

  for (const u of upgrades) {
    process.stdout.write(`  → Adding "${u.name}"...`);
    await (await gameContract.addUpgrade(
      u.name, u.cost, u.gpm, u.maxHp, u.speed, u.atk, u.def, u.crew
    )).wait();
    console.log(" ✅");
  }
  console.log();
  } // end if !SKIP_UPGRADES

  // ── Fund agent wallets with SEAS ──────────────────────────────
  if (SKIP_FUNDING) {
    console.log("⏭️  Skipping SEAS funding (SKIP_FUNDING=1)");
  } else {
  console.log("💰 Funding agent wallets with SEAS...");
  for (let i = 0; i < 5; i++) {
    const agentAddr = agentWallets[i].address;
    process.stdout.write(`  → Minting 10,000 SEAS → ${AGENT_ALIASES[i]} (${agentAddr.slice(0,10)}...)...`);
    await (await seasToken.mint(agentAddr, AGENT_SEAS_FUND)).wait();
    console.log(" ✅");
  }
  console.log();
  } // end if !SKIP_FUNDING

  // ── Create game accounts for agents ──────────────────────────
  console.log("🚢 Creating game accounts for agents...");
  for (let i = 0; i < 5; i++) {
    const agentSigner = agentWallets[i].connect(hre.ethers.provider);
    const agentGame = gameContract.connect(agentSigner);
    // Max 12 chars per contract requirement
    const shortNames = ["Blackbeard", "Ironclad", "TheGhost", "Admiralty", "Tempest"];
    const boatName = shortNames[i];

    // Check if already has account
    try {
      const existing = await gameContract.accounts(agentWallets[i].address);
      if (existing.maxHp > 0n) {
        console.log(`  ⏭️  ${AGENT_ALIASES[i]} already has an account`);
        continue;
      }
    } catch {}

    process.stdout.write(`  → Creating account for ${AGENT_ALIASES[i]}...`);
    await (await agentGame.createAccount(
      boatName,
      AGENT_FACTIONS[i],
      AGENT_LOCATIONS[i],
    )).wait();
    console.log(" ✅");
  }
  console.log();

  // ── Register agents in AgentController ───────────────────────
  console.log("🤖 Registering agents in AgentController...");
  const MIN_BANKROLL = hre.ethers.parseEther("100");

  for (let i = 0; i < 5; i++) {
    const agentSigner = agentWallets[i].connect(hre.ethers.provider);
    const agentSeas   = seasToken.connect(agentSigner);
    const agentCtrl   = agentController.connect(agentSigner);

    // Check if already registered
    try {
      const isReg = await agentController.isRegistered(agentWallets[i].address);
      if (isReg) {
        console.log(`  ⏭️  ${AGENT_ALIASES[i]} already registered`);
        continue;
      }
    } catch {}

    process.stdout.write(`  → Approving SEAS for ${AGENT_ALIASES[i]}...`);
    await (await agentSeas.approve(ADDRESSES.AgentController, AGENT_INITIAL_BANKROLL)).wait();
    console.log(" ✅");

    process.stdout.write(`  → Registering ${AGENT_ALIASES[i]} (type ${AGENT_TYPES[i]})...`);
    await (await agentCtrl.registerAgent(
      AGENT_TYPES[i],
      AGENT_INITIAL_BANKROLL,
      AGENT_ALIASES[i],
    )).wait();
    console.log(" ✅");
  }
  console.log();

  // ── Save addresses ────────────────────────────────────────────
  console.log("💾 Saving addresses...");

  const outFile = path.join(__dirname, `../deployed-addresses-monad-${chainId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(ADDRESSES, null, 2));
  console.log(`  ✅ Saved to: ${path.basename(outFile)}`);

  // Update .env.local
  const envPath = path.join(__dirname, "../.env.local");
  let envContent = fs.readFileSync(envPath, "utf8");
  const envMap = {
    NEXT_PUBLIC_GAME_CONTRACT_ADDRESS:      ADDRESSES.MantleArmada,
    NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS:        ADDRESSES.ArmadaToken,
    NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS:      ADDRESSES.ArmadaGuild,
    NEXT_PUBLIC_BATTLE_PASS_ADDRESS:         ADDRESSES.BattlePass,
    NEXT_PUBLIC_SHIP_NFT_ADDRESS:            ADDRESSES.ShipNFT,
    NEXT_PUBLIC_SEAS_TOKEN_ADDRESS:          ADDRESSES.SEASToken,
    NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS:    ADDRESSES.AgentController,
    NEXT_PUBLIC_WAGER_ARENA_ADDRESS:         ADDRESSES.WagerArena,
    NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS:    ADDRESSES.TournamentArena,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS:   ADDRESSES.PredictionMarket,
  };
  for (const [key, val] of Object.entries(envMap)) {
    const re = new RegExp(`^(${key}=).*$`, "m");
    envContent = envContent.replace(re, `$1${val}`);
  }
  fs.writeFileSync(envPath, envContent);
  console.log("  ✅ .env.local updated with contract addresses\n");

  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅  Setup complete! Ready to run agents.");
  console.log("  →  pnpm run agents:start");
  console.log("═══════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌ Wire failed:", err.message);
  process.exit(1);
});
