"use client";

import { useState } from "react";
import { useGameContract } from "../libs/hooks/useGameContract";
import { usePlayer } from "../libs/providers/player-provider";
import { Modal } from "./Modal";
import Button from "./Button";
import { Icon } from "./Icons";
import Image from "next/image";

interface DiamondPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiamondPackage {
  name: string;
  cost: number;
  diamonds: number;
}

export const DiamondPurchaseModal = ({ isOpen, onClose }: DiamondPurchaseModalProps) => {
  const gameContract = useGameContract();
  const { refreshPlayerData, setNotification } = usePlayer();
  const [isPurchasing, setPurchasing] = useState<string | null>(null);

  const diamondPackages: DiamondPackage[] = (gameContract.isReady && 'GAME_CONSTANTS' in gameContract) 
    ? gameContract.GAME_CONSTANTS.DIAMOND_PACKAGES 
    : [
        { name: 'Small', cost: 10, diamonds: 1 },
        { name: 'Medium', cost: 45, diamonds: 5 },
        { name: 'Large', cost: 90, diamonds: 10 },
      ];

  const handlePurchase = async (packageType: 'small' | 'medium' | 'large') => {
    if (!gameContract.isReady || !("buyDiamonds" in gameContract)) {
      setNotification("❌ Game not ready");
      return;
    }

    const packageInfo = diamondPackages.find((pkg: DiamondPackage) => 
      pkg.name.toLowerCase() === packageType
    );

    if (!packageInfo) {
      setNotification("❌ Package not found");
      return;
    }

    setPurchasing(packageType);
    try {
      setNotification(`💎 Purchasing ${packageInfo.name} Diamond Package...`);
      
      await gameContract.buyDiamonds(packageType);
      
      // Refresh player data to show updated diamonds
      await refreshPlayerData();
      
      setNotification(`✅ ${packageInfo.name} Diamond Package purchased! +${packageInfo.diamonds} 💎`);
      
      console.log(`Diamond package purchased: ${packageType}, Cost: ${packageInfo.cost} MNT, Diamonds: ${packageInfo.diamonds}`);
      
      // Close modal after successful purchase
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error("Error purchasing diamonds:", error);
      
      if (error.message?.includes("insufficient funds")) {
        setNotification("❌ Insufficient MNT balance");
      } else if (error.message?.includes("user rejected")) {
        setNotification("❌ Transaction cancelled");
      } else {
        setNotification("❌ Failed to purchase diamonds");
      }
    } finally {
      setPurchasing(null);
    }
  };

  const getValuePercentage = (packageType: 'small' | 'medium' | 'large') => {
    const baseRatio = 10; // 10 MNT per diamond for small package
    const pkg = diamondPackages.find((p: DiamondPackage) => p.name.toLowerCase() === packageType);
    if (!pkg) return 0;
    
    const currentRatio = pkg.cost / pkg.diamonds;
    const savings = ((baseRatio - currentRatio) / baseRatio) * 100;
    return Math.round(savings);
  };

  const getBestValuePackage = (): DiamondPackage => {
    return diamondPackages.reduce((best: DiamondPackage, current: DiamondPackage) => {
      const bestRatio = best.cost / best.diamonds;
      const currentRatio = current.cost / current.diamonds;
      return currentRatio < bestRatio ? current : best;
    });
  };

  const bestValue = getBestValuePackage();

  return (
    <Modal
    className="!max-w-[800px] !w-full !min-w-[700px] !p-0"
    containerClassName="!max-w-[800px] !w-full !min-w-[700px] !p-0"
    dialogClassName="!max-w-[800px] !w-full !min-w-[700px] !p-0"
    open={isOpen} setOpen={(open) => !open && onClose()}>
      <div className="flex flex-col items-center gap-6 pb-6 px-12 ">
        <div className="flex items-center gap-3">
          <Icon iconName="diamond" className="w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Purchase Diamonds</h2>
        </div>
        
        <div className="text-center text-gray-300">
          <p>Diamonds are premium currency used for:</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Instant ship repairs</li>
            <li>• Fast travel between locations</li>
          </ul>
        </div>

        <div className="flex flex-col gap-4 w-full">
          {diamondPackages.map((pkg: DiamondPackage) => {
            const packageType = pkg.name.toLowerCase() as 'small' | 'medium' | 'large';
            const savings = getValuePercentage(packageType);
            const isBestValue = pkg.name === bestValue.name;
            const isProcessing = isPurchasing === packageType;
            
            return (
              <div
                key={pkg.name}
                className={`ui2 relative flex items-center justify-between p-4 rounded-lg  transition-all ${
                  isBestValue 
                    ? '!brightness-140' 
                    : ''
                } ${isProcessing ? 'opacity-50' : 'hover:border-blue-400'}`}
              >
                {isBestValue && (
                  <div className="ui2 absolute px-5 py-3 -top-2 left-4 bg-yellow-500 text-white text-xs font-bold">
                    BEST VALUE
                  </div>
                )}
                
                <div className="flex items-center gap-3 w-full min-w-[300px]">
                  <div className="flex items-center gap-2">
                    <Image unoptimized src={`/icons/${pkg.diamonds}_diamond.gif`} alt="Diamond" width={128} height={128} />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-white font-semibold">{pkg.name} Package</span>
                    <span className="text-white font-bold text-lg">{pkg.diamonds} Diamond{pkg.diamonds > 1 ? 's' : ''}</span>

                    {savings > 0 && (
                      <span className="text-green-400 text-xs">Save {savings}%</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col min-w-[200px] items-center gap-3">
                  <div className="text-right">
                    <div className="text-white font-bold">{pkg.cost} MNT</div>
                    <div className="text-gray-400 text-xs">
                      {(pkg.cost / pkg.diamonds).toFixed(1)} MNT per diamond
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePurchase(packageType)}
                    disabled={isProcessing || isPurchasing !== null}
                    className={`${isBestValue ? 'bg-yellow-600 hover:bg-yellow-700' : ''} min-w-[80px] w-full`}
                  >
                    {isProcessing ? "Buying..." : "Buy"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-xs text-gray-400 max-w-sm">
          <p>
            💡 Diamonds are purchased with MNT (Mantle). Make sure you have sufficient MNT balance in your wallet.
          </p>
        </div>

        <Button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700">
          Close
        </Button>
      </div>
    </Modal>
  );
}; 