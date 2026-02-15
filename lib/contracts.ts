import { ethers } from 'ethers';
import type {
  SeasOfLinkardia,
  SeasOfLinkardiaInterface,
  AccountCreatedEvent,
  CheckInEvent,
  ShipAttackedEvent,
  TravelStartedEvent,
  UpgradeAddedEvent,
  UpgradePurchasedEvent,
} from '../types/artifacts/contracts/SeasOfLinkardia';
import { SeasOfLinkardia__factory } from '../types/factories/artifacts/contracts/SeasOfLinkardia__factory';

// ===== CONTRACT TYPES =====

// Account structure matching the contract
export interface PlayerAccount {
  boatName: string;
  isPirate: boolean;
  gold: bigint;
  diamonds: bigint;
  hp: bigint;
  speed: bigint;
  attack: bigint;
  defense: bigint;
  crew: bigint;
  maxCrew: bigint;
  location: bigint;
  gpm: bigint;
  lastCheckIn: bigint;
  checkInStreak: bigint;
  lastWrecked: bigint;
  travelEnd: bigint;
  repairEnd: bigint;
}

// Upgrade structure matching the contract
export interface GameUpgrade {
  name: string;
  cost: bigint;
  gpmBonus: bigint;
  hpBonus: bigint;
  speedBonus: bigint;
  attackBonus: bigint;
  defenseBonus: bigint;
  maxCrewBonus: bigint;
}

// Ship data for map display
export interface ShipInfo {
  address: string;
  name: string;
  level: bigint;
}

// Ranking entry
export interface RankingEntry {
  address: string;
  level: bigint;
}

// ===== EVENT TYPES =====

export type ContractEvents = {
  AccountCreated: AccountCreatedEvent.OutputObject;
  CheckIn: CheckInEvent.OutputObject;
  ShipAttacked: ShipAttackedEvent.OutputObject;
  TravelStarted: TravelStartedEvent.OutputObject;
  UpgradeAdded: UpgradeAddedEvent.OutputObject;
  UpgradePurchased: UpgradePurchasedEvent.OutputObject;
};

// ===== CONSTANTS =====

export const GAME_CONSTANTS = {
  BASE_REPAIR_TIME: 5 * 3600, // 5 hours in seconds
  PORT_REPAIR_TIME: 1 * 3600, // 1 hour in seconds
  PORTS: [25, 55, 89] as const,
  MAX_LOCATION: 100,
  MIN_LOCATION: 0,
  DIAMOND_PACKAGES: [
    { xtz: 10, diamonds: 1 },
    { xtz: 45, diamonds: 5 },
    { xtz: 90, diamonds: 10 },
  ] as const,
} as const;

// ===== CONTRACT UTILITIES =====

/**
 * Create a contract instance with a signer for write operations
 */
export function createSeasOfLinkardiaContract(
  contractAddress: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): SeasOfLinkardia {
  return SeasOfLinkardia__factory.connect(contractAddress, signerOrProvider);
}

/**
 * Create a read-only contract instance
 */
export function createReadOnlySeasOfLinkardiaContract(
  contractAddress: string,
  provider: ethers.Provider
): SeasOfLinkardia {
  return SeasOfLinkardia__factory.connect(contractAddress, provider);
}

/**
 * Deploy a new SeasOfLinkardia contract (admin only)
 */
export async function deploySeasOfLinkardiaContract(
  signer: ethers.Signer
): Promise<SeasOfLinkardia> {
  const factory = new SeasOfLinkardia__factory(signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

// ===== HELPER FUNCTIONS =====

/**
 * Format account data from contract response
 */
export function formatPlayerAccount(accountData: any): PlayerAccount {
  return {
    boatName: accountData.boatName,
    isPirate: accountData.isPirate,
    gold: accountData.gold,
    diamonds: accountData.diamonds,
    hp: accountData.hp,
    speed: accountData.speed,
    attack: accountData.attack,
    defense: accountData.defense,
    crew: accountData.crew,
    maxCrew: accountData.maxCrew,
    location: accountData.location,
    gpm: accountData.gpm,
    lastCheckIn: accountData.lastCheckIn,
    checkInStreak: accountData.checkInStreak,
    lastWrecked: accountData.lastWrecked,
    travelEnd: accountData.travelEnd,
    repairEnd: accountData.repairEnd,
  };
}

/**
 * Format upgrade data from contract response
 */
export function formatGameUpgrade(upgradeData: any): GameUpgrade {
  return {
    name: upgradeData.name,
    cost: upgradeData.cost,
    gpmBonus: upgradeData.gpmBonus,
    hpBonus: upgradeData.hpBonus,
    speedBonus: upgradeData.speedBonus,
    attackBonus: upgradeData.attackBonus,
    defenseBonus: upgradeData.defenseBonus,
    maxCrewBonus: upgradeData.maxCrewBonus,
  };
}

/**
 * Calculate ship level (speed + attack + defense)
 */
export function calculateShipLevel(account: PlayerAccount): number {
  return Number(account.speed + account.attack + account.defense);
}

/**
 * Check if ship is wrecked
 */
export function isShipWrecked(account: PlayerAccount): boolean {
  return account.hp === 0n;
}

/**
 * Check if ship is currently traveling
 */
export function isShipTraveling(account: PlayerAccount): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return account.travelEnd > now;
}

/**
 * Check if ship is at a port
 */
export function isAtPort(account: PlayerAccount): boolean {
  const location = Number(account.location);
  return GAME_CONSTANTS.PORTS.includes(location as any);
}

/**
 * Calculate travel time based on distance and speed
 */
export function calculateTravelTime(
  fromLocation: number,
  toLocation: number,
  speed: number
): number {
  const distance = Math.abs(toLocation - fromLocation);
  const baseTime = distance * 3600; // 1 hour per unit distance
  const discount = speed * 5 * 60 * distance; // 5 minutes discount per speed per distance
  return Math.max(0, baseTime - discount);
}

/**
 * Calculate check-in reward
 */
export function calculateCheckInReward(crew: number, streak: number): number {
  return crew * 25 + 5 * streak;
}

/**
 * Get diamond package for XTZ amount
 */
export function getDiamondPackage(xtzAmount: number) {
  return GAME_CONSTANTS.DIAMOND_PACKAGES.find(pkg => pkg.xtz === xtzAmount);
}

/**
 * Format XTZ amount to ethers format
 */
export function formatXTZ(amount: number): string {
  return ethers.parseEther(amount.toString()).toString();
}

/**
 * Parse XTZ amount from wei
 */
export function parseXTZ(weiAmount: bigint): number {
  return Number(ethers.formatEther(weiAmount));
}

// ===== ERROR TYPES =====

export const CONTRACT_ERRORS = {
  BOAT_NAME_INVALID_LENGTH: 'Boat name invalid length',
  LOCATION_INVALID: 'Location must be 0-100',
  ALREADY_HAS_ACCOUNT: 'Already has account',
  SHIP_WRECKED: 'Ship wrecked',
  ALREADY_CHECKED_IN_TODAY: 'Already checked in today',
  UPGRADE_NOT_EXIST: 'Upgrade not exist',
  NOT_ENOUGH_GOLD: 'Not enough gold',
  SAME_AFFILIATION: 'Same affiliation',
  MUST_BE_SAME_LOCATION: 'Must be same location',
  IN_TRAVEL: 'In travel',
  ONE_SHIP_IS_WRECKED: 'One ship is wrecked',
  SAME_LOCATION: 'Same location',
  LOCATION_INVALID_TRAVEL: 'Location invalid',
  ALREADY_TRAVELING: 'Already traveling',
  NOT_ENOUGH_DIAMONDS: 'Not enough diamonds',
  SHIP_NOT_WRECKED: 'Ship not wrecked',
  NOT_READY_FOR_BASIC_REPAIR: 'Not ready for basic repair',
  NOT_AT_PORT: 'Not at port',
  NEED_GOLD_OR_DIAMOND: 'Need gold or diamond',
  INVALID_DIAMOND_PACKAGE: 'Invalid diamond package',
} as const;

// ===== TYPE EXPORTS =====

export type {
  SeasOfLinkardia,
  SeasOfLinkardiaInterface,
} from '../types/artifacts/contracts/SeasOfLinkardia';

export { SeasOfLinkardia__factory }; 