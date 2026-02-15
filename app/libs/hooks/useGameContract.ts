"use client";

import { readContract, prepareContractCall, sendTransaction, prepareTransaction } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { useThirdweb } from "./useThirdweb";
import { useSeasOfLinkardiaContract } from "./useContract";

// Contract ABI for MantleArmada (updated for Mantle network)
// Maintains backward compatibility with old function names
const MANTLE_ARMADA_ABI = [
  "function accounts(address) view returns (string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd)",
  "function createAccount(string _boatName, bool _isPirate, uint256 _startLocation)",
  "function checkIn()",
  "function claimGPM()",
  "function getClaimableGold(address player) view returns (uint256)",
  "function getTimeUntilNextGPM(address player) view returns (uint256)",
  "function attack(address defender)",
  "function travel(uint256 toLocation, bool fast) payable",
  "function upgrades(uint256) view returns (string name, uint256 cost, uint256 gpmBonus, uint256 maxHpBonus, uint256 speedBonus, uint256 attackBonus, uint256 defenseBonus, uint256 maxCrewBonus)",
  "function buyUpgrade(uint256 id)",
  "function nextUpgradeId() view returns (uint256)",
  "function repairShip(uint8 repairType)",
  "function completeRepair()",
  "function getRepairOptions(address player) view returns (uint256[3] costs, uint256[3] waitTimes)",
  "function isRepairReady(address player) view returns (bool)",
  "function hireCrew()",
  "function getHireCrewCost(address player) view returns (uint256)",
  "function isPort(uint256 location) view returns (bool)",
  "function getShipsAt(uint256 loc) view returns (address[], string[], uint256[])",
  "function getRanking(uint256 n) view returns (address[], uint256[])",
  "function players(uint256) view returns (address)",
  // Referral System
  "function createAccountWithReferral(string _boatName, bool _isPirate, uint256 _startLocation, string _referralCode)",
  "function getPlayerReferralCode(address player) view returns (string)",
  "function getReferralStats(address player) view returns (string referralCode, address referrer, uint256 totalReferrals, uint256 referralRewards)",
  "function isValidReferralCode(string code) view returns (bool)"
] as const;

/**
 * Comprehensive hook for MantleArmada game interactions
 * Updated for Mantle network - maintains backward compatibility
 * NOTE: New features (Guild, BattlePass, ShipNFT) should use hooks from useContracts.ts
 */
export function useGameContract() {
  const contractData = useSeasOfLinkardiaContract(); // Points to MantleArmada now
  const { isConnected } = useThirdweb();
  const account = useActiveAccount();

  if (!contractData || !isConnected || !account) {
    return {
      contract: null,
      isReady: false,
    };
  }

  const { contract } = contractData;

  // Player Account Management
  const getPlayerAccount = async (address?: string) => {
    const playerAddress = address || account.address;
    return await readContract({
      contract,
      method: "function accounts(address) view returns (string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd)",
      params: [playerAddress],
    });
  };

  const createAccount = async (boatName: string, isPirate: boolean, startLocation: number) => {
    const transaction = prepareContractCall({
      contract,
      method: "function createAccount(string _boatName, bool _isPirate, uint256 _startLocation)",
      params: [boatName, isPirate, BigInt(startLocation)],
    });
    return await sendTransaction({ transaction, account });
  };

  const createAccountWithReferral = async (boatName: string, isPirate: boolean, startLocation: number, referralCode: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function createAccountWithReferral(string _boatName, bool _isPirate, uint256 _startLocation, string _referralCode)",
      params: [boatName, isPirate, BigInt(startLocation), referralCode],
    });
    return await sendTransaction({ transaction, account });
  };

  // Daily Check-in System
  const dailyCheckIn = async () => {
    const transaction = prepareContractCall({
      contract,
      method: "function checkIn()",
      params: [],
    });
    return await sendTransaction({ transaction, account });
  };

  // GPM System
  const claimGPM = async () => {
    const transaction = prepareContractCall({
      contract,
      method: "function claimGPM()",
      params: [],
    });
    return await sendTransaction({ transaction, account });
  };

  const getClaimableGold = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getClaimableGold(address player) view returns (uint256)",
      params: [address],
    });
  };

  const getTimeUntilNextGPM = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getTimeUntilNextGPM(address player) view returns (uint256)",
      params: [address],
    });
  };

  // Combat System
  const attackPlayer = async (defenderAddress: string) => {
    const transaction = prepareContractCall({
      contract,
      method: "function attack(address defender)",
      params: [defenderAddress],
    });
    return await sendTransaction({ transaction, account });
  };

  // Travel System
  const travelToLocation = async (toLocation: number, useFastTravel: boolean = false) => {
    const transaction = prepareContractCall({
      contract,
      method: "function travel(uint256 toLocation, bool fast) payable",
      params: [BigInt(toLocation), useFastTravel],
      value: BigInt(0), // MNT value if needed for fast travel
    });
    return await sendTransaction({ transaction, account });
  };

  // Ship Upgrades
  const getUpgrade = async (upgradeId: number) => {
    return await readContract({
      contract,
      method: "function upgrades(uint256) view returns (string name, uint256 cost, uint256 gpmBonus, uint256 maxHpBonus, uint256 speedBonus, uint256 attackBonus, uint256 defenseBonus, uint256 maxCrewBonus)",
      params: [BigInt(upgradeId)],
    });
  };

  const getUpgradeCost = async (upgradeId: number, playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getUpgradeCost(uint256 id, address player) view returns (uint256)",
      params: [BigInt(upgradeId), address],
    });
  };

  const getPurchaseCount = async (upgradeId: number, playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function purchaseCounts(address, uint256) view returns (uint256)",
      params: [address, BigInt(upgradeId)],
    });
  };

  const buyUpgrade = async (upgradeId: number) => {
    const transaction = prepareContractCall({
      contract,
      method: "function buyUpgrade(uint256 id)",
      params: [BigInt(upgradeId)],
    });
    return await sendTransaction({ transaction, account });
  };

  const getNextUpgradeId = async () => {
    return await readContract({
      contract,
      method: "function nextUpgradeId() view returns (uint256)",
      params: [],
    });
  };

  // Ship Repair System
  const repairShip = async (repairType: number) => {
    const transaction = prepareContractCall({
      contract,
      method: "function repairShip(uint8 repairType)",
      params: [repairType],
    });
    return await sendTransaction({ transaction, account });
  };

  const completeRepair = async () => {
    const transaction = prepareContractCall({
      contract,
      method: "function completeRepair()",
      params: [],
    });
    return await sendTransaction({ transaction, account });
  };

  const getRepairOptions = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getRepairOptions(address player) view returns (uint256[3] costs, uint256[3] waitTimes)",
      params: [address],
    });
  };

  const isRepairReady = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function isRepairReady(address player) view returns (bool)",
      params: [address],
    });
  };

  // Crew Management System
  const hireCrew = async () => {
    const transaction = prepareContractCall({
      contract,
      method: "function hireCrew()",
      params: [],
    });
    return await sendTransaction({ transaction, account });
  };

  const getHireCrewCost = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getHireCrewCost(address player) view returns (uint256)",
      params: [address],
    });
  };

  // Location Utilities
  const isPort = async (location: number) => {
    return await readContract({
      contract,
      method: "function isPort(uint256 location) view returns (bool)",
      params: [BigInt(location)],
    });
  };

  // Map and Location System
  const getShipsAtLocation = async (location: number) => {
    return await readContract({
      contract,
      method: "function getShipsAt(uint256 loc) view returns (address[], string[], uint256[])",
      params: [BigInt(location)],
    });
  };

  // Ranking System
  const getTopPlayers = async (count: number = 10) => {
    return await readContract({
      contract,
      method: "function getRanking(uint256 n) view returns (address[], uint256[])",
      params: [BigInt(count)],
    });
  };

  const getPlayer = async (index: number) => {
    return await readContract({
      contract,
      method: "function players(uint256) view returns (address)",
      params: [BigInt(index)],
    });
  };

  // Diamond Purchase System (via sending MNT to contract)
  const buyDiamonds = async (packageType: 'small' | 'medium' | 'large') => {
    const prices = {
      small: BigInt(10 * 1e18), // 10 MNT = 1 diamond
      medium: BigInt(45 * 1e18), // 45 MNT = 5 diamonds
      large: BigInt(90 * 1e18), // 90 MNT = 10 diamonds
    };

    // Send MNT directly to contract address to trigger receive function
    const transaction = prepareTransaction({
      to: contract.address,
      value: prices[packageType],
      chain: contract.chain,
      client: contract.client,
    });
    return await sendTransaction({ transaction, account });
  };

  // Game Constants
  const GAME_CONSTANTS = {
    LOCATIONS: {
      MIN: 0,
      MAX: 100,
      PORTS: [25, 55, 89], // Special port locations
    },
    REPAIR_TIMES: {
      BASE: 5 * 60 * 60, // 5 hours in seconds
      PORT: 1 * 60 * 60, // 1 hour in seconds
    },
    FACTIONS: {
      PIRATE: true,
      NAVY: false,
    },
    DIAMOND_PACKAGES: [
      { name: 'Small', cost: 10, diamonds: 1 },
      { name: 'Medium', cost: 45, diamonds: 5 },
      { name: 'Large', cost: 90, diamonds: 10 },
    ],
  };

  // Helper functions
  const isAtPort = (location: number) => {
    return GAME_CONSTANTS.LOCATIONS.PORTS.includes(location);
  };

  const calculateTravelTime = (fromLocation: number, toLocation: number, speed: number) => {
    const distance = Math.abs(toLocation - fromLocation);
    const baseTime = distance * 60 * 60; // 1 hour per location
    const speedReduction = speed * 5 * 60 * distance; // 5 minutes per speed point per distance
    return Math.max(0, baseTime - speedReduction);
  };

  const calculateDailyReward = (crew: number, streak: number) => {
    return crew * 25 + 5 * streak;
  };

  // Referral System
  const getPlayerReferralCode = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getPlayerReferralCode(address player) view returns (string)",
      params: [address],
    });
  };

  const getReferralStats = async (playerAddress?: string) => {
    const address = playerAddress || account.address;
    return await readContract({
      contract,
      method: "function getReferralStats(address player) view returns (string referralCode, address referrer, uint256 totalReferrals, uint256 referralRewards)",
      params: [address],
    });
  };

  const isValidReferralCode = async (code: string) => {
    return await readContract({
      contract,
      method: "function isValidReferralCode(string code) view returns (bool)",
      params: [code],
    });
  };

  return {
    ...contractData,
    isReady: true,
    playerAddress: account.address,

    // Account Management
    getPlayerAccount,
    createAccount,
    createAccountWithReferral,
    
    // Game Actions
    dailyCheckIn,
    claimGPM,
    getClaimableGold,
    getTimeUntilNextGPM,
    attackPlayer,
    travelToLocation,
    
    // Upgrades
    getUpgrade,
    getUpgradeCost,
    getPurchaseCount,
    buyUpgrade,
    getNextUpgradeId,
    
    // Ship Management
    repairShip,
    completeRepair,
    getRepairOptions,
    isRepairReady,
    
    // Crew Management
    hireCrew,
    getHireCrewCost,
    
    // World Interaction
    getShipsAtLocation,
    getTopPlayers,
    getPlayer,
    isPort,
    
    // Economy
    buyDiamonds,
    
    // Constants and Helpers
    GAME_CONSTANTS,
    isAtPort,
    calculateTravelTime,
    calculateDailyReward,

    // Referral System
    getPlayerReferralCode,
    getReferralStats,
    isValidReferralCode,
  };
} 