/**
 * deploy-monad.js
 * Full deployment script for Seven Seas Protocol on Monad.
 *
 * Deploy order (respects dependencies):
 *  1.  ArmadaToken
 *  2.  ArmadaGuild
 *  3.  BattlePass
 *  4.  ShipNFT
 *  5.  MantleArmada (core game)
 *  6.  SEASToken    (testnet placeholder)
 *  7.  AgentController
 *  8.  WagerArena
 *  9.  TournamentArena
 *  10. PredictionMarket
 *
 * Then wires all permissions and funds agent wallets.
 *
 * Usage:
 *   pnpm deploy:monad-testnet
 *   pnpm deploy:monad-mainnet
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// Agent wallet addresses derived from AGENT_PRIVATE_KEY_0..4
// We'll generate them from the private keys at runtime.
const AGENT_ALIASES = [
  "Blackbeard",  // AggressiveRaider
  "Ironclad",    // DefensiveTrader
  "TheGhost",    // AdaptiveLearner
  "Admiralty",   // GuildCoordinator
  "Tempest",     // BalancedAdmiral
];

const AGENT_TYPES = [0, 1, 2, 3, 4];

// Starting ship locations for each agent (spread across the map)
const AGENT_LOCATIONS = [10, 30, 50, 70, 90];
const AGENT_FACTIONS  = [true, false, true, false, true]; // isPirate

// Initial SEAS bankroll per agent (1000 SEAS each)
const AGENT_INITIAL_BANKROLL = hre.ethers.parseEther("1000");
// Initial SEAS for faucet distribution to agents (10k each + extra for treasury)
const AGENT_SEAS_FUND        = hre.ethers.parseEther("10000");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("═══════════════════════════════════════════════════");
  console.log("  Seven Seas Protocol — Monad Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network : ${network} (chainId: ${chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance : ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} MON`);
  console.log("═══════════════════════════════════════════════════\n");

  // Load agent wallets from env
  const agentWallets = [];
  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (pk && pk.trim()) {
      const wallet = new hre.ethers.Wallet(pk.trim(), hre.ethers.provider);
      agentWallets.push(wallet);
      console.log(`  Agent ${i} (${AGENT_ALIASES[i]}): ${wallet.address}`);
    } else {
      console.warn(`  ⚠️  AGENT_PRIVATE_KEY_${i} not set — skipping agent ${AGENT_ALIASES[i]}`);
      agentWallets.push(null);
    }
  }
  console.log();

  const addresses = {};

  // ─────────────────────────────────────────
  // 1. ArmadaToken
  // ─────────────────────────────────────────
  console.log("📦 1/10 Deploying ArmadaToken...");
  const ArmadaToken = await hre.ethers.getContractFactory("ArmadaToken");
  const armadaToken = await ArmadaToken.deploy();
  await armadaToken.waitForDeployment();
  addresses.ArmadaToken = await armadaToken.getAddress();
  console.log(`  ✅ ArmadaToken: ${addresses.ArmadaToken}\n`);

  // ─────────────────────────────────────────
  // 2. ArmadaGuild
  // ─────────────────────────────────────────
  console.log("📦 2/10 Deploying ArmadaGuild...");
  const ArmadaGuild = await hre.ethers.getContractFactory("ArmadaGuild");
  const armadaGuild = await ArmadaGuild.deploy();
  await armadaGuild.waitForDeployment();
  addresses.ArmadaGuild = await armadaGuild.getAddress();
  console.log(`  ✅ ArmadaGuild: ${addresses.ArmadaGuild}\n`);

  // ─────────────────────────────────────────
  // 3. BattlePass
  // ─────────────────────────────────────────
  console.log("📦 3/10 Deploying BattlePass...");
  const BattlePass = await hre.ethers.getContractFactory("BattlePass");
  const battlePass = await BattlePass.deploy(addresses.ArmadaToken);
  await battlePass.waitForDeployment();
  addresses.BattlePass = await battlePass.getAddress();
  console.log(`  ✅ BattlePass: ${addresses.BattlePass}\n`);

  // ─────────────────────────────────────────
  // 4. ShipNFT
  // ─────────────────────────────────────────
  console.log("📦 4/10 Deploying ShipNFT...");
  const ShipNFT = await hre.ethers.getContractFactory("ShipNFT");
  const shipNFT = await ShipNFT.deploy(addresses.ArmadaToken);
  await shipNFT.waitForDeployment();
  addresses.ShipNFT = await shipNFT.getAddress();
  console.log(`  ✅ ShipNFT: ${addresses.ShipNFT}\n`);

  // ─────────────────────────────────────────
  // 5. MantleArmada (core game)
  // ─────────────────────────────────────────
  console.log("📦 5/10 Deploying MantleArmada (core game)...");
  const MantleArmada = await hre.ethers.getContractFactory("MantleArmada");
  const mantleArmada = await MantleArmada.deploy();
  await mantleArmada.waitForDeployment();
  addresses.MantleArmada = await mantleArmada.getAddress();
  console.log(`  ✅ MantleArmada: ${addresses.MantleArmada}\n`);

  // ─────────────────────────────────────────
  // 6. SEASToken
  // ─────────────────────────────────────────
  console.log("📦 6/10 Deploying SEASToken (testnet placeholder)...");
  const SEASToken = await hre.ethers.getContractFactory("SEASToken");
  const seasToken = await SEASToken.deploy();
  await seasToken.waitForDeployment();
  addresses.SEASToken = await seasToken.getAddress();
  console.log(`  ✅ SEASToken: ${addresses.SEASToken}\n`);

  // ─────────────────────────────────────────
  // 7. AgentController
  // ─────────────────────────────────────────
  console.log("📦 7/10 Deploying AgentController...");
  const AgentController = await hre.ethers.getContractFactory("AgentController");
  const agentController = await AgentController.deploy(
    addresses.MantleArmada,
    addresses.SEASToken
  );
  await agentController.waitForDeployment();
  addresses.AgentController = await agentController.getAddress();
  console.log(`  ✅ AgentController: ${addresses.AgentController}\n`);

  // ─────────────────────────────────────────
  // 8. WagerArena
  // ─────────────────────────────────────────
  console.log("📦 8/10 Deploying WagerArena...");
  const WagerArena = await hre.ethers.getContractFactory("WagerArena");
  const wagerArena = await WagerArena.deploy(
    addresses.MantleArmada,
    addresses.AgentController,
    addresses.SEASToken,
    deployer.address // treasury = deployer for now
  );
  await wagerArena.waitForDeployment();
  addresses.WagerArena = await wagerArena.getAddress();
  console.log(`  ✅ WagerArena: ${addresses.WagerArena}\n`);

  // ─────────────────────────────────────────
  // 9. TournamentArena
  // ─────────────────────────────────────────
  console.log("📦 9/10 Deploying TournamentArena...");
  const TournamentArena = await hre.ethers.getContractFactory("TournamentArena");
  const tournamentArena = await TournamentArena.deploy(
    addresses.MantleArmada,
    addresses.AgentController,
    addresses.SEASToken,
    deployer.address // treasury = deployer
  );
  await tournamentArena.waitForDeployment();
  addresses.TournamentArena = await tournamentArena.getAddress();
  console.log(`  ✅ TournamentArena: ${addresses.TournamentArena}\n`);

  // ─────────────────────────────────────────
  // 10. PredictionMarket
  // ─────────────────────────────────────────
  console.log("📦 10/10 Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    addresses.SEASToken,
    deployer.address // treasury = deployer
  );
  await predictionMarket.waitForDeployment();
  addresses.PredictionMarket = await predictionMarket.getAddress();
  console.log(`  ✅ PredictionMarket: ${addresses.PredictionMarket}\n`);

  // ─────────────────────────────────────────
  // Wire permissions
  // ─────────────────────────────────────────
  console.log("🔗 Wiring contract permissions...");

  // MantleArmada ecosystem contracts
  console.log("  → MantleArmada.setEcosystemContracts()");
  await (await mantleArmada.setEcosystemContracts(
    addresses.ArmadaToken,
    addresses.ArmadaGuild,
    addresses.BattlePass,
    addresses.ShipNFT
  )).wait();

  // Arena contract on MantleArmada
  console.log("  → MantleArmada.setArenaContract(WagerArena)");
  await (await mantleArmada.setArenaContract(addresses.WagerArena)).wait();

  // AgentController <-> WagerArena
  console.log("  → AgentController.setWagerArena()");
  await (await agentController.setWagerArena(addresses.WagerArena)).wait();

  // PredictionMarket <-> WagerArena
  console.log("  → PredictionMarket.setWagerArena()");
  await (await predictionMarket.setWagerArena(addresses.WagerArena)).wait();

  // WagerArena <-> PredictionMarket
  console.log("  → WagerArena.setPredictionMarket()");
  await (await wagerArena.setPredictionMarket(addresses.PredictionMarket)).wait();

  // ArmadaToken minter permissions
  console.log("  → ArmadaToken.addMinter(MantleArmada)");
  await (await armadaToken.addMinter(addresses.MantleArmada, "MantleArmada")).wait();

  console.log("  ✅ All permissions wired\n");

  // ─────────────────────────────────────────
  // Set up upgrades in game contract
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
  // Fund and register agents
  // ─────────────────────────────────────────
  if (agentWallets.some(w => w !== null)) {
    console.log("🤖 Setting up agent wallets...");

    for (let i = 0; i < 5; i++) {
      const wallet = agentWallets[i];
      if (!wallet) continue;

      console.log(`\n  Agent ${i}: ${AGENT_ALIASES[i]} (${wallet.address})`);

      // Fund with SEAS tokens
      try {
        const tx = await seasToken.transfer(wallet.address, AGENT_SEAS_FUND);
        await tx.wait();
        console.log(`    ✅ Funded ${hre.ethers.formatEther(AGENT_SEAS_FUND)} SEAS`);
      } catch (e) {
        console.warn(`    ⚠️  SEAS funding failed: ${e.message}`);
      }

      // Check if agent has enough MON for gas — warn if not
      const monBalance = await hre.ethers.provider.getBalance(wallet.address);
      if (monBalance < hre.ethers.parseEther("0.1")) {
        console.warn(`    ⚠️  Low MON balance (${hre.ethers.formatEther(monBalance)} MON) — needs gas!`);
      }

      // Create game account for agent
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

      // Register as agent
      try {
        const agentControllerConnected = agentController.connect(wallet);
        const seasConnected = seasToken.connect(wallet);

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
  console.log("  ✅ Deployment Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n📋 Contract Addresses:\n");
  for (const [name, addr] of Object.entries(addresses)) {
    console.log(`  ${name.padEnd(20)} ${addr}`);
  }

  console.log("\n📝 .env.local values (copy if needed):\n");
  console.log(`NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=${addresses.MantleArmada}`);
  console.log(`NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS=${addresses.ArmadaToken}`);
  console.log(`NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS=${addresses.ArmadaGuild}`);
  console.log(`NEXT_PUBLIC_BATTLE_PASS_ADDRESS=${addresses.BattlePass}`);
  console.log(`NEXT_PUBLIC_SHIP_NFT_ADDRESS=${addresses.ShipNFT}`);
  console.log(`NEXT_PUBLIC_SEAS_TOKEN_ADDRESS=${addresses.SEASToken}`);
  console.log(`NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS=${addresses.AgentController}`);
  console.log(`NEXT_PUBLIC_WAGER_ARENA_ADDRESS=${addresses.WagerArena}`);
  console.log(`NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS=${addresses.TournamentArena}`);
  console.log(`NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${addresses.PredictionMarket}`);

  console.log("\n🚀 Next steps:");
  console.log("  1. Fund agent wallets with MON for gas (if not already)");
  console.log("  2. pnpm agents:testnet      — start the AI agent fleet");
  console.log("  3. pnpm dev                 — start the frontend");
  console.log("  4. Visit http://localhost:3000/arena\n");
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
  console.log("  ✅ .env.local updated with contract addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
