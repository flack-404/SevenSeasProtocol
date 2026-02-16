/**
 * deploy-mainnet.js
 * Mainnet deployment for Seven Seas Protocol on Monad Mainnet (chainId 41454).
 *
 * IMPORTANT: SEASToken is NOT deployed here — it's already live on nad.fun:
 *   0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777
 *
 * Deploy order (9 contracts):
 *  1.  ArmadaToken
 *  2.  ArmadaGuild
 *  3.  BattlePass
 *  4.  ShipNFT
 *  5.  MantleArmada (core game)
 *  6.  AgentController (uses nad.fun SEAS address)
 *  7.  WagerArena
 *  8.  TournamentArena
 *  9.  PredictionMarket
 *
 * Then wires all permissions and sets up agent game accounts.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-mainnet.js --network monadMainnet
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// ─── nad.fun SEAS token (already deployed on mainnet) ───
const SEAS_TOKEN_ADDRESS = "0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777";

const AGENT_ALIASES = [
  "Blackbeard",  // AggressiveRaider
  "Ironclad",    // DefensiveTrader
  "TheGhost",    // AdaptiveLearner
  "Admiralty",   // GuildCoordinator
  "Tempest",     // BalancedAdmiral
];

const AGENT_TYPES = [0, 1, 2, 3, 4];
const AGENT_LOCATIONS = [10, 30, 50, 70, 90];
const AGENT_FACTIONS  = [true, false, true, false, true]; // isPirate

// Agent bankroll for registration (1000 SEAS each)
const AGENT_INITIAL_BANKROLL = hre.ethers.parseEther("1000");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("═══════════════════════════════════════════════════");
  console.log("  Seven Seas Protocol — Monad MAINNET Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network : ${network} (chainId: ${chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance : ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} MON`);
  console.log(`  SEAS    : ${SEAS_TOKEN_ADDRESS} (nad.fun)`);
  console.log("═══════════════════════════════════════════════════\n");

  if (chainId !== 143n) {
    console.warn(`⚠️  WARNING: Expected chainId 143 (Monad Mainnet), got ${chainId}`);
    console.warn("   Use: npx hardhat run scripts/deploy-mainnet.js --network monadMainnet\n");
  }

  // Load agent wallets
  const agentWallets = [];
  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (pk && pk.trim()) {
      const wallet = new hre.ethers.Wallet(pk.trim(), hre.ethers.provider);
      agentWallets.push(wallet);
      const bal = await hre.ethers.provider.getBalance(wallet.address);
      console.log(`  Agent ${i} (${AGENT_ALIASES[i]}): ${wallet.address} — ${hre.ethers.formatEther(bal)} MON`);
    } else {
      console.warn(`  ⚠️  AGENT_PRIVATE_KEY_${i} not set — skipping agent ${AGENT_ALIASES[i]}`);
      agentWallets.push(null);
    }
  }
  console.log();

  // Get SEAS token reference (nad.fun ERC-20 — no deployment needed)
  const seasToken = await hre.ethers.getContractAt("IERC20", SEAS_TOKEN_ADDRESS);
  const deployerSeasBalance = await seasToken.balanceOf(deployer.address);
  console.log(`  Deployer SEAS balance: ${hre.ethers.formatEther(deployerSeasBalance)} SEAS\n`);

  const addresses = {};
  addresses.SEASToken = SEAS_TOKEN_ADDRESS;

  // ─────────────────────────────────────────
  // 1. ArmadaToken
  // ─────────────────────────────────────────
  console.log("📦 1/9 Deploying ArmadaToken...");
  const ArmadaToken = await hre.ethers.getContractFactory("ArmadaToken");
  const armadaToken = await ArmadaToken.deploy();
  await armadaToken.waitForDeployment();
  addresses.ArmadaToken = await armadaToken.getAddress();
  console.log(`  ✅ ArmadaToken: ${addresses.ArmadaToken}\n`);

  // ─────────────────────────────────────────
  // 2. ArmadaGuild
  // ─────────────────────────────────────────
  console.log("📦 2/9 Deploying ArmadaGuild...");
  const ArmadaGuild = await hre.ethers.getContractFactory("ArmadaGuild");
  const armadaGuild = await ArmadaGuild.deploy();
  await armadaGuild.waitForDeployment();
  addresses.ArmadaGuild = await armadaGuild.getAddress();
  console.log(`  ✅ ArmadaGuild: ${addresses.ArmadaGuild}\n`);

  // ─────────────────────────────────────────
  // 3. BattlePass
  // ─────────────────────────────────────────
  console.log("📦 3/9 Deploying BattlePass...");
  const BattlePass = await hre.ethers.getContractFactory("BattlePass");
  const battlePass = await BattlePass.deploy(addresses.ArmadaToken);
  await battlePass.waitForDeployment();
  addresses.BattlePass = await battlePass.getAddress();
  console.log(`  ✅ BattlePass: ${addresses.BattlePass}\n`);

  // ─────────────────────────────────────────
  // 4. ShipNFT
  // ─────────────────────────────────────────
  console.log("📦 4/9 Deploying ShipNFT...");
  const ShipNFT = await hre.ethers.getContractFactory("ShipNFT");
  const shipNFT = await ShipNFT.deploy(addresses.ArmadaToken);
  await shipNFT.waitForDeployment();
  addresses.ShipNFT = await shipNFT.getAddress();
  console.log(`  ✅ ShipNFT: ${addresses.ShipNFT}\n`);

  // ─────────────────────────────────────────
  // 5. MantleArmada (core game)
  // ─────────────────────────────────────────
  console.log("📦 5/9 Deploying MantleArmada (core game)...");
  const MantleArmada = await hre.ethers.getContractFactory("MantleArmada");
  const mantleArmada = await MantleArmada.deploy();
  await mantleArmada.waitForDeployment();
  addresses.MantleArmada = await mantleArmada.getAddress();
  console.log(`  ✅ MantleArmada: ${addresses.MantleArmada}\n`);

  // ─────────────────────────────────────────
  // 6. AgentController (uses nad.fun SEAS address)
  // ─────────────────────────────────────────
  console.log("📦 6/9 Deploying AgentController...");
  const AgentController = await hre.ethers.getContractFactory("AgentController");
  const agentController = await AgentController.deploy(
    addresses.MantleArmada,
    SEAS_TOKEN_ADDRESS
  );
  await agentController.waitForDeployment();
  addresses.AgentController = await agentController.getAddress();
  console.log(`  ✅ AgentController: ${addresses.AgentController}\n`);

  // ─────────────────────────────────────────
  // 7. WagerArena
  // ─────────────────────────────────────────
  console.log("📦 7/9 Deploying WagerArena...");
  const WagerArena = await hre.ethers.getContractFactory("WagerArena");
  const wagerArena = await WagerArena.deploy(
    addresses.MantleArmada,
    addresses.AgentController,
    SEAS_TOKEN_ADDRESS,
    deployer.address // treasury = deployer
  );
  await wagerArena.waitForDeployment();
  addresses.WagerArena = await wagerArena.getAddress();
  console.log(`  ✅ WagerArena: ${addresses.WagerArena}\n`);

  // ─────────────────────────────────────────
  // 8. TournamentArena
  // ─────────────────────────────────────────
  console.log("📦 8/9 Deploying TournamentArena...");
  const TournamentArena = await hre.ethers.getContractFactory("TournamentArena");
  const tournamentArena = await TournamentArena.deploy(
    addresses.MantleArmada,
    addresses.AgentController,
    SEAS_TOKEN_ADDRESS,
    deployer.address // treasury = deployer
  );
  await tournamentArena.waitForDeployment();
  addresses.TournamentArena = await tournamentArena.getAddress();
  console.log(`  ✅ TournamentArena: ${addresses.TournamentArena}\n`);

  // ─────────────────────────────────────────
  // 9. PredictionMarket
  // ─────────────────────────────────────────
  console.log("📦 9/9 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    SEAS_TOKEN_ADDRESS,
    deployer.address // treasury = deployer
  );
  await predictionMarket.waitForDeployment();
  addresses.PredictionMarket = await predictionMarket.getAddress();
  console.log(`  ✅ PredictionMarket: ${addresses.PredictionMarket}\n`);

  // ─────────────────────────────────────────
  // Wire permissions
  // ─────────────────────────────────────────
  console.log("🔗 Wiring contract permissions...");

  console.log("  → MantleArmada.setEcosystemContracts()");
  await (await mantleArmada.setEcosystemContracts(
    addresses.ArmadaToken,
    addresses.ArmadaGuild,
    addresses.BattlePass,
    addresses.ShipNFT
  )).wait();

  console.log("  → MantleArmada.setArenaContract(WagerArena)");
  await (await mantleArmada.setArenaContract(addresses.WagerArena)).wait();

  console.log("  → AgentController.setWagerArena()");
  await (await agentController.setWagerArena(addresses.WagerArena)).wait();

  console.log("  → PredictionMarket.setWagerArena()");
  await (await predictionMarket.setWagerArena(addresses.WagerArena)).wait();

  console.log("  → WagerArena.setPredictionMarket()");
  await (await wagerArena.setPredictionMarket(addresses.PredictionMarket)).wait();

  console.log("  → ArmadaToken.addMinter(MantleArmada)");
  await (await armadaToken.addMinter(addresses.MantleArmada, "MantleArmada")).wait();

  console.log("  ✅ All permissions wired\n");

  // ─────────────────────────────────────────
  // Set up ship upgrades
  // ─────────────────────────────────────────
  console.log("⚓ Adding ship upgrades...");
  const upgrades = [
    { name: "Hull Reinforcement", cost: 100, gpm: 0,  maxHp: 25, speed: 0, atk: 0, def: 5,  crew: 0 },
    { name: "Cannon Battery",     cost: 150, gpm: 0,  maxHp: 0,  speed: 0, atk: 8, def: 0,  crew: 0 },
    { name: "Speed Sails",        cost: 120, gpm: 0,  maxHp: 0,  speed: 2, atk: 0, def: 0,  crew: 0 },
    { name: "Crew Quarters",      cost: 200, gpm: 0,  maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 10 },
    { name: "GPM Engine I",       cost: 300, gpm: 5,  maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 0 },
    { name: "GPM Engine II",      cost: 600, gpm: 10, maxHp: 0,  speed: 0, atk: 0, def: 0,  crew: 0 },
    { name: "Battle Armor",       cost: 250, gpm: 0,  maxHp: 50, speed: 0, atk: 0, def: 10, crew: 0 },
    { name: "Master Cannons",     cost: 400, gpm: 0,  maxHp: 0,  speed: 0, atk: 15, def: 0, crew: 0 },
  ];

  for (const u of upgrades) {
    await (await mantleArmada.addUpgrade(u.name, u.cost, u.gpm, u.maxHp, u.speed, u.atk, u.def, u.crew)).wait();
  }
  console.log(`  ✅ Added ${upgrades.length} upgrades\n`);

  // ─────────────────────────────────────────
  // Create game accounts for agents
  // ─────────────────────────────────────────
  if (agentWallets.some(w => w !== null)) {
    console.log("🤖 Setting up agent game accounts...");

    for (let i = 0; i < 5; i++) {
      const wallet = agentWallets[i];
      if (!wallet) continue;

      console.log(`\n  Agent ${i}: ${AGENT_ALIASES[i]} (${wallet.address})`);

      // Check MON balance for gas
      const monBalance = await hre.ethers.provider.getBalance(wallet.address);
      if (monBalance < hre.ethers.parseEther("0.1")) {
        console.warn(`    ⚠️  Low MON balance (${hre.ethers.formatEther(monBalance)} MON) — needs gas!`);
        console.warn(`    Send at least 0.5 MON to ${wallet.address}`);
      } else {
        console.log(`    MON: ${hre.ethers.formatEther(monBalance)}`);
      }

      // Check SEAS balance
      const seasBalance = await seasToken.balanceOf(wallet.address);
      console.log(`    SEAS: ${hre.ethers.formatEther(seasBalance)}`);

      // Create game account
      try {
        const agentGameContract = mantleArmada.connect(wallet);
        const existingAccount = await mantleArmada.accounts(wallet.address);
        if (existingAccount.hp === 0n && existingAccount.maxHp === 0n) {
          const tx = await agentGameContract.createAccount(
            AGENT_ALIASES[i],
            AGENT_FACTIONS[i],
            AGENT_LOCATIONS[i]
          );
          await tx.wait();
          console.log(`    ✅ Game account created (${AGENT_FACTIONS[i] ? "Pirate" : "Navy"}, loc ${AGENT_LOCATIONS[i]})`);
        } else {
          console.log(`    ℹ️  Game account already exists`);
        }
      } catch (e) {
        console.warn(`    ⚠️  Game account creation failed: ${e.message}`);
      }

      // Register as agent (requires SEAS balance >= 1000)
      if (seasBalance >= AGENT_INITIAL_BANKROLL) {
        try {
          const agentControllerConnected = agentController.connect(wallet);
          const seasConnected = await hre.ethers.getContractAt("IERC20", SEAS_TOKEN_ADDRESS, wallet);

          // Approve bankroll
          const approveTx = await seasConnected.approve(addresses.AgentController, AGENT_INITIAL_BANKROLL);
          await approveTx.wait();

          const regTx = await agentControllerConnected.registerAgent(
            AGENT_TYPES[i],
            AGENT_INITIAL_BANKROLL,
            AGENT_ALIASES[i]
          );
          await regTx.wait();
          console.log(`    ✅ Registered as agent (type ${AGENT_TYPES[i]}, bankroll: 1000 SEAS)`);
        } catch (e) {
          console.warn(`    ⚠️  Agent registration failed: ${e.message}`);
        }
      } else {
        console.warn(`    ⚠️  Insufficient SEAS for registration (need 1000 SEAS, have ${hre.ethers.formatEther(seasBalance)})`);
        console.warn(`    Send 1000+ SEAS to ${wallet.address} then run: npx hardhat run scripts/wire-mainnet.js --network monadMainnet`);
      }
    }
    console.log();
  }

  // ─────────────────────────────────────────
  // Save deployed addresses
  // ─────────────────────────────────────────
  const outputFile = `deployed-addresses-monad-${chainId}.json`;
  const deploymentData = {
    network,
    chainId: chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    addresses,
    seasTokenSource: "nad.fun",
    agentWallets: agentWallets
      .map((w, i) => ({ index: i, alias: AGENT_ALIASES[i], address: w ? w.address : null }))
      .filter(a => a.address),
  };

  fs.writeFileSync(
    path.join(__dirname, "..", outputFile),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`💾 Addresses saved to ${outputFile}`);

  // ─────────────────────────────────────────
  // Update .env.local
  // ─────────────────────────────────────────
  updateEnvLocal(addresses);

  // ─────────────────────────────────────────
  // Print summary
  // ─────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ MAINNET Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n📋 Contract Addresses:\n");
  for (const [name, addr] of Object.entries(addresses)) {
    console.log(`  ${name.padEnd(20)} ${addr}`);
  }

  console.log("\n🚀 Next steps:");
  console.log("  1. Fund each agent wallet with ~0.5 MON for gas");
  console.log("  2. Send 1000+ SEAS to each agent wallet (buy on nad.fun)");
  console.log("  3. If agents weren't registered, run: npx hardhat run scripts/wire-mainnet.js --network monadMainnet");
  console.log("  4. Update .env.local: NEXT_PUBLIC_NETWORK=mainnet");
  console.log("  5. Update .env.local: NEXT_PUBLIC_MONAD_RPC_URL=https://rpc.monad.xyz");
  console.log("  6. pnpm agents:mainnet  — start the AI agent fleet");
  console.log("  7. pnpm dev             — start the frontend");
  console.log("  8. Visit http://localhost:3000/arena\n");

  // Print agent funding summary
  console.log("💰 Agent Wallet Funding Summary:\n");
  for (let i = 0; i < 5; i++) {
    const wallet = agentWallets[i];
    if (!wallet) continue;
    const monBal = await hre.ethers.provider.getBalance(wallet.address);
    const seasBal = await seasToken.balanceOf(wallet.address);
    const needsMon = monBal < hre.ethers.parseEther("0.5");
    const needsSeas = seasBal < AGENT_INITIAL_BANKROLL;
    console.log(`  ${AGENT_ALIASES[i].padEnd(12)} ${wallet.address}`);
    console.log(`    MON:  ${hre.ethers.formatEther(monBal).padEnd(10)} ${needsMon ? "⚠️  NEEDS ~0.5 MON" : "✅"}`);
    console.log(`    SEAS: ${hre.ethers.formatEther(seasBal).padEnd(10)} ${needsSeas ? "⚠️  NEEDS 1000+ SEAS" : "✅"}`);
  }
  console.log();
}

function updateEnvLocal(addresses) {
  const envPath = path.join(__dirname, "..", ".env.local");
  let content = "";
  try {
    content = fs.readFileSync(envPath, "utf8");
  } catch {
    content = "";
  }

  const updates = {
    NEXT_PUBLIC_GAME_CONTRACT_ADDRESS:     addresses.MantleArmada,
    NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS:      addresses.ArmadaToken,
    NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS:    addresses.ArmadaGuild,
    NEXT_PUBLIC_BATTLE_PASS_ADDRESS:       addresses.BattlePass,
    NEXT_PUBLIC_SHIP_NFT_ADDRESS:          addresses.ShipNFT,
    NEXT_PUBLIC_SEAS_TOKEN_ADDRESS:        addresses.SEASToken,
    NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS:  addresses.AgentController,
    NEXT_PUBLIC_WAGER_ARENA_ADDRESS:       addresses.WagerArena,
    NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS:  addresses.TournamentArena,
    NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS: addresses.PredictionMarket,
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content);
  console.log("  ✅ .env.local updated with mainnet contract addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
