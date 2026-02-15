/**
 * test-player.js
 * Tests the three player-facing arena actions:
 *   1. Issue a challenge (accept an open agent match)
 *   2. Predict on an ongoing match
 *   3. Check My Bets
 *
 * Usage: node scripts/test-player.js
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

// ── Contract addresses (read from deployed-addresses JSON) ──────────────
const fs = require("fs");
const path = require("path");
const deployed = JSON.parse(fs.readFileSync(path.join(__dirname, "../deployed-addresses-monad-10143.json"), "utf8"));
const ADDRESSES = {
  MantleArmada:     deployed.MantleArmada,
  SEASToken:        deployed.SEASToken,
  AgentController:  deployed.AgentController,
  WagerArena:       deployed.WagerArena,
  PredictionMarket: deployed.PredictionMarket,
};

// ── ABIs (minimal) ──────────────────────────────────────────────────────
const SEAS_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function claimFaucet() external",
];

const GAME_ABI = [
  "function accounts(address) view returns (string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd)",
  "function createAccount(string _boatName, bool _isPirate, uint256 _startLocation)",
];

const WAGER_ABI = [
  "function getOpenMatches() view returns (uint256[])",
  "function getMatchDetails(uint256 matchId) view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
  "function acceptMatch(uint256 matchId) external",
  "function executeBattle(uint256 matchId) external",
  "function matchCounter() view returns (uint256)",
];

const PM_ABI = [
  "function predictionCounter() view returns (uint256)",
  "function getPrediction(uint256 predictionId) external view returns (uint256 matchId, uint256 agent1Pool, uint256 agent2Pool, bool isSettled, address winner)",
  "function getBet(uint256 predictionId, address bettor) external view returns (uint256 amount, bool betOnAgent1, bool claimed)",
  "function placeBet(uint256 predictionId, bool betOnAgent1, uint256 amount) external",
  "function claimWinnings(uint256 predictionId) external",
  "function predictions(uint256) view returns (uint256 matchId, address agent1, address agent2, uint256 agent1Pool, uint256 agent2Pool, bool isOpen, bool isSettled, address winner)",
  "function getPredictionByMatch(uint256 matchId) external view returns (uint256)",
];

const AC_ABI = [
  "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
];

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(2);
}

function shortAddr(addr) {
  return addr.slice(0, 8) + "..." + addr.slice(-4);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const RPC = process.env.MONAD_RPC_URL_TESTNET || "https://testnet-rpc.monad.xyz";
  const provider = new ethers.JsonRpcProvider(RPC);

  // Player wallet (test wallet provided)
  const PLAYER_PK = "2339234f2974ad7a958b9df78eab2c5eae2b93c7463329c5e60ac936485cfcd0";
  const player = new ethers.Wallet("0x" + PLAYER_PK, provider);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🧪  Seven Seas Protocol — Player Arena Test");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Wallet : ${player.address}`);
  console.log(`  RPC    : ${RPC}\n`);

  // Contracts
  const seas = new ethers.Contract(ADDRESSES.SEASToken, SEAS_ABI, player);
  const game = new ethers.Contract(ADDRESSES.MantleArmada, GAME_ABI, player);
  const arena = new ethers.Contract(ADDRESSES.WagerArena, WAGER_ABI, player);
  const pm = new ethers.Contract(ADDRESSES.PredictionMarket, PM_ABI, player);
  const ac = new ethers.Contract(ADDRESSES.AgentController, AC_ABI, player);

  // ── Check balances ────────────────────────────────────────────────────
  const monBalance = await provider.getBalance(player.address);
  const seasBalance = await seas.balanceOf(player.address);
  console.log(`  MON   : ${fmt(monBalance)}`);
  console.log(`  SEAS  : ${fmt(seasBalance)}`);

  if (monBalance === 0n) {
    console.log("\n❌ No MON balance — fund this wallet with MON for gas first");
    process.exit(1);
  }

  // ── Check/create game account ──────────────────────────────────────────
  console.log("\n─── Game Account ───────────────────────────────────");
  const acc = await game.accounts(player.address);
  if (!acc.boatName || acc.boatName === "") {
    console.log("  No account found — creating one...");
    const tx = await game.createAccount("TestPlayer", false, 1);
    await tx.wait();
    console.log("  ✅ Account created: TestPlayer (location 1)");
  } else {
    console.log(`  Name    : ${acc.boatName}`);
    console.log(`  HP      : ${acc.hp}/${acc.maxHp}`);
    console.log(`  Location: ${acc.location}`);
  }

  // ── Claim SEAS faucet if low (faucet has cooldown — skip if it reverts) ─
  if (seasBalance < ethers.parseEther("100")) {
    console.log("\n  SEAS balance low — attempting faucet claim...");
    try {
      const faucetTx = await seas.claimFaucet();
      await faucetTx.wait();
      const newBal = await seas.balanceOf(player.address);
      console.log(`  ✅ SEAS after claim: ${fmt(newBal)}`);
    } catch {
      console.log("  ⚠️  Faucet on cooldown — proceeding with current balance");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEST 1 — Issue a challenge (accept an open agent match)
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n─── TEST 1: Issue a Challenge ──────────────────────");

  const openMatches = await arena.getOpenMatches();
  console.log(`  Open matches: ${openMatches.length}`);

  let challengeMatchId = null;
  let betPredId = null;

  if (openMatches.length === 0) {
    console.log("  ⚠️  No open matches right now. Agents will create one soon.");
    console.log("  → Skipping challenge test");
  } else {
    // Pick the first open match
    challengeMatchId = openMatches[0];
    const match = await arena.getMatchDetails(challengeMatchId);
    console.log(`  Challenging match #${challengeMatchId}`);
    console.log(`  Challenger (agent): ${shortAddr(match.agent1)}`);
    console.log(`  Wager             : ${fmt(match.wagerAmount)} SEAS`);

    // Check agent info
    try {
      const agentData = await ac.agents(match.agent1);
      console.log(`  Agent alias       : ${agentData.agentAlias} (ELO ${agentData.eloRating})`);
    } catch {}

    const seasBal = await seas.balanceOf(player.address);
    if (seasBal < match.wagerAmount) {
      console.log(`  ❌ Not enough SEAS (have ${fmt(seasBal)}, need ${fmt(match.wagerAmount)})`);
      challengeMatchId = null;
    } else {
      // Pre-approve SEAS for both WagerArena and PredictionMarket in one go
      const [arenaAllowance, pmAllowance] = await Promise.all([
        seas.allowance(player.address, ADDRESSES.WagerArena),
        seas.allowance(player.address, ADDRESSES.PredictionMarket),
      ]);
      if (arenaAllowance < match.wagerAmount) {
        const tx = await seas.approve(ADDRESSES.WagerArena, ethers.parseEther("100000"));
        await tx.wait();
        console.log("  ✅ WagerArena SEAS approved");
      }
      if (pmAllowance < ethers.parseEther("100")) {
        const tx = await seas.approve(ADDRESSES.PredictionMarket, ethers.parseEther("100000"));
        await tx.wait();
        console.log("  ✅ PredictionMarket SEAS approved");
      }

      // ── RAPID sequence: accept → bet → execute (before agents can execute) ──
      console.log(`  → Accepting match #${challengeMatchId}...`);
      const acceptTx = await arena.acceptMatch(challengeMatchId);
      await acceptTx.wait();
      console.log("  ✅ Match accepted! Prediction now open.");

      // Find the prediction that just opened
      const predId = await pm.getPredictionByMatch(challengeMatchId);
      if (predId > 0n) {
        betPredId = Number(predId);
        console.log(`  Prediction #${betPredId} opened — betting 10 SEAS on Agent2 (us)...`);
        const betTx = await pm.placeBet(betPredId, false, ethers.parseEther("10"));
        await betTx.wait();
        console.log("  ✅ Bet placed!");
      }

      // Execute the battle now (before agent can)
      console.log("  → Executing battle...");
      const execTx = await arena.executeBattle(challengeMatchId);
      await execTx.wait();
      const result = await arena.getMatchDetails(challengeMatchId);
      const weWon = result.winner.toLowerCase() === player.address.toLowerCase();
      console.log(`  ✅ Battle done! Result: ${weWon ? "🎉 YOU WON!" : "💀 Agent won"} (${shortAddr(result.winner)})`);
      console.log(`  Rounds: ${result.rounds}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEST 2 — Predict on ongoing agent matches (separate from Test 1)
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n─── TEST 2: Predict on Ongoing Match ───────────────");

  const totalPredictions = await pm.predictionCounter();
  console.log(`  Total predictions created: ${totalPredictions}`);

  if (betPredId !== null) {
    console.log(`  ✅ Already placed a bet in Test 1 (prediction #${betPredId})`);
  } else {
    // Look for any other open prediction (agent vs agent match)
    let extraBetId = null;
    for (let i = Number(totalPredictions); i >= 1; i--) {
      try {
        const predFull = await pm.predictions(i);
        if (predFull.isOpen && !predFull.isSettled) {
          extraBetId = i;
          console.log(`  Found active prediction #${i}: ${shortAddr(predFull.agent1)} vs ${shortAddr(predFull.agent2)}`);
          const betTx = await pm.placeBet(i, true, ethers.parseEther("5"));
          await betTx.wait();
          console.log(`  ✅ Bet 5 SEAS on Agent1 in prediction #${i}`);
          break;
        }
      } catch {}
    }
    if (extraBetId === null) {
      console.log("  ⚠️  No active predictions (all resolved before we could bet)");
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // TEST 3 — My Bets
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n─── TEST 3: My Bets ────────────────────────────────");

  // Re-read prediction counter in case more were created
  const finalCounter = await pm.predictionCounter();
  const scanCount = Math.min(Number(finalCounter), 30);
  let found = 0;

  for (let i = 1; i <= scanCount; i++) {
    try {
      const bet = await pm.getBet(i, player.address);
      if (bet.amount > 0n) {
        found++;
        const predFull = await pm.predictions(i);
        const side = bet.betOnAgent1 ? `Agent1 (${shortAddr(predFull.agent1)})` : `Agent2 (${shortAddr(predFull.agent2)})`;
        let status;
        if (!predFull.isSettled) {
          status = "⏳ Pending (match not yet executed)";
        } else {
          const pickedWinner = bet.betOnAgent1 ? predFull.agent1 : predFull.agent2;
          const won = predFull.winner.toLowerCase() === pickedWinner.toLowerCase();
          status = won ? (bet.claimed ? "✅ Won + Claimed" : "🏆 Won — UNCLAIMED") : "❌ Lost";
        }
        console.log(`  Prediction #${i}: bet ${fmt(bet.amount)} SEAS on ${side} → ${status}`);
      }
    } catch {}
  }

  if (found === 0) {
    console.log("  No bets found for this wallet yet");
  } else {
    console.log(`  Total bets: ${found}`);
  }

  // ── Final balance ──────────────────────────────────────────────────────
  const finalSeas = await seas.balanceOf(player.address);
  console.log(`\n─── Final SEAS Balance: ${fmt(finalSeas)} ───────────────────`);
  console.log("\n✅ All tests complete\n");
}

main().catch(err => {
  console.error("\n❌ Test failed:", err.message || err);
  process.exit(1);
});
