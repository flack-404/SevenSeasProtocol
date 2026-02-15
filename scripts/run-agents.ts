/**
 * run-agents.ts
 * Seven Seas Protocol — Autonomous AI Agent Fleet
 *
 * Runs 5 AI pirates on Monad testnet. Each agent:
 *  - Has its own wallet and private key
 *  - Reads game state from chain every 30 seconds
 *  - Calls Groq LLM (llama-3.3-70b-versatile) for strategic decisions
 *  - Executes transactions autonomously
 *
 * Usage:
 *   pnpm agents:testnet
 */

import { ethers } from "ethers";
import Groq from "groq-sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const NETWORK = process.env.NETWORK || "testnet";
const RPC_URL = NETWORK === "mainnet"
  ? (process.env.MONAD_RPC_URL_MAINNET || "https://rpc.monad.xyz")
  : (process.env.MONAD_RPC_URL_TESTNET || "https://testnet-rpc.monad.xyz");

const DECISION_INTERVAL_MS = 30_000; // 30 seconds
const BATTLE_WINDOW_MS     = 90_000; // 90s prediction window before battle executes

// ─────────────────────────────────────────────────────────────
// Agent archetypes
// ─────────────────────────────────────────────────────────────

interface AgentConfig {
  index: number;
  alias: string;
  emoji: string;
  type: number;
  systemPrompt: string;
}

const AGENT_CONFIGS: AgentConfig[] = [
  {
    index: 0,
    alias: "Blackbeard",
    emoji: "🏴‍☠️",
    type: 0,
    systemPrompt: `You are Blackbeard, the most feared pirate captain on the Seven Seas.
You are aggressive, reckless, and live for battle. You wager big and attack often.
Strategy rules:
- Always prioritize battles over farming
- Wager 20-30% of your SEAS bankroll on fights
- Only repair if HP < 40% — you embrace the risk
- If you have gold > 500, upgrade your cannons (attack)
- You prefer weak opponents (low ELO or low win rate) for easy wins
- Never idle — if nothing to do, claim GPM and look for a fight
PSYCHOLOGICAL WARFARE:
- Before creating a big wager match, taunt your intended target: "YER [stat] IS PATHETIC! COME FACE BLACKBEARD!"
- After winning, always taunt the loser: "HAHAHA! ANOTHER FOOL SINKS!"
- If someone taunted you (TauntsReceived), retaliate with an even bigger wager AND a counter-taunt
- Target the weakest opponent (lowest win rate or ELO) in OpenMatches with taunts
- Taunt style: ALL CAPS, pirate speech, brutally reference their stats
- Use address(0) as target only for general declarations of dominance
Respond in pirate character, then your JSON decision.`,
  },
  {
    index: 1,
    alias: "Ironclad",
    emoji: "⚓",
    type: 1,
    systemPrompt: `You are Admiral Ironclad, a disciplined Navy commander.
You are conservative, methodical, and protect your assets above all else.
Strategy rules:
- Only wager when HP > 80% AND your ELO is higher than the opponent's ELO
- Wager conservatively: 5-10% of bankroll
- Repair immediately if HP drops below 70%
- Prioritize GPM upgrades for passive income
- Stay at ports when possible — safe zones
- Never take unnecessary risks
PSYCHOLOGICAL WARFARE:
- Only taunt when you have a clear ELO advantage (>50 ELO above target)
- Taunt style: cold, formal, demoralizing through confidence — never aggressive
- When accepting a match against a lower-ELO opponent, taunt first: "The Navy does not lose to [alias]. Accepted."
- If a lower-ELO agent taunts you (TauntsReceived), do NOT respond — silence is more intimidating
- If a higher-ELO agent taunts you, send one formal challenge taunt then accept their match
- Example taunts: "Your formation is sloppy.", "My record speaks for itself.", "The Navy's victory is inevitable."
Respond in formal military tone, then your JSON decision.`,
  },
  {
    index: 2,
    alias: "TheGhost",
    emoji: "👻",
    type: 2,
    systemPrompt: `You are TheGhost, a mysterious mercenary who calculates every move.
You use the Kelly Criterion for optimal bankroll sizing and study opponent patterns.
Strategy rules:
- Apply Kelly Criterion: wager% = (win_rate - loss_rate) / odds
- If win_rate > 60%, bet up to 20%. If 40-60%, bet 15%. Below 40%, bet 10%.
- Repair if HP < 60%
- Use opponent profiles: prefer opponents with low win rate (WR < 50%) in OpenMatches
- Upgrade attack if attack < defense * 1.2
- Maximize edge: only wager when your stats favor you
PSYCHOLOGICAL WARFARE:
- Taunt style: cryptic, data-driven, unnerving — reveal you know their exact stats
- When targeting an opponent with low win rate: "I've calculated your edge. It's [WR]%. Negative."
- After a win: send a cold analytical taunt: "Expected outcome. Data confirmed."
- If taunted (TauntsReceived): counter with the sender's exact bankroll and win rate from their profile
- Target opponents on losing streaks (losses > wins) — they are tilted
- Never taunt more than once per cycle — precision over volume
Respond as a calculating strategist, then your JSON decision.`,
  },
  {
    index: 3,
    alias: "Admiralty",
    emoji: "🎖️",
    type: 3,
    systemPrompt: `You are the Admiralty, a fleet coordinator who builds alliances and dominates through organization.
Strategy rules:
- Always maintain full crew (hire crew at ports if below max)
- Wager 15% of bankroll — medium risk
- Prioritize crew and GPM upgrades over combat stats
- Repair if HP < 50%
- Claim GPM frequently to fuel crew and upgrades
- Look for opponents with similar ELO in OpenMatches for fair fights
PSYCHOLOGICAL WARFARE:
- Use taunt as fleet command broadcasts — use address(0) as target for declarations
- When on a win streak (wins > losses * 1.3): broadcast dominance: "The Admiralty fleet is [W]-[L]. The seas answer to us. Who dares?"
- Before a big wager match, broadcast an announcement: "Fleet mobilizing. [wager] SEAS on the line."
- After winning: "Fleet record updated. Victory logged."
- Do NOT taunt on a losing streak — regroup in silence
- Taunt style: commanding, institutional ("The Admiralty notes...", "Fleet command reports...")
Respond with military coordination language, then your JSON decision.`,
  },
  {
    index: 4,
    alias: "Tempest",
    emoji: "🌊",
    type: 4,
    systemPrompt: `You are Admiral Tempest, an unpredictable force of nature.
You adapt constantly — sometimes aggressive, sometimes defensive, always surprising.
Strategy rules:
- Balance between all strategies — mix based on current situation
- If on a win streak (wins > losses * 1.5): increase aggression, bet 20%
- If on a loss streak (losses > wins): go defensive, bet only 10%
- Repair if HP < 65%
- Mix upgrade types — don't specialize
- Use opponent ELO and bankroll from OpenMatches to pick the most interesting target
PSYCHOLOGICAL WARFARE:
- WIN STREAK mode: aggressive taunts targeting the current #1 ELO: "The storm is at [W]-[L]. [target], you are in my eye."
- LOSS STREAK mode: philosophical calm taunts: "Even the ocean recedes before the tsunami.", "You haven't seen my real strategy yet."
- After a loss: taunt the winner with weather metaphor: "The wind changes direction. Watch."
- Randomly alternate between targeted taunts and broadcasts — be unpredictable
- Taunt style: dramatic, weather metaphors, cryptic, sometimes chaotic
Respond with dramatic weather metaphors, then your JSON decision.`,
  },
];

// ─────────────────────────────────────────────────────────────
// ABIs (minimal)
// ─────────────────────────────────────────────────────────────

const GAME_ABI = [
  "function createAccount(string boatName, bool isPirate, uint256 startLocation)",
  "function accounts(address) view returns (string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd)",
  "function getClaimableGold(address player) view returns (uint256)",
  "function claimGPM()",
  "function buyUpgrade(uint256 id)",
  "function hireCrew()",
  "function repairShip(uint8 repairType)",
  "function completeRepair()",
  "function isRepairReady(address player) view returns (bool)",
  "function checkIn()",
  "function isPort(uint256 location) view returns (bool)",
];

const AGENT_CONTROLLER_ABI = [
  "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
  "function getAgentStats(address) view returns (uint256 bankroll, uint256 wins, uint256 losses, uint256 eloRating, uint256 totalWagers)",
  "function getLeaderboard(uint256 count) view returns (address[], uint256[])",
  "function isRegistered(address) view returns (bool)",
  "function registerAgent(uint8 agentType, uint256 initialBankroll, string agentAlias)",
  "function depositBankroll(uint256 amount)",
];

const WAGER_ARENA_ABI = [
  "function createMatch(uint256 wagerAmount) returns (uint256 matchId)",
  "function acceptMatch(uint256 matchId)",
  "function executeBattle(uint256 matchId)",
  "function cancelMatch(uint256 matchId)",
  "function getOpenMatches() view returns (uint256[])",
  "function getMatchDetails(uint256 matchId) view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
  "function matchCounter() view returns (uint256)",
  "event MatchCreated(uint256 indexed matchId, address indexed challenger, uint256 wagerAmount)",
  "event MatchAccepted(uint256 indexed matchId, address indexed opponent)",
  "event MatchCompleted(uint256 indexed matchId, address indexed winner, uint256 payout)",
  "function taunt(address target, string message)",
  "function lastTauntTime(address) view returns (uint256)",
  "event AgentTaunt(address indexed from, address indexed target, string message, uint256 timestamp)",
];

const SEAS_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function claimTestTokens()",
];

const TOURNAMENT_ABI = [
  "function createTournament(uint256 entryFee, uint8 maxParticipants) returns (uint256)",
  "function joinTournament(uint256 tournamentId)",
  "function advanceRound(uint256 tournamentId)",
  "function getTournament(uint256 tournamentId) view returns (uint256 entryFee, uint8 maxParticipants, uint8 currentParticipants, uint8 currentRound, bool isActive, address champion)",
  "function activeTournamentCount() view returns (uint256)",
];

const PREDICTION_ABI = [
  "function placeBet(uint256 predictionId, bool betOnAgent1, uint256 amount)",
  "function claimWinnings(uint256 predictionId)",
  "function getPrediction(uint256 predictionId) view returns (uint256 matchId, uint256 agent1Pool, uint256 agent2Pool, bool isSettled, address winner)",
  "function predictionCounter() view returns (uint256)",
  "function matchToPrediction(uint256 matchId) view returns (uint256)",
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface GameState {
  boatName: string;
  isPirate: boolean;
  gold: bigint;
  hp: bigint;
  maxHp: bigint;
  attack: bigint;
  defense: bigint;
  speed: bigint;
  crew: bigint;
  maxCrew: bigint;
  location: bigint;
  gpm: bigint;
  claimableGold: bigint;
  isAtPort: boolean;
  canRepair: boolean;
}

interface AgentState {
  bankroll: bigint;
  wins: bigint;
  losses: bigint;
  eloRating: bigint;
  totalWagers: bigint;
  seasBalance: bigint;
  isRegistered: boolean;
}

interface OpenMatch {
  matchId: bigint;
  agent1: string;
  agent2: string;
  wagerAmount: bigint;
}

type AgentDecision =
  | { action: "wager_battle";    wagerAmount: string; reasoning: string }
  | { action: "accept_match";    matchId: string; reasoning: string }
  | { action: "execute_battle";  matchId: string; reasoning: string }
  | { action: "claim_gpm";       reasoning: string }
  | { action: "repair_ship";     repairType: number; reasoning: string }
  | { action: "hire_crew";       reasoning: string }
  | { action: "upgrade";         upgradeId: number; reasoning: string }
  | { action: "check_in";        reasoning: string }
  | { action: "join_tournament"; tournamentId: string; reasoning: string }
  | { action: "place_bet";       predictionId: string; betOnAgent1: boolean; betAmount: string; reasoning: string }
  | { action: "claim_winnings";  predictionId: string; reasoning: string }
  | { action: "deposit_bankroll"; amount: string; reasoning: string }
  | { action: "cancel_match";    matchId: string; reasoning: string }
  | { action: "taunt";           target: string; message: string; reasoning: string }
  | { action: "idle";            reasoning: string };

// ─────────────────────────────────────────────────────────────
// NavalAgent class
// ─────────────────────────────────────────────────────────────

class NavalAgent {
  private config: AgentConfig;
  private wallet: ethers.Wallet;
  private groq: Groq;

  private gameContract: ethers.Contract;
  private agentController: ethers.Contract;
  private wagerArena: ethers.Contract;
  private seasToken: ethers.Contract;
  private tournamentArena: ethers.Contract;
  private predictionMarket: ethers.Contract;

  private pendingMatchIds: bigint[] = [];
  private acceptedAtMs: Map<string, number> = new Map(); // matchId → ms when accepted
  private isRunning = false;
  private cycleCount = 0;
  private opponentProfiles: Map<string, {
    alias: string; elo: number; wins: number; losses: number;
    bankroll: bigint; winRate: number;
  }> = new Map();

  constructor(config: AgentConfig, privateKey: string, provider: ethers.JsonRpcProvider) {
    this.config   = config;
    this.wallet   = new ethers.Wallet(privateKey, provider);
    this.groq     = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const addrs = loadAddresses();

    this.gameContract     = new ethers.Contract(addrs.MantleArmada,      GAME_ABI,             this.wallet);
    this.agentController  = new ethers.Contract(addrs.AgentController,   AGENT_CONTROLLER_ABI, this.wallet);
    this.wagerArena       = new ethers.Contract(addrs.WagerArena,        WAGER_ARENA_ABI,      this.wallet);
    this.seasToken        = new ethers.Contract(addrs.SEASToken,         SEAS_TOKEN_ABI,       this.wallet);
    this.tournamentArena  = new ethers.Contract(addrs.TournamentArena,   TOURNAMENT_ABI,       this.wallet);
    this.predictionMarket = new ethers.Contract(addrs.PredictionMarket,  PREDICTION_ABI,       this.wallet);
  }

  get tag(): string {
    return `[${this.config.emoji} ${this.config.alias}]`;
  }

  log(msg: string): void {
    console.log(`${new Date().toISOString().slice(11, 19)} ${this.tag} ${msg}`);
  }

  warn(msg: string): void {
    console.warn(`${new Date().toISOString().slice(11, 19)} ${this.tag} ⚠️  ${msg}`);
  }

  // ─── State readers ───

  async getGameState(): Promise<GameState | null> {
    try {
      const acc = await this.gameContract.accounts(this.wallet.address);
      if (acc.maxHp === 0n) return null; // No account

      const claimableGold = await this.gameContract.getClaimableGold(this.wallet.address);
      const isAtPort      = await this.gameContract.isPort(acc.location);
      const canRepair     = acc.hp === 0n && isAtPort;

      return {
        boatName:     acc.boatName,
        isPirate:     acc.isPirate,
        gold:         acc.gold,
        hp:           acc.hp,
        maxHp:        acc.maxHp,
        attack:       acc.attack,
        defense:      acc.defense,
        speed:        acc.speed,
        crew:         acc.crew,
        maxCrew:      acc.maxCrew,
        location:     acc.location,
        gpm:          acc.gpm,
        claimableGold,
        isAtPort,
        canRepair,
      };
    } catch (e) {
      this.warn(`getGameState failed: ${e}`);
      return null;
    }
  }

  async getAgentState(): Promise<AgentState | null> {
    try {
      const isRegistered = await this.agentController.isRegistered(this.wallet.address);
      const seasBalance  = await this.seasToken.balanceOf(this.wallet.address);

      if (!isRegistered) {
        return { bankroll: 0n, wins: 0n, losses: 0n, eloRating: 1000n, totalWagers: 0n, seasBalance, isRegistered: false };
      }

      const stats = await this.agentController.getAgentStats(this.wallet.address);
      return {
        bankroll:    stats[0],
        wins:        stats[1],
        losses:      stats[2],
        eloRating:   stats[3],
        totalWagers: stats[4],
        seasBalance,
        isRegistered: true,
      };
    } catch (e) {
      this.warn(`getAgentState failed: ${e}`);
      return null;
    }
  }

  async getOpenMatches(): Promise<OpenMatch[]> {
    try {
      const matchIds: bigint[] = await this.wagerArena.getOpenMatches();
      const matches: OpenMatch[] = [];

      for (const id of matchIds) {
        const details = await this.wagerArena.getMatchDetails(id);
        // Skip own matches
        if (details[0].toLowerCase() === this.wallet.address.toLowerCase()) continue;
        matches.push({ matchId: id, agent1: details[0], agent2: details[1], wagerAmount: details[2] });
      }

      return matches;
    } catch {
      return [];
    }
  }

  async getLeaderboard(): Promise<{ address: string; elo: bigint }[]> {
    try {
      const [addrs, elos]: [string[], bigint[]] = await this.agentController.getLeaderboard(10);
      return addrs.map((a, i) => ({ address: a, elo: elos[i] }));
    } catch {
      return [];
    }
  }

  async fetchOpponentProfile(address: string): Promise<{
    alias: string; elo: number; wins: number; losses: number; bankroll: bigint; winRate: number;
  } | null> {
    try {
      const d = await this.agentController.agents(address);
      const wins   = Number(d.wins);
      const losses = Number(d.losses);
      return {
        alias:    d.agentAlias || address.slice(0, 6),
        elo:      Number(d.eloRating),
        wins,
        losses,
        bankroll: d.bankroll,
        winRate:  (wins + losses) > 0 ? wins / (wins + losses) : 0.5,
      };
    } catch {
      return null;
    }
  }

  async fetchRecentTaunts(): Promise<{ from: string; target: string; message: string }[]> {
    try {
      const provider = this.wallet.provider!;
      const block    = await provider.getBlockNumber();
      const filter   = this.wagerArena.filters.AgentTaunt();
      const events   = await this.wagerArena.queryFilter(filter, Math.max(0, block - 300), block);
      return events.map((e: any) => ({
        from:    e.args.from    as string,
        target:  e.args.target  as string,
        message: e.args.message as string,
      }));
    } catch {
      return [];
    }
  }

  // ─── Groq LLM decision ───

  async askGroq(
    gameState: GameState,
    agentState: AgentState,
    openMatches: OpenMatch[],
    leaderboard: { address: string; elo: bigint }[],
    opponentProfiles: Map<string, { alias: string; elo: number; wins: number; losses: number; bankroll: bigint; winRate: number }>,
    recentTaunts: { from: string; target: string; message: string }[],
  ): Promise<AgentDecision> {
    // Build enriched open-match line with opponent profiles
    const openMatchLine = openMatches.length === 0
      ? "none"
      : openMatches.slice(0, 3).map(m => {
          const p = opponentProfiles.get(m.agent1.toLowerCase());
          const oppStr = p
            ? `${p.alias}(ELO:${p.elo} WR:${Math.round(p.winRate * 100)}% Bank:${ethers.formatEther(p.bankroll).slice(0, 6)}SEAS)`
            : m.agent1.slice(0, 8);
          return `#${m.matchId}:${ethers.formatEther(m.wagerAmount)}SEAS vs ${oppStr}`;
        }).join(" | ");

    // Taunts directed at this agent (last 2)
    const myAddr = this.wallet.address.toLowerCase();
    const tauntsAtMe = recentTaunts
      .filter(t => t.target.toLowerCase() === myAddr)
      .slice(-2)
      .map(t => {
        const p = opponentProfiles.get(t.from.toLowerCase());
        return `${p?.alias || t.from.slice(0, 6)} taunts: "${t.message}"`;
      }).join("; ");

    // How many taunts I sent recently (prevent spam)
    const myTauntsRecent = recentTaunts.filter(t => t.from.toLowerCase() === myAddr).length;

    const userMessage = `
HP:${gameState.hp}/${gameState.maxHp} Gold:${gameState.gold} Claimable:${ethers.formatEther(gameState.claimableGold)}GOLD GPM:${gameState.gpm} ATK:${gameState.attack} DEF:${gameState.defense} Port:${gameState.isAtPort}
ELO:${agentState.eloRating} ${agentState.wins}W/${agentState.losses}L Bankroll:${ethers.formatEther(agentState.bankroll)}SEAS
OpenMatches:${openMatchLine}
Top3ELO:${leaderboard.slice(0, 3).map(e => `${e.address.slice(0, 6)}:${e.elo}`).join(" ")}
${tauntsAtMe ? `TauntsReceived:${tauntsAtMe}` : ""}
TauntsSentRecently:${myTauntsRecent}

Actions: wager_battle(wagerAmount int SEAS 1-1000) | accept_match(matchId) | taunt(target addr,message str) | claim_gpm(ONLY if Claimable>0) | repair_ship(repairType 0/1/2) | hire_crew | upgrade(upgradeId 0-7) | check_in | deposit_bankroll(amount) | cancel_match(matchId) | idle
TauntRules: Use taunt strategically (before big wager=intimidation, after win=dominance, vs taunter=retaliation). Max 1 per cycle. Message max 100 chars, in character. Use address(0) for broadcast. NEVER taunt if TauntsSentRecently>=2.
Priority: claim_gpm(if Claimable>0) > accept_match > wager_battle > taunt(if strategic) > upgrade(if gold>300) > idle. NEVER choose claim_gpm if Claimable=0.0.
Output: one sentence in character, then JSON on last line.
{"action":"wager_battle","wagerAmount":"50","reasoning":"..."}
{"action":"taunt","target":"0x1234...","message":"Your end is near.","reasoning":"intimidation before match"}
`.trim();

    try {
      const response = await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: this.config.systemPrompt },
          { role: "user",   content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const text = response.choices[0]?.message?.content || "";
      this.log(`💬 ${text.split("\n")[0].trim()}`);

      // Extract JSON from last line
      const lines = text.trim().split("\n");
      const jsonLine = lines.reverse().find(l => l.trim().startsWith("{"));
      if (!jsonLine) throw new Error("No JSON in response");

      return JSON.parse(jsonLine) as AgentDecision;
    } catch (e) {
      this.warn(`Groq call failed: ${e} — falling back to chain decision`);
      return this.fallbackDecision(gameState, agentState, openMatches);
    }
  }

  // ─── Rule-based fallback (if Groq fails) ───

  fallbackDecision(gameState: GameState, agentState: AgentState, openMatches: OpenMatch[]): AgentDecision {
    if (gameState.hp === 0n && gameState.canRepair)
      return { action: "repair_ship", repairType: 0, reasoning: "ship wrecked, free repair" };

    if (gameState.claimableGold > 0n)
      return { action: "claim_gpm", reasoning: "auto-claim pending gold" };

    // Proactively top up bankroll before hitting the 100 SEAS deactivation floor
    if (agentState.bankroll < ethers.parseEther("200")) {
      return { action: "deposit_bankroll", amount: "500", reasoning: "bankroll low — topping up before deactivation" };
    }

    // Build own-match wager amount
    const canCreate = agentState.bankroll >= ethers.parseEther("20");
    let createDecision: AgentDecision | null = null;
    if (canCreate) {
      const wager = agentState.bankroll / 10n;
      const capped = wager > ethers.parseEther("200") ? ethers.parseEther("200") : wager;
      const floored = capped < ethers.parseEther("10") ? ethers.parseEther("10") : capped;
      createDecision = { action: "wager_battle", wagerAmount: floored.toString(), reasoning: "creating match" };
    }

    // Accept only matches the agent can afford
    const affordable = openMatches.filter(m => m.wagerAmount <= agentState.bankroll);

    if (affordable.length > 0 && createDecision) {
      // Randomize: 40% chance to accept, 60% chance to create own match
      // This ensures all agents appear as battle options, not just Blackbeard
      if (Math.random() < 0.4) {
        const m = affordable[0];
        return { action: "accept_match", matchId: m.matchId.toString(), reasoning: "accepting affordable challenge" };
      }
      return createDecision;
    }

    if (affordable.length > 0) {
      const m = affordable[0];
      return { action: "accept_match", matchId: m.matchId.toString(), reasoning: "accepting affordable challenge" };
    }

    if (createDecision) return createDecision;

    return { action: "idle", reasoning: "insufficient bankroll" };
  }

  // ─── Transaction execution ───

  async executeDecision(decision: AgentDecision, agentState: AgentState): Promise<void> {
    const addrs = loadAddresses();

    try {
      switch (decision.action) {

        case "claim_gpm": {
          this.log("⛏️  Claiming GPM gold...");
          const tx = await this.gameContract.claimGPM();
          await tx.wait();
          this.log("✅ GPM claimed");
          break;
        }

        case "repair_ship": {
          const gs = await this.getGameState();
          if (!gs || gs.hp > 0n) { this.log("ℹ️  Ship doesn't need repair"); break; }
          if (!gs.isAtPort) { this.log("ℹ️  Not at port — can't repair"); break; }

          const repairType = decision.repairType ?? 0;
          this.log(`🔧 Repairing ship (type ${repairType})...`);

          const repairReady = await this.gameContract.isRepairReady(this.wallet.address);
          if (repairReady) {
            await (await this.gameContract.completeRepair()).wait();
            this.log("✅ Repair completed");
          } else {
            await (await this.gameContract.repairShip(repairType)).wait();
            this.log("✅ Repair started");
          }
          break;
        }

        case "hire_crew": {
          this.log("👥 Hiring crew...");
          await (await this.gameContract.hireCrew()).wait();
          this.log("✅ Crew hired");
          break;
        }

        case "upgrade": {
          const upgradeId = decision.upgradeId ?? 0;
          this.log(`⚔️  Upgrading (id: ${upgradeId})...`);
          await (await this.gameContract.buyUpgrade(upgradeId)).wait();
          this.log(`✅ Upgrade ${upgradeId} purchased`);
          break;
        }

        case "check_in": {
          this.log("📅 Daily check-in...");
          await (await this.gameContract.checkIn()).wait();
          this.log("✅ Check-in done");
          break;
        }

        case "wager_battle": {
          // Normalise: LLM may return whole SEAS (e.g. 100) or wei (e.g. 1e20).
          // Values < 1e15 are treated as whole SEAS and converted to wei.
          // Parse wager: handle floats (e.g. "253.94") by flooring, handle wei strings, handle missing
          const rawWager = String(decision.wagerAmount ?? "100");
          const parsedWager = rawWager.includes(".") ? Math.floor(parseFloat(rawWager)).toString() : rawWager;
          let wagerAmt = BigInt(parsedWager || "100");
          const ONE_SEAS = ethers.parseEther("1");
          if (wagerAmt < ONE_SEAS) wagerAmt = wagerAmt * ONE_SEAS; // treat as whole SEAS
          // Clamp to [1 SEAS, 1000 SEAS]
          const MIN_WAGER = ethers.parseEther("1");
          const MAX_WAGER = ethers.parseEther("1000");
          if (wagerAmt < MIN_WAGER) wagerAmt = MIN_WAGER;
          if (wagerAmt > MAX_WAGER) wagerAmt = MAX_WAGER;

          if (agentState.bankroll < wagerAmt) {
            this.warn(`Bankroll (${ethers.formatEther(agentState.bankroll)} SEAS) < wager (${ethers.formatEther(wagerAmt)} SEAS)`);
            break;
          }

          // Ensure SEAS allowance
          await this.ensureSeasApproval(addrs.WagerArena, wagerAmt);

          this.log(`⚔️  Creating wager match for ${ethers.formatEther(wagerAmt)} SEAS...`);
          const tx = await this.wagerArena.createMatch(wagerAmt);
          const receipt = await tx.wait();

          // Get matchId from MatchCreated event (ethers v6: parseLog returns null on no match, doesn't throw)
          const iface = new ethers.Interface(WAGER_ARENA_ABI);
          let matchId: bigint | string = "?";
          for (const l of (receipt?.logs ?? [])) {
            try {
              const parsed = iface.parseLog({ topics: l.topics as string[], data: l.data });
              if (parsed && parsed.name === "MatchCreated") {
                matchId = parsed.args[0] as bigint;
                break;
              }
            } catch { /* not this event */ }
          }
          this.log(`✅ Match #${matchId} created | Wager: ${ethers.formatEther(wagerAmt)} SEAS`);
          if (typeof matchId === "bigint") this.pendingMatchIds.push(matchId);
          break;
        }

        case "accept_match": {
          const matchId = BigInt(String(decision.matchId).replace(/\D/g, ""));
          const details = await this.wagerArena.getMatchDetails(matchId);
          if (details[3]) { this.log(`ℹ️  Match #${matchId} already accepted`); break; }
          if (details[4]) { this.log(`ℹ️  Match #${matchId} already completed`); break; }

          const wagerAmt = details[2] as bigint;
          if (agentState.bankroll < wagerAmt) {
            this.warn(`Bankroll too low to accept match #${matchId}`);
            break;
          }

          await this.ensureSeasApproval(addrs.WagerArena, wagerAmt);

          this.log(`🤝 Accepting match #${matchId} (${ethers.formatEther(wagerAmt)} SEAS)...`);
          const tx = await this.wagerArena.acceptMatch(matchId);
          await tx.wait();
          this.log(`✅ Match #${matchId} accepted — prediction window open for ${BATTLE_WINDOW_MS / 1000}s`);
          this.pendingMatchIds.push(matchId);
          this.acceptedAtMs.set(matchId.toString(), Date.now());
          break;
        }

        case "execute_battle": {
          const matchId = BigInt(String(decision.matchId).replace(/\D/g, ""));
          const acceptedAt = this.acceptedAtMs.get(matchId.toString()) ?? 0;
          const elapsed = Date.now() - acceptedAt;
          if (elapsed < BATTLE_WINDOW_MS) {
            const remaining = Math.ceil((BATTLE_WINDOW_MS - elapsed) / 1000);
            this.log(`⏳ Match #${matchId} — prediction window: ${remaining}s remaining`);
            break;
          }
          this.log(`⚔️  Executing battle for match #${matchId}...`);
          const tx = await this.wagerArena.executeBattle(matchId);
          await tx.wait();
          this.log(`✅ Battle complete for match #${matchId}`);
          break;
        }

        case "join_tournament": {
          const tId = BigInt(decision.tournamentId ?? 1);
          const tour = await this.tournamentArena.getTournament(tId);
          const entryFee: bigint = tour[0];
          if (entryFee > 0n) {
            await this.ensureSeasApproval(addrs.TournamentArena, entryFee);
          }
          this.log(`🏆 Joining tournament #${tId} (fee: ${ethers.formatEther(entryFee)} SEAS)...`);
          await (await this.tournamentArena.joinTournament(tId)).wait();
          this.log(`✅ Joined tournament #${tId}`);
          break;
        }

        case "place_bet": {
          const predId   = BigInt(decision.predictionId ?? 1);
          const side     = decision.betOnAgent1 !== false; // default bet on agent1
          let betAmt = ethers.parseEther(String(decision.betAmount ?? 5));
          if (betAmt < ethers.parseEther("1")) betAmt = ethers.parseEther("1");
          if (betAmt > ethers.parseEther("500")) betAmt = ethers.parseEther("500");

          await this.ensureSeasApproval(addrs.PredictionMarket, betAmt);
          this.log(`🔮 Placing bet on prediction #${predId} — ${side ? "Agent1" : "Agent2"} for ${ethers.formatEther(betAmt)} SEAS...`);
          await (await this.predictionMarket.placeBet(predId, side, betAmt)).wait();
          this.log(`✅ Bet placed on prediction #${predId}`);
          break;
        }

        case "claim_winnings": {
          const predId = BigInt(decision.predictionId ?? 1);
          this.log(`💰 Claiming winnings from prediction #${predId}...`);
          await (await this.predictionMarket.claimWinnings(predId)).wait();
          this.log(`✅ Winnings claimed from prediction #${predId}`);
          break;
        }

        case "deposit_bankroll": {
          let amount = ethers.parseEther(String(decision.amount ?? 100));
          if (amount < ethers.parseEther("1")) amount = ethers.parseEther("1");
          await this.ensureSeasApproval(addrs.AgentController, amount);
          this.log(`💼 Depositing ${ethers.formatEther(amount)} SEAS to bankroll...`);
          await (await this.agentController.depositBankroll(amount)).wait();
          this.log(`✅ Bankroll topped up by ${ethers.formatEther(amount)} SEAS`);
          break;
        }

        case "cancel_match": {
          const matchId = BigInt(decision.matchId ?? 0);
          this.log(`❌ Cancelling match #${matchId}...`);
          await (await this.wagerArena.cancelMatch(matchId)).wait();
          this.log(`✅ Match #${matchId} cancelled, wager refunded`);
          this.pendingMatchIds = this.pendingMatchIds.filter(id => id !== matchId);
          break;
        }

        case "taunt": {
          const rawTarget = (decision as any).target || ethers.ZeroAddress;
          // Normalize to checksummed address so ethers.js doesn't try ENS resolution
          let target: string;
          try { target = ethers.getAddress(rawTarget); } catch { target = ethers.ZeroAddress; }
          const message = ((decision as any).message || "").slice(0, 140).trim();
          if (!message) { this.log("ℹ️  Empty taunt — skipping"); break; }
          const targetLabel = target === ethers.ZeroAddress ? "everyone" : target.slice(0, 10);
          this.log(`😤 Taunting ${targetLabel}... "${message}"`);
          try {
            const tx = await this.wagerArena.taunt(target, message);
            await tx.wait();
            this.log(`✅ Taunt fired on-chain`);
          } catch (te: any) {
            if (te?.message?.includes("cooldown")) {
              this.log("ℹ️  Taunt on cooldown — skipping");
            } else {
              this.warn(`Taunt failed: ${te?.message?.slice(0, 80)}`);
            }
          }
          break;
        }

        case "idle": {
          this.log(`💤 Idle — ${decision.reasoning}`);
          break;
        }
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      // Suppress expected race conditions — multiple agents spotting the same open match
      if (msg.includes("Already accepted") || msg.includes("Already completed")) {
        this.log(`ℹ️  Match already taken by another agent`);
      } else {
        this.warn(`Transaction failed: ${msg.slice(0, 120)}`);
      }
    }
  }

  async ensureSeasApproval(spender: string, amount: bigint): Promise<void> {
    const allowance = await this.seasToken.allowance(this.wallet.address, spender);
    if (allowance < amount) {
      this.log("  Approving SEAS...");
      // Approve large amount to avoid repeated approvals
      const tx = await this.seasToken.approve(spender, ethers.MaxUint256);
      await tx.wait();
    }
  }

  // ─── Check and execute pending matches ───

  async checkPendingMatches(): Promise<void> {
    const stillPending: bigint[] = [];
    for (const matchId of this.pendingMatchIds) {
      try {
        const details = await this.wagerArena.getMatchDetails(matchId);
        if (details[3] && !details[4]) {
          // Accepted but not completed — check prediction window
          const key = matchId.toString();
          if (!this.acceptedAtMs.has(key)) {
            // First time we see this match as accepted — record now
            this.acceptedAtMs.set(key, Date.now());
            stillPending.push(matchId);
            this.log(`⏳ Match #${matchId} accepted by opponent — prediction window open for ${BATTLE_WINDOW_MS / 1000}s`);
            continue;
          }
          const elapsed = Date.now() - this.acceptedAtMs.get(key)!;
          if (elapsed < BATTLE_WINDOW_MS) {
            const remaining = Math.ceil((BATTLE_WINDOW_MS - elapsed) / 1000);
            this.log(`⏳ Match #${matchId} — ${remaining}s until battle`);
            stillPending.push(matchId);
            continue;
          }
          this.log(`⚔️  Executing pending battle for match #${matchId}...`);
          const tx = await this.wagerArena.executeBattle(matchId);
          await tx.wait();
          this.acceptedAtMs.delete(key);
          this.log(`✅ Match #${matchId} resolved!`);
        } else if (!details[3] && !details[4]) {
          stillPending.push(matchId); // Still waiting for opponent
        }
        // Completed or cancelled — drop from list
      } catch {
        stillPending.push(matchId);
      }
    }
    this.pendingMatchIds = stillPending;
  }

  // ─── Main decision loop ───

  // On startup, pick up any accepted-but-not-completed matches so they get executed
  async recoverPendingMatches(): Promise<void> {
    try {
      const total = Number(await this.wagerArena.matchCounter());
      const scanFrom = Math.max(1, total - 30);
      for (let i = scanFrom; i <= total; i++) {
        const d = await this.wagerArena.getMatchDetails(i);
        const [agent1, agent2, , isAccepted, isCompleted] = d;
        if (isAccepted && !isCompleted) {
          const myAddr = this.wallet.address.toLowerCase();
          if (agent1.toLowerCase() === myAddr || agent2.toLowerCase() === myAddr) {
            const key = i.toString();
            if (!this.acceptedAtMs.has(key)) {
              this.pendingMatchIds.push(BigInt(i));
              // Give full window from now so prediction market stays open
              this.acceptedAtMs.set(key, Date.now());
              this.log(`🔄 Recovered orphaned match #${i} — battle in ${BATTLE_WINDOW_MS / 1000}s`);
            }
          }
        }
      }
    } catch { /* non-critical */ }
  }

  async loop(): Promise<void> {
    this.isRunning = true;
    this.log(`Starting decision loop (${DECISION_INTERVAL_MS / 1000}s interval)`);
    await this.recoverPendingMatches();

    while (this.isRunning) {
      try {
        // 1. Read state (retry on RPC rate-limit)
        const [gameState, agentState] = await Promise.all([
          withRetry(() => this.getGameState(), "getGameState"),
          withRetry(() => this.getAgentState(), "getAgentState"),
        ]);

        if (!gameState) {
          this.warn("No game account found. Create account first.");
          await sleep(DECISION_INTERVAL_MS);
          continue;
        }

        if (!agentState || !agentState.isRegistered) {
          this.warn("Agent deactivated (bankroll < 100 SEAS). Auto re-registering with 500 SEAS...");
          try {
            const acAddr  = loadAddresses().AgentController;
            const seasAmt = ethers.parseEther("500");
            await this.ensureSeasApproval(acAddr, seasAmt);
            await (await this.agentController.registerAgent(this.config.type, seasAmt, this.config.alias)).wait();
            this.log("✅ Re-registered successfully");
          } catch (regErr: any) {
            this.warn(`Re-registration failed: ${regErr?.message?.slice(0, 80)}`);
          }
          await sleep(DECISION_INTERVAL_MS);
          continue;
        }

        // 2. Check pending matches first
        await this.checkPendingMatches();

        // 3. Get context
        const [openMatches, leaderboard, recentTaunts] = await Promise.all([
          this.getOpenMatches(),
          this.getLeaderboard(),
          this.fetchRecentTaunts(),
        ]);

        // Fetch opponent profiles for open match creators + top leaderboard entries
        this.opponentProfiles.clear();
        const toProfile = [
          ...openMatches.slice(0, 3).map(m => m.agent1),
          ...leaderboard.slice(0, 5).map(e => e.address),
        ].filter((a, i, arr) => a && arr.indexOf(a) === i);
        for (const addr of toProfile) {
          const p = await this.fetchOpponentProfile(addr);
          if (p) this.opponentProfiles.set(addr.toLowerCase(), p);
        }
        this.cycleCount++;

        // 4. Status line
        this.log(
          `HP: ${gameState.hp}/${gameState.maxHp} | ` +
          `ELO: ${agentState.eloRating} | ` +
          `${agentState.wins}W/${agentState.losses}L | ` +
          `Bankroll: ${ethers.formatEther(agentState.bankroll).slice(0, 8)} SEAS | ` +
          `Open matches: ${openMatches.length}`
        );

        // 5. Ask Groq for decision
        const decision = await this.askGroq(gameState, agentState, openMatches, leaderboard, this.opponentProfiles, recentTaunts);

        // 6. Sanity overrides — prevent common Groq hallucinations
        if (decision.action === "claim_gpm" && gameState.claimableGold === 0n) {
          this.log("⚡ Override: no GPM to claim → using fallback");
          const corrected = this.fallbackDecision(gameState, agentState, openMatches);
          await this.executeDecision(corrected, agentState);
        } else if (decision.action === "hire_crew" && !gameState.isAtPort) {
          this.log("⚡ Override: not at port for hire_crew → using fallback");
          const corrected = this.fallbackDecision(gameState, agentState, openMatches);
          await this.executeDecision(corrected, agentState);
        } else if (decision.action === "taunt" && !(decision as any).message?.trim()) {
          this.log("⚡ Override: empty taunt → idle");
          await this.executeDecision({ action: "idle", reasoning: "empty taunt skipped" }, agentState);
        } else {
          await this.executeDecision(decision, agentState);
        }

      } catch (e: any) {
        this.warn(`Loop error: ${e?.message?.slice(0, 100)}`);
      }

      await sleep(DECISION_INTERVAL_MS);
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// Retry a promise-returning fn up to 3 times with 2s backoff on RPC rate-limit errors
async function withRetry<T>(fn: () => Promise<T>, label = ""): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("25/second") || msg.includes("rate limit") || msg.includes("429")) {
        if (attempt < 2) {
          await sleep(2500 + attempt * 1500);
          continue;
        }
      }
      throw e;
    }
  }
  throw new Error(`${label}: max retries exceeded`);
}

function loadAddresses(): Record<string, string> {
  // Try environment variables first
  const fromEnv: Record<string, string> = {
    MantleArmada:    process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS    || "",
    ArmadaToken:     process.env.NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS     || "",
    SEASToken:       process.env.NEXT_PUBLIC_SEAS_TOKEN_ADDRESS        || "",
    AgentController: process.env.NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS || "",
    WagerArena:      process.env.NEXT_PUBLIC_WAGER_ARENA_ADDRESS       || "",
    TournamentArena: process.env.NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS  || "",
    PredictionMarket:process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "",
  };

  // Fall back to deployed JSON if env vars missing
  if (!fromEnv.MantleArmada) {
    const chainId = NETWORK === "mainnet" ? "41454" : "10143";
    const jsonPath = path.join(__dirname, `../deployed-addresses-monad-${chainId}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      return { ...fromEnv, ...data.addresses };
    }
  }

  return fromEnv;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🏴‍☠️  Seven Seas Protocol — AI Agent Fleet");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Network : ${NETWORK} (${RPC_URL})`);
  console.log(`  Model   : llama-3.3-70b-versatile (Groq)`);
  console.log(`  Interval: ${DECISION_INTERVAL_MS / 1000}s`);
  console.log("═══════════════════════════════════════════════════\n");

  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY not set in .env.local");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Test connection
  try {
    const block = await provider.getBlockNumber();
    console.log(`✅ Connected to Monad (block #${block})\n`);
  } catch (e) {
    console.error(`❌ Cannot connect to RPC: ${RPC_URL}`);
    process.exit(1);
  }

  // Load addresses
  const addrs = loadAddresses();
  if (!addrs.MantleArmada) {
    console.error("❌ Contract addresses not found. Run deploy script first:");
    console.error("   pnpm deploy:monad-testnet");
    process.exit(1);
  }
  console.log(`✅ Contracts loaded: ${addrs.MantleArmada.slice(0, 10)}...\n`);

  // Initialize agents
  const agents: NavalAgent[] = [];

  for (let i = 0; i < 5; i++) {
    const pk = process.env[`AGENT_PRIVATE_KEY_${i}`];
    if (!pk || !pk.trim()) {
      console.warn(`⚠️  AGENT_PRIVATE_KEY_${i} not set — skipping ${AGENT_CONFIGS[i].alias}`);
      continue;
    }
    const agent = new NavalAgent(AGENT_CONFIGS[i], pk.trim(), provider);
    agents.push(agent);
    console.log(`✅ ${AGENT_CONFIGS[i].emoji} ${AGENT_CONFIGS[i].alias} ready`);
  }

  if (agents.length === 0) {
    console.error("\n❌ No agent private keys configured. Set AGENT_PRIVATE_KEY_0..4 in .env.local");
    process.exit(1);
  }

  console.log(`\n🚀 Starting ${agents.length} agents...\n`);

  // Stagger agent starts by 6 seconds each to avoid nonce conflicts
  const loops = agents.map((agent, i) =>
    sleep(i * 8000).then(() => agent.loop())
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n⚓ Shutting down agents...");
    agents.forEach(a => a.stop());
    setTimeout(() => process.exit(0), 2000);
  });

  await Promise.all(loops);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
