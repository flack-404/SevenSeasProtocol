import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import type { SeasOfLinkardia } from '../types/artifacts/contracts/SeasOfLinkardia';
import {
  createSeasOfLinkardiaContract,
  createReadOnlySeasOfLinkardiaContract,
  formatPlayerAccount,
  formatGameUpgrade,
  isShipWrecked,
  isShipTraveling,
  calculateShipLevel,
  type PlayerAccount,
  type GameUpgrade,
  type ShipInfo,
  type RankingEntry,
} from '../lib/contracts';

// ===== CUSTOM HOOKS =====

/**
 * Hook for managing contract instance
 */
export function useSeasOfLinkardiaContract(
  contractAddress: string,
  signerOrProvider?: ethers.Signer | ethers.Provider
) {
  const [contract, setContract] = useState<SeasOfLinkardia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractAddress) {
      setError('Contract address is required');
      setIsLoading(false);
      return;
    }

    try {
      if (signerOrProvider) {
        const contractInstance = createSeasOfLinkardiaContract(contractAddress, signerOrProvider);
        setContract(contractInstance);
      }
      setError(null);
    } catch (err) {
      setError(`Failed to create contract instance: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, signerOrProvider]);

  return { contract, isLoading, error };
}

/**
 * Hook for fetching player account data
 */
export function usePlayerAccount(
  contract: SeasOfLinkardia | null,
  playerAddress: string | null
) {
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!contract || !playerAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const accountData = await contract.accounts(playerAddress);
      const formattedAccount = formatPlayerAccount(accountData);
      setAccount(formattedAccount);
    } catch (err) {
      setError(`Failed to fetch account: ${err}`);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [contract, playerAddress]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const refetch = useCallback(() => {
    fetchAccount();
  }, [fetchAccount]);

  return { account, isLoading, error, refetch };
}

/**
 * Hook for fetching upgrades
 */
export function useUpgrades(contract: SeasOfLinkardia | null) {
  const [upgrades, setUpgrades] = useState<GameUpgrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpgrades = useCallback(async () => {
    if (!contract) return;

    setIsLoading(true);
    setError(null);

    try {
      const nextUpgradeId = await contract.nextUpgradeId();
      const upgradePromises = [];

      for (let i = 0; i < Number(nextUpgradeId); i++) {
        upgradePromises.push(contract.upgrades(i));
      }

      const upgradeResults = await Promise.all(upgradePromises);
      const formattedUpgrades = upgradeResults.map(formatGameUpgrade);
      setUpgrades(formattedUpgrades);
    } catch (err) {
      setError(`Failed to fetch upgrades: ${err}`);
      setUpgrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  const refetch = useCallback(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  return { upgrades, isLoading, error, refetch };
}

/**
 * Hook for fetching ships at a location
 */
export function useShipsAtLocation(
  contract: SeasOfLinkardia | null,
  location: number
) {
  const [ships, setShips] = useState<ShipInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShips = useCallback(async () => {
    if (!contract || location < 0 || location > 100) return;

    setIsLoading(true);
    setError(null);

    try {
      const [addresses, names, levels] = await contract.getShipsAt(location);
      const shipsData: ShipInfo[] = addresses.map((address, index) => ({
        address,
        name: names[index],
        level: levels[index],
      }));
      setShips(shipsData);
    } catch (err) {
      setError(`Failed to fetch ships: ${err}`);
      setShips([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract, location]);

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  const refetch = useCallback(() => {
    fetchShips();
  }, [fetchShips]);

  return { ships, isLoading, error, refetch };
}

/**
 * Hook for fetching ranking
 */
export function useRanking(contract: SeasOfLinkardia | null, topN: number = 10) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    if (!contract || topN <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const [addresses, levels] = await contract.getRanking(topN);
      const rankingData: RankingEntry[] = addresses.map((address, index) => ({
        address,
        level: levels[index],
      }));
      setRanking(rankingData);
    } catch (err) {
      setError(`Failed to fetch ranking: ${err}`);
      setRanking([]);
    } finally {
      setIsLoading(false);
    }
  }, [contract, topN]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const refetch = useCallback(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { ranking, isLoading, error, refetch };
}

// ===== CONTRACT ACTION HOOKS =====

/**
 * Hook for contract write operations
 */
export function useContractActions(contract: SeasOfLinkardia | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAction = useCallback(async (
    actionFn: () => Promise<ethers.ContractTransactionResponse>
  ) => {
    if (!contract) {
      throw new Error('Contract not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = await actionFn();
      await tx.wait();
      return tx;
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Transaction failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  // ===== GAME ACTIONS =====

  const createAccount = useCallback(async (
    boatName: string,
    isPirate: boolean,
    startLocation: number
  ) => {
    return executeAction(() => 
      contract!.createAccount(boatName, isPirate, startLocation)
    );
  }, [contract, executeAction]);

  const checkIn = useCallback(async () => {
    return executeAction(() => contract!.checkIn());
  }, [contract, executeAction]);

  const buyUpgrade = useCallback(async (upgradeId: number) => {
    return executeAction(() => contract!.buyUpgrade(upgradeId));
  }, [contract, executeAction]);

  const attack = useCallback(async (defenderAddress: string) => {
    return executeAction(() => contract!.attack(defenderAddress));
  }, [contract, executeAction]);

  const travel = useCallback(async (
    toLocation: number,
    fast: boolean = false,
    value?: string
  ) => {
    return executeAction(() => 
      contract!.travel(toLocation, fast, { value: value || '0' })
    );
  }, [contract, executeAction]);

  const repairShip = useCallback(async (
    repairType: number // 0 = FREE, 1 = GOLD, 2 = DIAMOND
  ) => {
    return executeAction(() => 
      contract!.repairShip(repairType)
    );
  }, [contract, executeAction]);

  const buyDiamonds = useCallback(async (xtzAmount: string) => {
    return executeAction(() => 
      contract!.getFunction('receive')({ value: xtzAmount })
    );
  }, [contract, executeAction]);

  // ===== ADMIN ACTIONS =====

  const addUpgrade = useCallback(async (
    name: string,
    cost: number,
    gpmBonus: number = 0,
    hpBonus: number = 0,
    speedBonus: number = 0,
    attackBonus: number = 0,
    defenseBonus: number = 0,
    maxCrewBonus: number = 0
  ) => {
    return executeAction(() => 
      contract!.addUpgrade(
        name, cost, gpmBonus, hpBonus, speedBonus, attackBonus, defenseBonus, maxCrewBonus
      )
    );
  }, [contract, executeAction]);

  const rescueXTZ = useCallback(async () => {
    return executeAction(() => contract!.rescueXTZ());
  }, [contract, executeAction]);

  return {
    // State
    isLoading,
    error,
    
    // Player actions
    createAccount,
    checkIn,
    buyUpgrade,
    attack,
    travel,
    repairShip,
    buyDiamonds,
    
    // Admin actions
    addUpgrade,
    rescueXTZ,
  };
}

// ===== UTILITY HOOKS =====

/**
 * Hook for player status calculations
 */
export function usePlayerStatus(account: PlayerAccount | null) {
  const isWrecked = account ? isShipWrecked(account) : false;
  const isTraveling = account ? isShipTraveling(account) : false;
  const shipLevel = account ? calculateShipLevel(account) : 0;
  
  const canCheckIn = account && !isWrecked;
  const canTravel = account && !isWrecked && !isTraveling;
  const canAttack = account && !isWrecked && !isTraveling;
  const canRepair = account && isWrecked;

  return {
    isWrecked,
    isTraveling,
    shipLevel,
    canCheckIn,
    canTravel,
    canAttack,
    canRepair,
  };
}

/**
 * Hook for listening to contract events
 */
export function useContractEvents(
  contract: SeasOfLinkardia | null,
  eventName: keyof SeasOfLinkardia['filters'],
  filter?: any[]
) {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contract) return;

    setIsLoading(true);

    const eventFilter = filter 
      ? (contract.filters[eventName] as any)(...filter) 
      : (contract.filters[eventName] as any)();
    
    const handleEvent = (event: any) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
    };

    contract.on(eventFilter, handleEvent);
    setIsLoading(false);

    return () => {
      contract.off(eventFilter, handleEvent);
    };
  }, [contract, eventName, filter]);

  return { events, isLoading };
} 