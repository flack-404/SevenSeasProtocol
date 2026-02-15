"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";

interface RepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepairSuccess: () => void;
  playerAccount: any;
}

interface RepairOption {
  type: number;
  name: string;
  description: string;
  cost: string;
  waitTime: string;
  crewRecovery: string;
}

export const RepairModal = ({ isOpen, onClose, onRepairSuccess, playerAccount }: RepairModalProps) => {
  const gameContract = useGameContract();
  const [isLoading, setIsLoading] = useState(false);
  const [repairOptions, setRepairOptions] = useState<{
    costs: bigint[];
    waitTimes: bigint[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if contract functions are available
  const repairShip = 'repairShip' in gameContract ? gameContract.repairShip : null;
  const getRepairOptions = 'getRepairOptions' in gameContract ? gameContract.getRepairOptions : null;
  const completeRepair = 'completeRepair' in gameContract ? gameContract.completeRepair : null;

  // Load repair options when modal opens
  useEffect(() => {
    if (isOpen && playerAccount && getRepairOptions) {
      loadRepairOptions();
    }
  }, [isOpen, playerAccount, getRepairOptions]);

  const loadRepairOptions = async () => {
    try {
      if (!getRepairOptions) return;
      
      const options = await getRepairOptions();
      // Convert readonly arrays to regular arrays
      setRepairOptions({
        costs: [...options[0]],
        waitTimes: [...options[1]]
      });
    } catch (error) {
      console.error("Failed to load repair options:", error);
      setError("Failed to load repair options");
    }
  };

  const formatTime = (seconds: bigint): string => {
    const totalSeconds = Number(seconds);
    if (totalSeconds === 0) return "Instant";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatCost = (cost: bigint, isGold: boolean): string => {
    if (cost === 0n) return "Free";
    if (isGold) return `${cost.toString()} Gold`;
    return `${cost.toString()} Diamond`;
  };

  const getRepairOptionData = (): RepairOption[] => {
    if (!repairOptions) return [];

    return [
      {
        type: 0, // FREE
        name: "Free Repair",
        description: "Wait it out - your crew works hard to patch things up",
        cost: formatCost(repairOptions.costs[0], true),
        waitTime: formatTime(repairOptions.waitTimes[0]),
        crewRecovery: "50% of max crew"
      },
      {
        type: 1, // GOLD
        name: "Gold Repair",
        description: "Hire professional shipwrights for faster repairs",
        cost: formatCost(repairOptions.costs[1], true),
        waitTime: formatTime(repairOptions.waitTimes[1]),
        crewRecovery: "100% of max crew"
      },
      {
        type: 2, // DIAMOND
        name: "Diamond Repair",
        description: "Magical restoration - instantly back to perfect condition",
        cost: formatCost(repairOptions.costs[2], false),
        waitTime: formatTime(repairOptions.waitTimes[2]),
        crewRecovery: "100% of max crew"
      }
    ];
  };

  const canAfford = (optionType: number): boolean => {
    if (!repairOptions || !playerAccount) return false;

    if (optionType === 0) return true; // Free is always affordable
    if (optionType === 1) {
      return BigInt(playerAccount.gold) >= repairOptions.costs[1];
    }
    if (optionType === 2) {
      return BigInt(playerAccount.diamonds) >= repairOptions.costs[2];
    }
    return false;
  };

  const handleRepair = async (repairType: number) => {
    if (!repairShip) return;

    setIsLoading(true);
    setError(null);

    try {
      const tx = await repairShip(repairType);
      console.log("Repair transaction:", tx);
      
      // If it's a diamond repair (instant), also complete it
      if (repairType === 2 && completeRepair) {
        await completeRepair();
      }
      
      onRepairSuccess();
      onClose();
    } catch (error: any) {
      console.error("Repair failed:", error);
      setError(error.message || "Repair failed");
    } finally {
      setIsLoading(false);
    }
  };

  const options = getRepairOptionData();

  return (
    <Modal
      open={isOpen}
      setOpen={onClose}
      title="Repair Your Ship"
    >
      <div className="p-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Your ship has been wrecked!
          </h2>
          <p className="text-gray-300">
            Choose how you want to repair your vessel and get back on the seas.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-1">
          {options.map((option, index) => {
            const affordable = canAfford(option.type);
            
            return (
              <div
                key={option.type}
                className={`ui2 p-6  transition-all duration-200 ${
                  affordable 
                    ? '' 
                    : 'opacity-75'
                }`}
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {option.name}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    {option.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cost:</span>
                      <span className={`font-semibold ${affordable ? 'text-green-400' : 'text-red-400'}`}>
                        {option.cost}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wait Time:</span>
                      <span className="text-white font-semibold">
                        {option.waitTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Crew Recovery:</span>
                      <span className="text-blue-400 font-semibold">
                        {option.crewRecovery}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRepair(option.type)}
                    disabled={!affordable || isLoading}
                    variant={affordable ? "primary" : "secondary"}
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : 
                     !affordable ? "Can't Afford" : 
                     `Choose ${option.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Your ship has been moved to the nearest port for repairs.
          </p>
        </div>
      </div>
    </Modal>
  );
}; 