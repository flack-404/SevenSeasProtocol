"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useThirdweb } from "../hooks/useThirdweb";
import { useGameContract } from "../hooks/useGameContract";

// Import the PlayerAccount interface from UserBoatPanel
export interface PlayerAccount {
  boatName: string;
  isPirate: boolean;
  gold: number;
  diamonds: number;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  defense: number;
  crew: number;
  maxCrew: number;
  location: number;
  gpm: number;
  lastCheckIn: number;
  checkInStreak: number;
  lastWrecked: number;
  travelEnd: number;
  lastGPMClaim: number;
  repairEnd: number;
}

export interface PlayerContextType {
  // Player data
  playerAccount: PlayerAccount | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  
  // Computed states
  isTraveling: boolean;
  isWrecked: boolean;
  maxHp: number;
  level: number;
  
  // Actions
  refreshPlayerData: () => Promise<void>;
  forceRefresh: () => void;
  updatePlayerOptimistically: (updates: Partial<PlayerAccount>) => void;
  
  // Notifications
  notification: string | null;
  setNotification: (message: string | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const { isConnected, address } = useThirdweb();
  const gameContract = useGameContract();
  
  const [playerAccount, setPlayerAccount] = useState<PlayerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forceRefreshTrigger, setForceRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // Computed states
  const isTraveling = playerAccount ? Date.now() / 1000 < playerAccount.travelEnd : false;
  const isWrecked = playerAccount ? playerAccount.hp === 0 : false;
  const maxHp = playerAccount ? playerAccount.maxHp : 100;
  const level = playerAccount ? playerAccount.attack + playerAccount.defense + playerAccount.speed : 0;

  // Helper function to parse account data with correct indices
  const parseAccountData = (account: any): PlayerAccount => ({
    boatName: account[0],
    isPirate: account[1],
    gold: Number(account[2]),
    diamonds: Number(account[3]),
    hp: Number(account[4]),
    maxHp: Number(account[5]),
    speed: Number(account[6]),
    attack: Number(account[7]),
    defense: Number(account[8]),
    crew: Number(account[9]),
    maxCrew: Number(account[10]),
    location: Number(account[11]),
    gpm: Number(account[12]),
    lastCheckIn: Number(account[13]),
    checkInStreak: Number(account[14]),
    lastWrecked: Number(account[15]),
    travelEnd: Number(account[16]),
    lastGPMClaim: Number(account[17]),
    repairEnd: Number(account[18]),
  });

  // Fetch player account data
  const fetchPlayerData = async () => {
    if (!isConnected || !address || !gameContract.isReady) {
      setPlayerAccount(null);
      setIsLoading(false);
      return;
    }

    if (!("getPlayerAccount" in gameContract)) {
      setError("Game contract not available");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      const account = await gameContract.getPlayerAccount(address);
      
      if (account && account[0] && account[0].length > 0) {
        const parsedAccount = parseAccountData(account);
        setPlayerAccount(parsedAccount);
        setLastUpdated(new Date());
        console.log("Player data fetched:", {
          location: parsedAccount.location,
          travelEnd: parsedAccount.travelEnd,
          hp: parsedAccount.hp,
          maxHp: parsedAccount.maxHp,
          isTraveling: Date.now() / 1000 < parsedAccount.travelEnd,
        });
      } else {
        setPlayerAccount(null);
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError("Failed to load player data");
      setPlayerAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function with loading state
  const refreshPlayerData = async () => {
    if (!gameContract.isReady || !address || !("getPlayerAccount" in gameContract)) return;
    
    setIsRefreshing(true);
    try {
      const account = await gameContract.getPlayerAccount(address);
      if (account && account[0] && account[0].length > 0) {
        const parsedAccount = parseAccountData(account);
        setPlayerAccount(parsedAccount);
        setLastUpdated(new Date());
        console.log("Player data refreshed:", {
          location: parsedAccount.location,
          travelEnd: parsedAccount.travelEnd,
          hp: parsedAccount.hp,
          maxHp: parsedAccount.maxHp,
          attack: parsedAccount.attack,
          defense: parsedAccount.defense,
          speed: parsedAccount.speed,
          gpm: parsedAccount.gpm,
          gold: parsedAccount.gold,
          isTraveling: Date.now() / 1000 < parsedAccount.travelEnd,
        });
      }
    } catch (error) {
      console.error("Error refreshing player data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Force refresh trigger
  const forceRefresh = () => {
    setForceRefreshTrigger(prev => prev + 1);
  };

  // Optimistic update function for immediate UI feedback
  const updatePlayerOptimistically = (updates: Partial<PlayerAccount>) => {
    if (!playerAccount) return;
    
    const updatedAccount = { ...playerAccount, ...updates };
    setPlayerAccount(updatedAccount);
    setLastUpdated(new Date());
    
    console.log("Optimistic update applied:", updates);
  };

  // Auto-clear notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchPlayerData();
  }, [isConnected, address, gameContract.isReady, forceRefreshTrigger]);

  // Auto-refresh player data - more frequent when traveling
  useEffect(() => {
    if (!playerAccount) return;
    
    // Refresh more frequently when traveling (every 10 seconds) vs normal (every 60 seconds)
    // Reduced frequency to avoid overwhelming RPC with too many requests
    const refreshInterval = isTraveling ? 10000 : 60000;
    
    const interval = setInterval(async () => {
      if (
        gameContract.isReady &&
        address &&
        "getPlayerAccount" in gameContract
      ) {
        try {
          const account = await gameContract.getPlayerAccount(address);
          if (account && account[0] && account[0].length > 0) {
            const parsedAccount = parseAccountData(account);
            setPlayerAccount(parsedAccount);
            setLastUpdated(new Date());
          }
        } catch (error) {
          console.error("Error auto-refreshing player data:", error);
        }
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [playerAccount, gameContract.isReady, address, isTraveling]);

  const value: PlayerContextType = {
    // Player data
    playerAccount,
    isLoading,
    error,
    lastUpdated,
    isRefreshing,
    
    // Computed states
    isTraveling,
    isWrecked,
    maxHp,
    level,
    
    // Actions
    refreshPlayerData,
    forceRefresh,
    updatePlayerOptimistically,
    
    // Notifications
    notification,
    setNotification,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

// Custom hook to use player context
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
} 