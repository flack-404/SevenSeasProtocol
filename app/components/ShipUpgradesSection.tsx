"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";
import { usePlayer } from "../libs/providers/player-provider";
import { Icon } from "./Icons";

interface Upgrade {
  id: number;
  name: string;
  baseCost: number;
  actualCost: number;
  purchaseCount: number;
  gpmBonus: number;
  maxHpBonus: number;
  speedBonus: number;
  attackBonus: number;
  defenseBonus: number;
  maxCrewBonus: number;
}

const UpgradeItem = ({ 
  upgrade, 
  playerGold, 
  onPurchase, 
  isPurchasing 
}: { 
  upgrade: Upgrade; 
  playerGold: number; 
  onPurchase: (upgradeId: number) => Promise<void>;
  isPurchasing: boolean;
}) => {
  const canAfford = playerGold >= upgrade.actualCost;
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!canAfford || isProcessing || isPurchasing) return;
    
    setIsProcessing(true);
    try {
      await onPurchase(upgrade.id);
    } catch (error) {
      console.error("Failed to purchase upgrade:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getBonusText = () => {
    const bonuses = [];
    if (upgrade.maxHpBonus > 0) bonuses.push(`+${upgrade.maxHpBonus} Max HP`);
    if (upgrade.speedBonus > 0) bonuses.push(`+${upgrade.speedBonus} Speed`);
    if (upgrade.attackBonus > 0) bonuses.push(`+${upgrade.attackBonus} Attack`);
    if (upgrade.defenseBonus > 0) bonuses.push(`+${upgrade.defenseBonus} Defense`);
    if (upgrade.gpmBonus > 0) bonuses.push(`+${upgrade.gpmBonus} GPM`);
    if (upgrade.maxCrewBonus > 0) bonuses.push(`+${upgrade.maxCrewBonus} Max Crew`);
    
    return bonuses.join(", ") || "No bonuses";
  };

    return (
    <div className="flex ui2 w-full gap-2 !brightness-120 p-4 items-center justify-between">
            <div className="flex items-center justify-center gap-2">
        <Image 
          unoptimized 
          src={`/upgrades/${upgrade.id}.webp`} // Cycle through available images
          alt={upgrade.name} 
          width={48} 
          height={48} 
        />
                 <div className="text-white !text-lg text-shadow-[0_2px_0px_#291414,0_1px_0px_#291414] flex flex-col items-start justify-center">
           <div className="flex items-center gap-2">
             <div className="text-white !text-lg font-bold">{upgrade.name}</div>
             {upgrade.purchaseCount > 0 && (
               <div className="bg-yellow-600 text-black !text-sm text-shadow-none px-2 py-1 flex items-center justify-center font-bold">
                 Lv.{upgrade.purchaseCount}
               </div>
             )}
           </div>
           <div className="text-white !text-sm opacity-90">{getBonusText()}</div>
            </div>
            </div>
            <div className="flex items-center justify-center gap-2">
        <Button 
          onClick={handlePurchase}
          disabled={!canAfford || isProcessing || isPurchasing}
          className={`${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            {isProcessing ? "Buying..." : <>{upgrade.actualCost} <Icon iconName="gold" className="w-4 h-4" /></>}
          </div>
        </Button>
            </div>
        </div>
  );
};

export const ShipUpgradesSection = () => {
  const gameContract = useGameContract();
  const { playerAccount, refreshPlayerData, setNotification, forceRefresh, updatePlayerOptimistically } = usePlayer();
  
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [realTimeGold, setRealTimeGold] = useState<number>(0);

  // Calculate real-time gold including accumulated GPM (per second for smooth experience)
  const calculateRealTimeGold = () => {
    if (!playerAccount || playerAccount.gpm === 0 || playerAccount.hp === 0) {
      return playerAccount?.gold || 0;
    }

    const now = Date.now() / 1000; // Current time in seconds
    const lastClaim = playerAccount.lastGPMClaim; // Last claim time in seconds
    const timeElapsed = now - lastClaim;
    
    // Calculate gold per second (GPM / 60) and multiply by seconds elapsed
    const goldPerSecond = playerAccount.gpm / 60;
    const accumulatedGold = goldPerSecond * timeElapsed;
    
    return playerAccount.gold + accumulatedGold;
  };

  // Update real-time gold periodically
  useEffect(() => {
    const updateRealTimeGold = () => {
      setRealTimeGold(calculateRealTimeGold());
    };

    // Initial update
    updateRealTimeGold();

    // Update every second if player has GPM and is alive for smooth experience
    if (playerAccount && playerAccount.gpm > 0 && playerAccount.hp > 0) {
      const interval = setInterval(updateRealTimeGold, 1000);
      return () => clearInterval(interval);
    }
  }, [playerAccount?.gold, playerAccount?.gpm, playerAccount?.lastGPMClaim, playerAccount?.hp]);

  // Fetch all available upgrades from the contract
  const fetchUpgrades = async () => {
    if (!gameContract.isReady || !("getNextUpgradeId" in gameContract)) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Get the next upgrade ID to know how many upgrades exist
      const nextUpgradeId = await gameContract.getNextUpgradeId();
      const totalUpgrades = Number(nextUpgradeId);
      
      if (totalUpgrades === 0) {
        setUpgrades([]);
        setIsLoading(false);
        return;
      }

      // Fetch all upgrades with their current costs and purchase counts in batches
      const BATCH_SIZE = 2; // Process 2 upgrades at a time (2 upgrades × 3 calls = 6 RPC calls per batch)
      const formattedUpgrades: Upgrade[] = [];

      // Process upgrades in batches to avoid RPC batch size limits
      for (let i = 0; i < totalUpgrades; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, totalUpgrades);
        const batchPromises = [];

        // Create promises for this batch
        for (let j = i; j < batchEnd; j++) {
          batchPromises.push(
            Promise.all([
              gameContract.getUpgrade(j),
              gameContract.getUpgradeCost(j), 
              gameContract.getPurchaseCount(j)
            ])
          );
        }

        // Execute batch
        const batchResults = await Promise.all(batchPromises);

        // Process batch results
        batchResults.forEach((result, batchIndex) => {
          const upgradeIndex = i + batchIndex;
          const [upgrade, actualCost, purchaseCount] = result;
          
          formattedUpgrades.push({
            id: upgradeIndex,
            name: upgrade[0],
            baseCost: Number(upgrade[1]),
            actualCost: Number(actualCost),
            purchaseCount: Number(purchaseCount),
            gpmBonus: Number(upgrade[2]),
            maxHpBonus: Number(upgrade[3]),
            speedBonus: Number(upgrade[4]),
            attackBonus: Number(upgrade[5]),
            defenseBonus: Number(upgrade[6]),
            maxCrewBonus: Number(upgrade[7]),
          });
        });

        // Small delay between batches to avoid overwhelming the RPC
        if (batchEnd < totalUpgrades) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setUpgrades(formattedUpgrades);
    } catch (error) {
      console.error("Error fetching upgrades:", error);
      setError("Failed to load upgrades");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle upgrade purchase
  const handlePurchaseUpgrade = async (upgradeId: number) => {
    if (!gameContract.isReady || !("buyUpgrade" in gameContract) || !playerAccount) {
      setNotification("❌ Game not ready or no account found");
      return;
    }

    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) {
      setNotification("❌ Upgrade not found");
      return;
    }

    if (realTimeGold < upgrade.actualCost) {
      setNotification("❌ Not enough gold");
      return;
    }

    setIsPurchasing(true);
    try {
      setNotification("🔧 Purchasing upgrade...");
      
      // Log pre-purchase stats for debugging
      console.log("Pre-purchase stats:", {
        attack: playerAccount.attack,
        defense: playerAccount.defense,
        speed: playerAccount.speed,
        maxHp: playerAccount.maxHp,
        gold: playerAccount.gold,
        gpm: playerAccount.gpm,
      });
      
      await gameContract.buyUpgrade(upgradeId);
      
      // Immediately update UI with optimistic values for instant feedback
      const optimisticUpdates: any = {
        gold: realTimeGold - upgrade.actualCost, // Deduct the cost
      };
      
      // Apply stat bonuses
      if (upgrade.attackBonus > 0) optimisticUpdates.attack = playerAccount.attack + upgrade.attackBonus;
      if (upgrade.defenseBonus > 0) optimisticUpdates.defense = playerAccount.defense + upgrade.defenseBonus;
      if (upgrade.speedBonus > 0) optimisticUpdates.speed = playerAccount.speed + upgrade.speedBonus;
      if (upgrade.maxHpBonus > 0) {
        optimisticUpdates.maxHp = playerAccount.maxHp + upgrade.maxHpBonus;
        // Also increase current HP when maxHp increases (matches contract logic)
        optimisticUpdates.hp = playerAccount.hp + upgrade.maxHpBonus;
      }
      if (upgrade.gpmBonus > 0) optimisticUpdates.gpm = playerAccount.gpm + upgrade.gpmBonus;
      if (upgrade.maxCrewBonus > 0) {
        optimisticUpdates.maxCrew = playerAccount.maxCrew + upgrade.maxCrewBonus;
        // Crew stays the same unless it exceeds new max (contract logic)
        if (playerAccount.crew > optimisticUpdates.maxCrew) {
          optimisticUpdates.crew = optimisticUpdates.maxCrew;
        }
      }
      
      updatePlayerOptimistically(optimisticUpdates);
      
      // Update real-time gold immediately
      setRealTimeGold(realTimeGold - upgrade.actualCost);
      
      // Show immediate success notification
      if (upgrade.gpmBonus > 0) {
        setNotification(`✅ ${upgrade.name} purchased! +${upgrade.gpmBonus} GPM (automatic gold earning)`);
      } else {
        setNotification(`✅ ${upgrade.name} purchased successfully!`);
      }
      
      // Refresh data with retries to ensure we get the updated state
      const refreshWithRetry = async (maxRetries = 3, delay = 1000) => {
        for (let i = 0; i < maxRetries; i++) {
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            // Refresh both player data and upgrades list
            await Promise.all([
              refreshPlayerData(),
              fetchUpgrades()
            ]);
            console.log(`Upgrade data refreshed on attempt ${i + 1}`);
            return; // Success, exit retry loop
          } catch (error) {
            console.warn(`Upgrade refresh retry ${i + 1} failed:`, error);
          }
          
          delay *= 1.5;
        }
        
        // If all retries failed, still try one final refresh
        console.warn("All upgrade refresh retries failed, doing final attempt");
        try {
          await Promise.all([refreshPlayerData(), fetchUpgrades()]);
        } catch (error) {
          console.error("Final upgrade refresh attempt failed:", error);
        }
      };
      
      // Start the refresh process (don't await to avoid blocking UI)
      refreshWithRetry();
      
      console.log(`Upgrade purchased: ${upgrade.name} for ${upgrade.actualCost} gold`);
    } catch (error: any) {
      console.error("Error purchasing upgrade:", error);
      
      // Handle specific error messages
      if (error.message?.includes("Not enough gold")) {
        setNotification("❌ Not enough gold");
      } else if (error.message?.includes("Upgrade not exist")) {
        setNotification("❌ Upgrade no longer available");
      } else {
        setNotification("❌ Failed to purchase upgrade");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // Fetch upgrades when component mounts or game contract becomes ready
  useEffect(() => {
    fetchUpgrades();
  }, [gameContract.isReady]);

  // Refresh upgrades when player account changes (after purchases)
  useEffect(() => {
    if (playerAccount && gameContract.isReady) {
      fetchUpgrades();
    }
  }, [playerAccount?.gold, playerAccount?.gpm, gameContract.isReady]);

  // Show loading state
  if (isLoading) {
    return (
      <section className="flex flex-col w-full ui2 items-center justify-center h-[200px] overflow-y-auto p-4 gap-2 text-white">
        <div className="text-white !text-lg animate-pulse">Loading upgrades...</div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="flex flex-col w-full ui2 items-center justify-center h-[200px] overflow-y-auto p-4 gap-2 text-white">
        <div className="text-red-400 !text-lg">{error}</div>
        <Button onClick={fetchUpgrades} className="mt-2">
          Retry
        </Button>
      </section>
    );
  }

  // Show empty state
  if (upgrades.length === 0) {
    return (
      <section className="flex flex-col w-full ui2 items-center justify-center h-[200px] overflow-y-auto p-4 gap-2 text-white">
        <div className="text-gray-400 !text-lg">No upgrades available</div>
        <div className="text-gray-500 !text-sm">Check back later for new ship upgrades!</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col w-full ui2 items-center justify-center h-[200px] overflow-y-auto p-4 gap-2 text-white">
      <div className="text-white !text-xl w-full h-full">
        <div className="flex flex-col w-full gap-2 max-h-full">
          {upgrades.map((upgrade) => (
            <UpgradeItem
              key={upgrade.id}
              upgrade={upgrade}
              playerGold={realTimeGold}
              onPurchase={handlePurchaseUpgrade}
              isPurchasing={isPurchasing}
            />
          ))}
                </div>
            </div>
        </section>
  );
};