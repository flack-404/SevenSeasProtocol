"use client";

import { useEffect } from 'react';
import { useActiveAccount, useReadContract, useSendTransaction } from 'thirdweb/react';
import { getContract, prepareContractCall } from 'thirdweb';
import { client, getActiveChain } from '../providers/thirdweb-provider';
import { getContractAddresses, CONTRACT_ABIS } from '@/lib/config';

// Get all contract instances
export function useContractInstances() {
  const chain = getActiveChain();
  const addresses = getContractAddresses();

  const gameContract = getContract({
    client,
    chain,
    address: addresses.MantleArmada,
    abi: CONTRACT_ABIS.MantleArmada as any[],
  });

  const tokenContract = getContract({
    client,
    chain,
    address: addresses.ArmadaToken,
    abi: CONTRACT_ABIS.ArmadaToken as any[],
  });

  const guildContract = getContract({
    client,
    chain,
    address: addresses.ArmadaGuild,
    abi: CONTRACT_ABIS.ArmadaGuild as any[],
  });

  const battlePassContract = getContract({
    client,
    chain,
    address: addresses.BattlePass,
    abi: CONTRACT_ABIS.BattlePass as any[],
  });

  const shipNFTContract = getContract({
    client,
    chain,
    address: addresses.ShipNFT,
    abi: CONTRACT_ABIS.ShipNFT as any[],
  });

  return {
    gameContract,
    tokenContract,
    guildContract,
    battlePassContract,
    shipNFTContract,
  };
}

// Hook to get player account data
export function usePlayerAccount() {
  const account = useActiveAccount();
  const { gameContract } = useContractInstances();

  const { data: accountData, isLoading, refetch } = useReadContract({
    contract: gameContract,
    method: 'function accounts(address) view returns (tuple(string boatName, bool isPirate, uint256 gold, uint256 diamonds, uint256 hp, uint256 maxHp, uint256 speed, uint256 attack, uint256 defense, uint256 crew, uint256 maxCrew, uint256 location, uint256 gpm, uint256 lastCheckIn, uint256 checkInStreak, uint256 lastWrecked, uint256 travelEnd, uint256 lastGPMClaim, uint256 repairEnd))',
    params: account?.address ? [account.address] : undefined,
  });

  return { 
    accountData, 
    isLoading, 
    refetch,
    hasAccount: accountData ? accountData[2] > 0n || accountData[9] > 0n : false // gold > 0 or crew > 0
  };
}

// Hook to get ARMADA token balance
export function useTokenBalance() {
  const account = useActiveAccount();
  const { tokenContract } = useContractInstances();

  const { data: balance, isLoading, refetch } = useReadContract({
    contract: tokenContract,
    method: 'function balanceOf(address) view returns (uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  return { balance: balance || 0n, isLoading, refetch };
}

// Hook to get player's guild
export function usePlayerGuild() {
  const account = useActiveAccount();
  const { guildContract } = useContractInstances();

  const { data: guildId, isLoading: loadingGuildId, refetch: refetchGuildId } = useReadContract({
    contract: guildContract,
    method: 'function getPlayerGuild(address) view returns (uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  // Use public mapping directly instead of getGuild
  const { data: guildData, isLoading: loadingGuildData, refetch: refetchGuildData } = useReadContract({
    contract: guildContract,
    method: 'function guilds(uint256) view returns (string name, address leader, uint256 createdAt, uint256 memberCount, uint256 treasury, bool isActive, uint256 totalBattlesWon, string logo, uint256 level)',
    params: guildId && guildId > 0n ? [guildId] : undefined,
  });

  return {
    guildId: guildId || 0n,
    guildData,
    isLoading: loadingGuildId || loadingGuildData,
    inGuild: guildId ? guildId > 0n : false,
    refetch: () => {
      refetchGuildId();
      refetchGuildData();
    },
  };
}

// Hook to get player's battle pass
export function usePlayerBattlePass() {
  const account = useActiveAccount();
  const { battlePassContract } = useContractInstances();

  // Try using the public mapping directly instead of getPlayerPass
  const { data: passData, isLoading, refetch: refetchPass } = useReadContract({
    contract: battlePassContract,
    method: 'function playerPasses(address) view returns (uint256 season, uint256 level, uint256 experience, bool isPremium, uint256 lastRewardClaimed, uint256 createdAt)',
    params: account?.address ? [account.address] : undefined,
  });

  // Use simpler hasActivePass function as fallback
  const { data: hasPass, refetch: refetchHasPass } = useReadContract({
    contract: battlePassContract,
    method: 'function hasActivePass(address) view returns (bool)',
    params: account?.address ? [account.address] : undefined,
  });

  const { data: seasonInfo } = useReadContract({
    contract: battlePassContract,
    method: 'function getSeasonInfo() view returns (uint256, uint256, uint256, uint256)',
    params: [],
  });

  // Debug logging
  useEffect(() => {
    if (account?.address) {
      console.log('Battle Pass Hook Debug:', {
        address: account.address,
        passData: passData,
        passDataType: typeof passData,
        hasPass: hasPass,
        hasPassFromData: passData ? passData[0] > 0n : false,
      });
    }
  }, [account?.address, passData, hasPass]);

  return {
    passData,
    seasonInfo,
    isLoading,
    refetch: () => {
      refetchPass();
      refetchHasPass();
    },
    hasActivePass: hasPass === true || (passData ? passData[0] > 0n : false),
  };
}

// Hook to get player's ship NFTs
export function usePlayerShips() {
  const account = useActiveAccount();
  const { shipNFTContract } = useContractInstances();

  const { data: shipIds, isLoading, refetch } = useReadContract({
    contract: shipNFTContract,
    method: 'function getShipsByOwner(address) view returns (uint256[])',
    params: account?.address ? [account.address] : undefined,
  });

  const { data: totalYield } = useReadContract({
    contract: shipNFTContract,
    method: 'function getTotalClaimableYield(address) view returns (uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  return {
    shipIds: shipIds || [],
    totalYield: totalYield || 0n,
    shipCount: shipIds ? shipIds.length : 0,
    isLoading,
    refetch,
  };
}

// Hook to get claimable gold from GPM
export function useClaimableGold() {
  const account = useActiveAccount();
  const { gameContract } = useContractInstances();

  const { data: claimableGold, isLoading, refetch } = useReadContract({
    contract: gameContract,
    method: 'function getClaimableGold(address) view returns (uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  return { claimableGold: claimableGold || 0n, isLoading, refetch };
}

// Hook to get guild dividends
export function useClaimableDividends() {
  const account = useActiveAccount();
  const { guildContract } = useContractInstances();

  const { data: dividends, isLoading, refetch } = useReadContract({
    contract: guildContract,
    method: 'function getClaimableDividends(address) view returns (uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  return { dividends: dividends || 0n, isLoading, refetch };
}

// Hook to get unclaimed battle pass rewards
export function useUnclaimedRewards() {
  const account = useActiveAccount();
  const { battlePassContract } = useContractInstances();

  const { data: rewards, isLoading, refetch } = useReadContract({
    contract: battlePassContract,
    method: 'function getUnclaimedRewards(address) view returns (uint256[], uint256, uint256, uint256)',
    params: account?.address ? [account.address] : undefined,
  });

  return {
    levels: rewards?.[0] || [],
    totalGold: rewards?.[1] || 0n,
    totalDiamonds: rewards?.[2] || 0n,
    totalArmada: rewards?.[3] || 0n,
    isLoading,
    refetch,
  };
}

// Hook to get top guilds
export function useTopGuilds(count: number = 10) {
  const { guildContract } = useContractInstances();

  // Get total guild count first
  const { data: nextGuildIdData } = useReadContract({
    contract: guildContract,
    method: 'function nextGuildId() view returns (uint256)',
    params: [],
  });

  const totalGuilds = nextGuildIdData ? Number(nextGuildIdData) - 1 : 0;

  // Generate array of all guild IDs (1 to totalGuilds)
  const allGuildIds = totalGuilds > 0
    ? Array.from({ length: totalGuilds }, (_, i) => BigInt(i + 1))
    : [];

  return {
    guildIds: allGuildIds,
    scores: allGuildIds.map(() => BigInt(0)), // Placeholder scores
    isLoading: false,
    refetch: () => {},
  };
}

// Hook to get ranking
export function useRanking(count: number = 10) {
  const { gameContract } = useContractInstances();

  const { data, isLoading, refetch } = useReadContract({
    contract: gameContract,
    method: 'function getRanking(uint256) view returns (address[], uint256[])',
    params: [BigInt(count)],
  });

  return {
    addresses: data?.[0] || [],
    scores: data?.[1] || [],
    isLoading,
    refetch,
  };
}

// Hook for sending transactions
export function useGameTransaction() {
  const { mutate: sendTransaction, isPending, isSuccess, isError, error } = useSendTransaction();
  const { gameContract } = useContractInstances();

  const createAccount = async (boatName: string, isPirate: boolean, startLocation: number) => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function createAccount(string, bool, uint256)',
      params: [boatName, isPirate, BigInt(startLocation)],
    });
    return sendTransaction(transaction);
  };

  const checkIn = async () => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function checkIn()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  const claimGPM = async () => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function claimGPM()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  const buyUpgrade = async (upgradeId: number) => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function buyUpgrade(uint256)',
      params: [BigInt(upgradeId)],
    });
    return sendTransaction(transaction);
  };

  const attack = async (defenderAddress: string) => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function attack(address)',
      params: [defenderAddress],
    });
    return sendTransaction(transaction);
  };

  const batchAttack = async (defenderAddresses: string[]) => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function batchAttack(address[])',
      params: [defenderAddresses],
    });
    return sendTransaction(transaction);
  };

  const travel = async (toLocation: number, fast: boolean, value?: bigint) => {
    const transaction = prepareContractCall({
      contract: gameContract,
      method: 'function travel(uint256, bool)',
      params: [BigInt(toLocation), fast],
      value,
    });
    return sendTransaction(transaction);
  };

  return {
    createAccount,
    checkIn,
    claimGPM,
    buyUpgrade,
    attack,
    batchAttack,
    travel,
    isPending,
    isSuccess,
    isError,
    error,
  };
}

// Hook for guild transactions
export function useGuildTransaction() {
  const { mutate: sendTransaction, isPending, isSuccess, isError } = useSendTransaction();
  const { guildContract } = useContractInstances();

  const createGuild = async (name: string, logo: string = '') => {
    const transaction = prepareContractCall({
      contract: guildContract,
      method: 'function createGuild(string, string)',
      params: [name, logo],
    });
    return sendTransaction(transaction);
  };

  const joinGuild = async (guildId: number) => {
    const transaction = prepareContractCall({
      contract: guildContract,
      method: 'function joinGuild(uint256)',
      params: [BigInt(guildId)],
    });
    return sendTransaction(transaction);
  };

  const leaveGuild = async () => {
    const transaction = prepareContractCall({
      contract: guildContract,
      method: 'function leaveGuild()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  const claimDividends = async () => {
    const transaction = prepareContractCall({
      contract: guildContract,
      method: 'function claimGuildDividends()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  return {
    createGuild,
    joinGuild,
    leaveGuild,
    claimDividends,
    isPending,
    isSuccess,
    isError,
  };
}

// Hook for battle pass transactions
export function useBattlePassTransaction() {
  const { mutate: sendTransaction, isPending, isSuccess, isError } = useSendTransaction();
  const { battlePassContract } = useContractInstances();

  const createPass = async () => {
    const transaction = prepareContractCall({
      contract: battlePassContract,
      method: 'function createPass()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  const upgradeToPremium = async () => {
    const transaction = prepareContractCall({
      contract: battlePassContract,
      method: 'function upgradeToPremium()',
      params: [],
    });
    return sendTransaction(transaction);
  };

  const claimReward = async (level: number) => {
    const transaction = prepareContractCall({
      contract: battlePassContract,
      method: 'function claimLevelReward(uint256)',
      params: [BigInt(level)],
    });
    return sendTransaction(transaction);
  };

  const claimMultipleRewards = async (levels: number[]) => {
    const transaction = prepareContractCall({
      contract: battlePassContract,
      method: 'function claimMultipleLevelRewards(uint256[])',
      params: [levels.map(l => BigInt(l))],
    });
    return sendTransaction(transaction);
  };

  return {
    createPass,
    upgradeToPremium,
    claimReward,
    claimMultipleRewards,
    isPending,
    isSuccess,
    isError,
  };
}

// Hook for ship NFT transactions
export function useShipNFTTransaction() {
  const { mutate: sendTransaction, isPending, isSuccess, isError } = useSendTransaction();
  const { shipNFTContract } = useContractInstances();

  const claimYield = async (tokenId: number) => {
    const transaction = prepareContractCall({
      contract: shipNFTContract,
      method: 'function claimYield(uint256)',
      params: [BigInt(tokenId)],
    });
    return sendTransaction(transaction);
  };

  const claimAllYields = async (tokenIds: number[]) => {
    const transaction = prepareContractCall({
      contract: shipNFTContract,
      method: 'function claimMultipleYields(uint256[])',
      params: [tokenIds.map(id => BigInt(id))],
    });
    return sendTransaction(transaction);
  };

  const stakeShip = async (tokenId: number) => {
    const transaction = prepareContractCall({
      contract: shipNFTContract,
      method: 'function stakeShip(uint256)',
      params: [BigInt(tokenId)],
    });
    return sendTransaction(transaction);
  };

  return {
    claimYield,
    claimAllYields,
    stakeShip,
    isPending,
    isSuccess,
    isError,
  };
}

