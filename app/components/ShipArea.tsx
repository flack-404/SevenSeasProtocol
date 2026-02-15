import React, { useState, useEffect } from "react";
import { RenderShip } from "./RenderShip";
import { useGameContract } from "../libs/hooks/useGameContract";
import { PlayerAccount, usePlayer } from "../libs/providers/player-provider";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { Icon } from "./Icons";
import { LocationInfo } from "./LocationInfo";
import { ShipInfoPopup } from "./ShipInfoPopUp";
import Image from "next/image";
import { MountPlayerShipTraveling } from "./MountPlayerShipTraveling";
import { BattleScene } from "./BattleScene";

export interface Ship {
  address: string;
  name: string;
  hp: number | null; // Will be fetched from getPlayerAccount
  maxHp: number | null; // Will be fetched from getPlayerAccount
  level: number;
  isPirate: boolean | null; // null while loading faction info
}

export const ShipArea = () => {
  const { playerAccount, isTraveling, setNotification, forceRefresh } = usePlayer();
  const { address } = useThirdweb();
  const gameContract = useGameContract();
  const [ships, setShips] = useState<Ship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [showBattleScene, setShowBattleScene] = useState(false);
  const [battle, setBattle] = useState<{ship1: PlayerAccount, ship2: Ship, dmgShip1: number, dmgShip2: number} | null>(null);

  // Fetch ships at current location
  const fetchShipsAtLocation = async (location: number) => {
    if (!gameContract.isReady || !("getShipsAtLocation" in gameContract)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // getShipsAt returns (address[], string[], uint256[]) - addresses, names, LEVELS (not HP!)
      const result = await gameContract.getShipsAtLocation(location);
      
      if (result && result.length >= 3) {
        const [addresses, names, levels] = result;
        
        // Combine the arrays into ship objects
        const shipsData: Ship[] = addresses.map((address: string, index: number) => ({
          address,
          name: names[index] || `Ship ${index + 1}`,
          hp: null, // Will be fetched from getPlayerAccount
          maxHp: null, // Will be fetched from getPlayerAccount
          level: Number(levels[index]) || 0, // This is the actual level (speed + attack + defense)
          isPirate: null, // Will be fetched separately
        })).filter(ship => 
          ship.address && 
          ship.name
          // Note: We now include the player's own ship in the display
        );

        setShips(shipsData);
        console.log(`Found ${shipsData.length} ships at location ${location}:`, shipsData);
        
        // Fetch faction information for each ship
        fetchShipFactions(shipsData);
      } else {
        setShips([]);
        console.log(`No ships found at location ${location}`);
      }
    } catch (error) {
      console.error("Error fetching ships at location:", error);
      setError("Failed to load ships at location");
      setShips([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch faction information for ships with batch throttling
  const fetchShipFactions = async (shipsToUpdate: Ship[]) => {
    if (!gameContract.isReady || !("getPlayerAccount" in gameContract)) {
      return;
    }

    try {
      const BATCH_SIZE = 3; // Process 3 ships at a time to avoid RPC batch size limits
      const updatedShips: Ship[] = [];

      // Process ships in batches
      for (let i = 0; i < shipsToUpdate.length; i += BATCH_SIZE) {
        const batch = shipsToUpdate.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (ship) => {
            try {
              const account = await gameContract.getPlayerAccount(ship.address);
              if (account && account.length > 4) {
                return {
                  ...ship,
                  isPirate: account[1], // Second element is isPirate boolean
                  hp: Number(account[4]), // Fifth element is HP
                  maxHp: Number(account[5]), // Sixth element is maxHp
                };
              }
              return ship;
            } catch (error) {
              console.error(`Error fetching faction for ${ship.address}:`, error);
              return ship;
            }
          })
        );

        updatedShips.push(...batchResults);

        // Small delay between batches to avoid overwhelming the RPC
        if (i + BATCH_SIZE < shipsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update ships with faction information
      setShips(updatedShips);
      console.log("Updated ships with faction info:", updatedShips);
    } catch (error) {
      console.error("Error fetching ship factions:", error);
    }
  };

  // Fetch ships when player location changes
  useEffect(() => {
    if (playerAccount && !isTraveling) {
      fetchShipsAtLocation(playerAccount.location);
    } else {
      // Clear ships if player is traveling or no account
      setShips([]);
    }
  }, [playerAccount?.location, isTraveling, gameContract.isReady]);

  // Auto-refresh ships every 60 seconds to reduce RPC load
  useEffect(() => {
    if (!playerAccount || isTraveling) return;
    

    const interval = setInterval(() => {
      fetchShipsAtLocation(playerAccount.location);
    }, 60000); // 60 seconds (reduced from 30 to avoid RPC overload)

    return () => clearInterval(interval);
  }, [playerAccount?.location, isTraveling, gameContract.isReady]);

  // Handle ship interaction (click to select/attack)
  const handleShipClick = (ship: Ship) => {
    setSelectedShip(ship);
    console.log("Selected ship:", ship);
  };

  // Calculate battle damage using same formula as contract
  // Contract formula: uint256 damage = attacker.attack > defender.defense ? attacker.attack - defender.defense : 0;
  const calculateBattleDamage = (attacker: { attack: number; defense: number }, defender: { attack: number; defense: number }) => {
    const damageToDefender = Math.max(0, attacker.attack - defender.defense);
    const damageToAttacker = Math.max(0, defender.attack - attacker.defense);
    return { damageToDefender, damageToAttacker };
  };

  // Handle attack functionality
  const handleAttack = async (targetAddress: string) => {
    if (!gameContract.isReady || !("attackPlayer" in gameContract)) {
      setNotification("⚠️ Game contract not ready");
      return;
    }

    if (!playerAccount || playerAccount.hp === 0) {
      setNotification("⚠️ Your ship is wrecked! Repair before attacking.");
      return;
    }
    if (!playerAccount) {
      setNotification("⚠️ You don't have a ship!");
      return;
    }

    if (!selectedShip) {
      setNotification("⚠️ No target selected!");
      return;
    }

    setIsAttacking(true);

    try {
      setNotification("⚔️ Engaging in combat...");
      
      // Get fresh target ship data to ensure accurate stats
      const targetAccount = await gameContract.getPlayerAccount(targetAddress);
      if (!targetAccount) {
        setNotification("⚠️ Could not get target ship data");
        return;
      }

      // Calculate damage before attack (same formula as contract)
      const attackerStats = {
        attack: Number(playerAccount.attack),
        defense: Number(playerAccount.defense)
      };
      
      const defenderStats = {
        attack: Number(targetAccount[7]), // attack is at index 7
        defense: Number(targetAccount[8]) // defense is at index 8
      };

      const { damageToDefender, damageToAttacker } = calculateBattleDamage(attackerStats, defenderStats);
      
      console.log("Battle Preview:", {
        playerAttack: attackerStats.attack,
        playerDefense: attackerStats.defense,
        enemyAttack: defenderStats.attack,
        enemyDefense: defenderStats.defense,
        damageToEnemy: damageToDefender,
        damageToPlayer: damageToAttacker
      });

      // Execute the attack
      await gameContract.attackPlayer(targetAddress).then(() => {
        setShowBattleScene(true);
      setBattle({
        ship1: playerAccount as PlayerAccount,
        ship2: {
          ...selectedShip,
          // Ensure we have all the updated target stats
          address: targetAddress,
          name: targetAccount[0] || selectedShip.name,
          hp: Number(targetAccount[4]),
          maxHp: Number(targetAccount[5]),
          level: Number(targetAccount[6]) + Number(targetAccount[7]) + Number(targetAccount[8]), // speed + attack + defense
          isPirate: targetAccount[1]
        },
        dmgShip1: damageToAttacker, // Damage player receives
        dmgShip2: damageToDefender // Damage enemy receives
      });
      });

      
      // Show different notification based on damage dealt
      if (damageToDefender > 0 && damageToAttacker > 0) {
        setNotification(`⚔️ Mutual damage! You dealt ${damageToDefender}, received ${damageToAttacker}`);
      } else if (damageToDefender > 0) {
        setNotification(`🎯 You dealt ${damageToDefender} damage!`);
      } else if (damageToAttacker > 0) {
        setNotification(`💥 You received ${damageToAttacker} damage!`);
      } else {
        setNotification("🛡️ Both ships' armor deflected all damage!");
      }
      
      // Close the action panel
      setSelectedShip(null);
      
      // Refresh player data and ships at location
      forceRefresh();
      if (playerAccount) {
        fetchShipsAtLocation(playerAccount.location);
      }
      
      // Additional refresh after delay for blockchain confirmation
      setTimeout(() => {
        forceRefresh();
        if (playerAccount) {
          fetchShipsAtLocation(playerAccount.location);
        }
      }, 3000);
      
    } catch (error) {
      console.error("Attack error:", error);

      // Parse common game rule errors for user-friendly messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let friendlyMessage = '';

      if (errorMessage.includes('Navy cannot attack Navy')) {
        friendlyMessage = '🚫 Navy ships cannot attack fellow Navy! Only pirates can attack anyone.';
      } else if (errorMessage.includes('Same affiliation')) {
        friendlyMessage = '🚫 Cannot attack ships from your own faction!';
      } else if (errorMessage.includes('One ship is wrecked')) {
        friendlyMessage = '🚫 Cannot attack - one of the ships is wrecked!';
      } else if (errorMessage.includes('Cannot attack at ports')) {
        friendlyMessage = '🚫 Cannot attack at ports - ports are safe zones!';
      } else if (errorMessage.includes('Must be same location')) {
        friendlyMessage = '🚫 Ships must be at the same location to battle!';
      } else if (errorMessage.includes('In travel')) {
        friendlyMessage = '🚫 Cannot attack while ships are traveling!';
      } else {
        friendlyMessage = `⚠️ Attack failed: ${errorMessage}`;
      }

      setNotification(friendlyMessage);
    } finally {
      setIsAttacking(false);
    }
  };  
  
  if (!playerAccount) {
    return null;
  }


  // Don't render other players ships if player is traveling
  if (isTraveling && playerAccount) {
    return <MountPlayerShipTraveling isTraveling={isTraveling} ships={ships} />
  }


  // Show loading state
  if (isLoading && ships.length === 0) {
    return (
      <div className="absolute bottom-[40px] left-1/2 transform -translate-x-1/2">
        <div className="ui2 p-4 text-white text-center">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Scanning waters for ships...
        </div>
      </div>
    );
  }

  // Show error state
  if (error && ships.length === 0) {
    return (
      <div className="absolute bottom-[40px] left-1/2 transform -translate-x-1/2">
        <div className="ui2 p-4 text-red-300 text-center">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  // Show empty state
  if (ships.length === 0) {
    return (
      <div className="absolute bottom-[40px] left-1/2 transform -translate-x-1/2">
        <div className="ui2 p-4 text-gray-300 text-center">
          🌊 No other ships in these waters
          <div className="text-sm mt-1">
            Location: Coordinate {playerAccount.location}
            {[25, 55, 89].includes(playerAccount.location) && (
              <span className="text-blue-400 ml-2">⚓ PORT</span>
            )}
          </div>
        </div>
      </div>
    );
  }

    return (<>      {/* Location Info */}
    {playerAccount && <LocationInfo isTraveling={isTraveling} location={playerAccount?.location || 0} ships={ships} />} 
    <div className=" w-screen px-10 absolute bottom-[40px]">
       <div 
         className="grid gap-4 content-start justify-center"
         style={{
           gridTemplateColumns: `repeat(${Math.min(ships.length, 6)}, minmax(0, 1fr))`,
           maxWidth: '1200px',
           margin: '0 auto'
         }}
       >
         {ships.slice(0, 6).map((ship, index) => {
           const isOwnShip = ship.address.toLowerCase() === address?.toLowerCase();
           
           return (
             <div 
               key={`${ship.address}-${index}`} 
               className={`group flex flex-col items-center cursor-pointer relative ${
                 selectedShip?.address === ship.address ? 'scale-105 brightness-125' : ''
               } `}
               onClick={() => handleShipClick(ship)}
             >
                          <RenderShip 
               ship={ship}
             />
             
             
             {/* Own Ship Badge */}
             {isOwnShip && (
               <Image src="/you.webp" unoptimized alt="You" width={90} height={17} className="absolute top-[30px] right-[50%] translate-x-1/2 " />
             )}
               
             {/* Ship Info */}
             <ShipInfoPopup ship={ship} selectedShip={selectedShip} />
           </div>
         );
         })}
       </div>

      {/* Show count if more than 6 ships */}
      {ships.length > 6 && (
        <div className="text-center mt-2">
          <div className="ui2 inline-block px-3 py-1 text-gray-300 text-sm">
            +{ships.length - 6} more ships in the area
          </div>
        </div>
      )}

             {/* Selected Ship Actions */}
       {selectedShip && (
         <div className="fixed bottom-[350px] right-[20px] z-50">
           <div className="ui1 p-6 text-white max-w-xs">
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-bold text-yellow-400">Ship Actions</h3>
               <button 
                 onClick={() => setSelectedShip(null)}
                 className="text-gray-400 hover:text-white"
               >
                 ✕
               </button>
             </div>
             
             <div className="text-sm mb-3">
               <div className="flex items-center gap-2 mb-1">
                 <div className="font-bold">{selectedShip.name}</div>
                 {selectedShip.isPirate !== null && (
                   <Icon iconName={selectedShip.isPirate ? "pirates" : "navy"} />
                 )}
               </div>
               <div className="text-gray-300">
                 {selectedShip.hp !== null && selectedShip.maxHp !== null ? (
                   <>HP: {selectedShip.hp}/{selectedShip.maxHp}</>
                 ) : (
                   <span className="text-gray-400">Loading HP...</span>
                 )}
               </div>
               <div className="text-gray-400 text-xs">
                 {selectedShip.address.slice(0, 8)}...{selectedShip.address.slice(-6)}
               </div>
             </div>

             <div className="space-y-2">
               {selectedShip.address.toLowerCase() === address?.toLowerCase() ? (
                 // Player's own ship - show different options
                 <>
                   <div className="w-full ui2 p-4 text-center text-yellow-400">
                    This is your ship
                   </div>

                 </>
               ) : (
                 // Other player's ship - show attack options
                 <>
                   <button 
                     className="w-full ui1 p-5 text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     onClick={() => handleAttack(selectedShip.address)}
                     disabled={playerAccount?.hp === 0 || isAttacking}
                   >
                     {isAttacking ? (
                       <>
                         <div className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full mr-2"></div>
                         Attacking...
                       </>
                     ) : (
                       '⚔️ ATTACK!'
                     )}
                   </button>
                 </>
               )}
             </div>

             {selectedShip.address.toLowerCase() !== address?.toLowerCase() && playerAccount?.hp === 0 && (
               <div className="text-red-400 text-xs mt-2">
                 ⚠️ Your ship is wrecked! Repair before attacking.
               </div>
             )}
           </div>
         </div>
       )}
     </div>
     
     
           {/* Battle Scene */}
           {battle && (
        <BattleScene
          ship1={{
            address: address || "",
            name: battle.ship1.boatName,
            hp: Number(battle.ship1.hp),
            maxHp: Number(battle.ship1.hp),
            level: Number(battle.ship1.attack) + Number(battle.ship1.defense) + Number(battle.ship1.speed),
            isPirate: battle.ship1.isPirate,
        }}
          ship2={battle.ship2}
          dmgShip1={battle.dmgShip1}
          dmgShip2={battle.dmgShip2}
        onClose={() => {
          setShowBattleScene(false);
          setBattle(null);
          setSelectedShip(null);
        }}
          isOpen={showBattleScene}
        />
      )}
     </>
  );
};