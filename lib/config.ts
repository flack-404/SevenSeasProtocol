// Contract addresses configuration for Monad Network

export const CONTRACT_ADDRESSES = {
  // Monad Testnet (chainId: 10143) — filled after deploy
  testnet: {
    MantleArmada: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '',
    ArmadaToken: process.env.NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS || '',
    ArmadaGuild: process.env.NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS || '',
    BattlePass: process.env.NEXT_PUBLIC_BATTLE_PASS_ADDRESS || '',
    ShipNFT: process.env.NEXT_PUBLIC_SHIP_NFT_ADDRESS || '',
    SEASToken: process.env.NEXT_PUBLIC_SEAS_TOKEN_ADDRESS || '',
    AgentController: process.env.NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS || '',
    WagerArena: process.env.NEXT_PUBLIC_WAGER_ARENA_ADDRESS || '',
    TournamentArena: process.env.NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS || '',
    PredictionMarket: process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '',
  },
  // Monad Mainnet (chainId: 41454) — reads same env vars as testnet
  mainnet: {
    MantleArmada: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '',
    ArmadaToken: process.env.NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS || '',
    ArmadaGuild: process.env.NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS || '',
    BattlePass: process.env.NEXT_PUBLIC_BATTLE_PASS_ADDRESS || '',
    ShipNFT: process.env.NEXT_PUBLIC_SHIP_NFT_ADDRESS || '',
    SEASToken: process.env.NEXT_PUBLIC_SEAS_TOKEN_ADDRESS || '',
    AgentController: process.env.NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS || '',
    WagerArena: process.env.NEXT_PUBLIC_WAGER_ARENA_ADDRESS || '',
    TournamentArena: process.env.NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS || '',
    PredictionMarket: process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '',
  },
} as const;

export function getContractAddresses() {
  const network = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet';
  return CONTRACT_ADDRESSES[network];
}

// Network configuration
export const NETWORK_CONFIG = {
  testnet: {
    chainId: 10143,
    name: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    explorerUrl: 'https://testnet.monadexplorer.com',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
  },
  mainnet: {
    chainId: 143,
    name: 'Monad',
    rpcUrl: 'https://rpc.monad.xyz',
    explorerUrl: 'https://monadexplorer.com',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
  },
} as const;

export function getNetworkConfig() {
  const network = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet';
  return NETWORK_CONFIG[network];
}

// Game constants (optimized for Monad's ~1s block time)
export const GAME_CONSTANTS = {
  GPM_CYCLE_SECONDS: 1, // 1 second on Monad
  BASE_REPAIR_TIME: 5 * 3600,
  PORT_REPAIR_TIME: 1 * 3600,
  PORTS: [25, 55, 89] as const,
  MAX_LOCATION: 100,
  MIN_LOCATION: 0,
  DIAMOND_PACKAGES: [
    { mon: 10, diamonds: 1 },
    { mon: 45, diamonds: 5 },
    { mon: 90, diamonds: 10 },
  ] as const,
  GUILD_CREATION_COST: 500,
  BATTLE_PASS_PREMIUM_COST: 100,
  SHIP_NFT_MIN_POWER: 10,
  // Agent arena constants
  MIN_WAGER: 10,    // 10 SEAS
  MAX_WAGER: 1000,  // 1000 SEAS
  HOUSE_FEE_BPS: 500, // 5%
  MATCH_EXPIRY: 3600, // 1 hour
} as const;

// Reward constants
export const REWARDS = {
  ARMADA_PER_BATTLE_WIN: '1',
  ARMADA_PER_CHECKIN: '1',
  XP_PER_BATTLE_WIN: 10,
  XP_PER_CHECKIN: 5,
  XP_PER_GPM_CLAIM: 1,
  XP_PER_UPGRADE: 3,
} as const;

// Agent archetypes
export const AGENT_TYPES = {
  0: { name: 'AggressiveRaider', alias: 'Blackbeard', emoji: '🏴‍☠️', description: 'High-risk, large wagers, attacks constantly' },
  1: { name: 'DefensiveTrader', alias: 'Ironclad', emoji: '⚓', description: 'Conservative, only fights when heavily favored' },
  2: { name: 'AdaptiveLearner', alias: 'TheGhost', emoji: '👻', description: 'Kelly Criterion bankroll, tracks opponent history' },
  3: { name: 'GuildCoordinator', alias: 'Admiralty', emoji: '🎖️', description: 'Guild-focused, coordinates fleet operations' },
  4: { name: 'BalancedAdmiral', alias: 'Tempest', emoji: '🌊', description: 'Balanced approach, adapts to meta' },
} as const;

// nad.fun Monad Mainnet addresses
export const NAD_FUN_ADDRESSES = {
  BONDING_CURVE_ROUTER: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
  LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  DEX_ROUTER: '0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137',
  WMON: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
} as const;

// Contract ABIs
export const CONTRACT_ABIS = {
  MantleArmada: [
    'function createAccount(string boatName, bool isPirate, uint256 startLocation)',
    'function accounts(address) view returns (string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd)',
    'function checkIn()',
    'function claimGPM()',
    'function buyUpgrade(uint256 id)',
    'function attack(address defender)',
    'function batchAttack(address[] defenders)',
    'function travel(uint256 toLocation, bool fast) payable',
    'function repairShip(uint8 repairType)',
    'function completeRepair()',
    'function hireCrew()',
    'function getClaimableGold(address player) view returns (uint256)',
    'function getUpgradeCost(uint256 id, address player) view returns (uint256)',
    'function getRanking(uint256 n) view returns (address[], uint256[])',
    'function getShipsAt(uint256 location) view returns (address[], string[], uint256[])',
    'function getPlayerBattlePower(address player) view returns (uint256)',
    'function getShipStats(address player) view returns (uint256 attack, uint256 defense, uint256 hp, uint256 maxHp, uint256 gold, uint256 crew, uint256 location, bool isPirate)',
    'function executeDuel(address agent1, address agent2) external returns (address winner, uint256 rounds)',
    'function setArenaContract(address arena)',
  ],
  ArmadaToken: [
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
  ],
  SEASToken: [
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function totalSupply() view returns (uint256)',
    'function claimTestTokens()',
  ],
  AgentController: [
    'function registerAgent(uint8 agentType, uint256 initialBankroll, string agentAlias) external',
    'function depositBankroll(uint256 amount) external',
    'function withdrawProfits(uint256 amount) external',
    'function getAgentDecision(address agentAddress) external view returns (string memory action, uint256 value)',
    'function updateAfterMatch(address agent, bool won, uint256 wagerAmount) external',
    'function getLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory)',
    'function getAgentStats(address agentAddress) external view returns (uint256 bankroll, uint256 wins, uint256 losses, uint256 eloRating, uint256 totalWagers)',
    'function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)',
    'event AgentRegistered(address indexed agentAddress, uint8 agentType)',
    'event AgentDecision(address indexed agent, string action, uint256 value)',
  ],
  WagerArena: [
    'function createMatch(uint256 wagerAmount) external returns (uint256 matchId)',
    'function acceptMatch(uint256 matchId) external',
    'function executeBattle(uint256 matchId) external',
    'function cancelMatch(uint256 matchId) external',
    'function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)',
    'function getRecentMatches(uint256 count) external view returns (uint256[] memory)',
    'function getOpenMatches() external view returns (uint256[] memory)',
    'function matchCounter() view returns (uint256)',
    'event MatchCreated(uint256 indexed matchId, address indexed challenger, uint256 wagerAmount)',
    'event MatchAccepted(uint256 indexed matchId, address indexed opponent)',
    'event MatchCompleted(uint256 indexed matchId, address indexed winner, uint256 payout)',
    'function taunt(address target, string message) external',
    'event AgentTaunt(address indexed from, address indexed target, string message, uint256 timestamp)',
  ],
  TournamentArena: [
    'function createTournament(uint256 entryFee, uint8 maxParticipants) external returns (uint256)',
    'function joinTournament(uint256 tournamentId) external',
    'function advanceRound(uint256 tournamentId) external',
    'function getTournament(uint256 tournamentId) external view returns (uint256 entryFee, uint8 maxParticipants, uint8 currentParticipants, uint8 currentRound, bool isActive, address champion)',
    'function activeTournamentCount() view returns (uint256)',
    'event TournamentCreated(uint256 indexed tournamentId, uint256 entryFee, uint8 maxParticipants)',
    'event TournamentComplete(uint256 indexed tournamentId, address indexed champion, uint256 prize)',
  ],
  PredictionMarket: [
    'function placeBet(uint256 predictionId, bool betOnAgent1, uint256 amount) external',
    'function claimWinnings(uint256 predictionId) external',
    'function getBet(uint256 predictionId, address bettor) external view returns (uint256 amount, bool betOnAgent1, bool claimed)',
    'function getPrediction(uint256 predictionId) external view returns (uint256 matchId, address agent1, address agent2, uint256 agent1Pool, uint256 agent2Pool, bool isOpen, bool isSettled, address winner)',
    'function getPredictionByMatch(uint256 matchId) external view returns (uint256)',
    'function predictionCounter() view returns (uint256)',
    'event BetPlaced(uint256 indexed predictionId, address indexed bettor, bool betOnAgent1, uint256 amount)',
    'event WinningsClaimed(uint256 indexed predictionId, address indexed claimer, uint256 amount)',
  ],
  ArmadaGuild: [
    'function createGuild(string name, string logo)',
    'function joinGuild(uint256 guildId)',
    'function leaveGuild()',
    'function claimGuildDividends()',
    'function getGuild(uint256 guildId) view returns (tuple(string name, address leader, uint256 createdAt, uint256 memberCount, uint256 treasury, bool isActive, uint256 totalBattlesWon, string logo, uint256 level))',
    'function getGuildMembers(uint256 guildId) view returns (tuple(address memberAddress, uint256 joinedAt, uint256 contribution, bool isOfficer, uint256 lastDividendClaim)[])',
    'function getPlayerGuild(address player) view returns (uint256)',
    'function getClaimableDividends(address member) view returns (uint256)',
    'function getTopGuilds(uint256 count) view returns (uint256[], uint256[])',
    'function nextGuildId() view returns (uint256)',
  ],
  BattlePass: [
    'function createPass()',
    'function upgradeToPremium()',
    'function claimLevelReward(uint256 level)',
    'function getPlayerPass(address player) view returns (tuple(uint256 season, uint256 level, uint256 experience, bool isPremium, uint256 lastRewardClaimed, uint256 createdAt))',
    'function hasActivePass(address player) view returns (bool)',
  ],
  ShipNFT: [
    'function mintShipNFT(address owner, uint256 battlePower) returns (uint256)',
    'function claimYield(uint256 tokenId)',
    'function stakeShip(uint256 tokenId)',
    'function unstakeShip(uint256 tokenId)',
    'function getShipData(uint256 tokenId) view returns (tuple(uint256 tokenId, uint256 battlePower, uint256 yieldRate, uint256 lastYieldClaim, uint256 totalYieldGenerated, uint256 mintedAt, string shipClass, bool isStaked))',
    'function getShipsByOwner(address owner) view returns (uint256[])',
    'function balanceOf(address owner) view returns (uint256)',
  ],
} as const;

export type NetworkType = 'testnet' | 'mainnet';
export type ContractName = keyof typeof CONTRACT_ADDRESSES.testnet;
