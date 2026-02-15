"use client";

import { useState, useEffect } from "react";
import { TravelCountdown } from "./TravelCountdown"
import { usePlayer } from "../libs/providers/player-provider"
import { useGameContract } from "../libs/hooks/useGameContract"
import Button from "./Button"
import { DailyCheckInSection } from "./DailyCheckInSection";
import { RepairModal } from "./RepairModal";
import { Icon } from "./Icons";


export const ShipActionsSection = ({showTravelModal, setShowTravelModal, handleTravelComplete, showRepairModal, setShowRepairModal}: {showTravelModal: boolean, setShowTravelModal: (show: boolean) => void, handleTravelComplete: () => void, showRepairModal: boolean, setShowRepairModal: (show: boolean) => void}) => {
    const { playerAccount, isTraveling, isWrecked, maxHp, refreshPlayerData, setNotification, updatePlayerOptimistically } = usePlayer();
    const gameContract = useGameContract();
    const [isHiringCrew, setIsHiringCrew] = useState(false);
    const [hireCrewCost, setHireCrewCost] = useState<number>(0);
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairEndTime, setRepairEndTime] = useState<number>(0);

    // Check if ship is currently being repaired
    useEffect(() => {
        if (!playerAccount) {
            setIsRepairing(false);
            return;
        }
        
        // Get repair end time directly from player account
        const repairEndTimestamp = playerAccount.repairEnd;
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (repairEndTimestamp > 0 && repairEndTimestamp > currentTime && playerAccount.hp === 0) {
            setIsRepairing(true);
            setRepairEndTime(repairEndTimestamp);
        } else {
            setIsRepairing(false);
        }
        
    }, [playerAccount]);
    
    // Polling to check repair status continuously
    useEffect(() => {
        if (!isRepairing) return;
        
        const interval = setInterval(() => {
            const currentTime = Math.floor(Date.now() / 1000);
            if (repairEndTime <= currentTime) {
                refreshPlayerData();
            }
        }, 5000); // Check every 5 seconds
        
        return () => clearInterval(interval);
    }, [isRepairing, repairEndTime, refreshPlayerData]);

    // Handle repair completion
    const handleRepairComplete = async () => {
        if (!gameContract.isReady || !("completeRepair" in gameContract)) {
            setNotification("❌ Game not ready");
            return;
        }

        try {
            setNotification("🔧 Completing repairs...");
            await gameContract.completeRepair();
            await refreshPlayerData();
            setNotification("✅ Ship repaired successfully!");
            setIsRepairing(false);
        } catch (error: any) {
            console.error("Error completing repair:", error);
            setNotification("❌ Failed to complete repair");
        }
    };

    // Handle opening repair modal
    const handleRepair = () => {
      if (!playerAccount) {
        setNotification("❌ No account found");
        return;
      }

      if (playerAccount.hp > 0) {
        setNotification("❌ Ship is not wrecked");
        return;
      }

      setShowRepairModal(true);
    };

    // Handle crew hiring
    const handleHireCrew = async () => {
      if (!gameContract.isReady || !("hireCrew" in gameContract) || !playerAccount) {
        setNotification("❌ Game not ready or no account found");
        return;
      }

      if (playerAccount.crew >= playerAccount.maxCrew) {
        setNotification("❌ Crew is already at maximum");
        return;
      }

      if (![25, 55, 89].includes(playerAccount.location)) {
        setNotification("❌ Must be at a port to hire crew");
        return;
      }

      setIsHiringCrew(true);
      try {
        setNotification("👥 Hiring crew...");
        
        // Calculate expected values before transaction (using current data)
        const crewToHire = playerAccount.maxCrew - playerAccount.crew;
        const expectedGoldCost = hireCrewCost;
        
        await gameContract.hireCrew();
        
        // Immediately update UI with optimistic values for instant feedback
        updatePlayerOptimistically({
          crew: playerAccount.maxCrew, // Set to max crew (hiring all available spots)
          gold: playerAccount.gold - expectedGoldCost
        });
        
        // Immediately show success with expected values
        setNotification(`✅ Hired ${crewToHire} crew members for ${expectedGoldCost} gold!`);
        
        // Refresh data with retries to ensure we get the updated state
        const refreshWithRetry = async (maxRetries = 3, delay = 1000) => {
          for (let i = 0; i < maxRetries; i++) {
            // Wait a bit for blockchain state to be available
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
              await refreshPlayerData();
              console.log(`Crew hiring data refreshed on attempt ${i + 1}`);
              return; // Success, exit retry loop
            } catch (error) {
              console.warn(`Crew refresh retry ${i + 1} failed:`, error);
            }
            
            // Increase delay for next retry
            delay *= 1.5;
          }
          
          // If all retries failed, still try one final refresh
          console.warn("All crew refresh retries failed, doing final attempt");
          try {
            await refreshPlayerData();
          } catch (error) {
            console.error("Final crew refresh attempt failed:", error);
          }
        };
        
        // Start the refresh process (don't await to avoid blocking UI)
        refreshWithRetry();
        
        console.log(`Crew hired: ${crewToHire} members for ${expectedGoldCost} gold`);
      } catch (error: any) {
        console.error("Error hiring crew:", error);
        
        if (error.message?.includes("Must be at a port")) {
          setNotification("❌ Must be at a port to hire crew");
        } else if (error.message?.includes("Not enough gold")) {
          setNotification("❌ Not enough gold to hire crew");
        } else if (error.message?.includes("Crew already at maximum")) {
          setNotification("❌ Crew is already at maximum");
        } else {
          setNotification("❌ Failed to hire crew");
        }
      } finally {
        setIsHiringCrew(false);
      }
    };

    // Fetch hire crew cost when component mounts or player account changes
    useEffect(() => {
      const fetchHireCrewCost = async () => {
        if (gameContract.isReady && "getHireCrewCost" in gameContract && playerAccount) {
          try {
            const cost = await gameContract.getHireCrewCost();
            setHireCrewCost(Number(cost));
          } catch (error) {
            console.error("Error fetching hire crew cost:", error);
          }
        }
      };

      fetchHireCrewCost();
    }, [gameContract.isReady, playerAccount?.crew, playerAccount?.maxCrew]);

    //knots conversion
    const speedToKnots = (speed: number) => {
        if (speed === 1) return "4";
        if (speed === 2) return "6.5";
        if (speed === 3) return "8.5";
        if (speed === 4) return "10";
        if (speed === 5) return "11";
        if (speed === 6) return "11.8";
        if (speed === 7) return "12.3";
        if (speed === 8) return "12.7";
        if (speed === 9) return "13";
        if (speed === 10) return "13.2";
        return "13.2+";
    }

    // Helper functions
    const isAtPort = playerAccount ? [25, 55, 89].includes(playerAccount.location) : false;
    const needsCrew = playerAccount ? playerAccount.crew < playerAccount.maxCrew : false;
    const canHireCrew = isAtPort && needsCrew && !isWrecked;


    return (
        <>
        <section className="flex flex-col w-full ui2 items-center justify-center p-6 h-full gap-2 text-white">
              {isRepairing ? (
                <>
                  <div className="text-white !text-xl mb-4">
                    Ship Under Repairs
                  </div>
                  <TravelCountdown
                    travelEndTime={repairEndTime}
                    onTravelComplete={handleRepairComplete}
                    suffix="until repairs complete"
                  />
                  <div className="text-sm text-gray-300 mt-2">
                    Your ship is being repaired at the port. Please wait until repairs are complete.
                  </div>
                </>
              ) : isTraveling ? (
                <>
                  <div className="text-white !text-xl mb-4">
                    En Route to Coordinate {playerAccount?.location}
                  </div>
                  <TravelCountdown
                    travelEndTime={playerAccount?.travelEnd || 0}
                    onTravelComplete={handleTravelComplete}
                    suffix={`at ${speedToKnots(playerAccount?.speed || 0)} knots`}
                  />
                </>
              ) : (
                <>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowTravelModal(true)}
                      disabled={isWrecked}
                    >
                      Open Map
                    </Button>
                    {playerAccount?.hp === 0 && <Button
                          onClick={handleRepair}
                          disabled={(playerAccount?.hp || 0) > 0}
                    >
                          {(playerAccount?.hp || 0) > 0 ? "Not Wrecked" : "Repair Ship"}
                        </Button>
                    }
                    </div>
                    
                    {/* Crew Hiring Button - Only show at ports */}
                    {isAtPort && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleHireCrew}
                          disabled={!canHireCrew || isHiringCrew || hireCrewCost === 0}
                          className={`${!canHireCrew ? 'opacity-50' : ''} flex items-center gap-2`}
                        >
                          {isHiringCrew 
                            ? "Hiring..." 
                            : needsCrew 
                              ? <span className="flex items-center gap-2">Hire Crew ({hireCrewCost} <Icon iconName="gold" className="w-4 h-4" />) </span>
                              : "Crew Full"
                          }
                    </Button>
                                                
                      </div>
                    )}
                  </div>
                </>
              )}

            </section>
            </>
    )
}