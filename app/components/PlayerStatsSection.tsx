import { useState, useEffect } from "react";
import { usePlayer } from "../libs/providers/player-provider";
import { Icon } from "./Icons";
import { AnimatedGoldCounter } from "./AnimatedGoldCounter";
import { DiamondPurchaseModal } from "./DiamondPurchaseModal";
import Button from "./Button";
import { useGameContract } from "../libs/hooks/useGameContract";
import { useActiveAccount } from "thirdweb/react";

export const PlayerStatsSection = ({setShowDiamondModal}: {setShowDiamondModal: (show: boolean) => void}) => {
  const {
    playerAccount,
    isRefreshing,
    lastUpdated,
    refreshPlayerData,
    setNotification,
  } = usePlayer();

  const account = useActiveAccount();
  const gameContract = useGameContract();
  const [isClaimingGPM, setIsClaimingGPM] = useState(false);

  // Debug logging for component re-renders
  useEffect(() => {
    if (playerAccount) {
      console.log("PlayerStatsSection re-rendered with stats:", {
        gpm: playerAccount.gpm,
        gold: playerAccount.gold,
        diamonds: playerAccount.diamonds,
      });
    }
  }, [playerAccount?.gpm, playerAccount?.gold, playerAccount?.diamonds]);

  // Calculate unclaimed GPM gold
  const calculateUnclaimedGPM = () => {
    if (!playerAccount || playerAccount.gpm === 0 || playerAccount.hp === 0) {
      return 0;
    }

    const now = Date.now() / 1000;
    const lastClaim = playerAccount.lastGPMClaim;
    const timeElapsed = now - lastClaim;
    const goldPerSecond = playerAccount.gpm / 60;
    const accumulatedGold = goldPerSecond * timeElapsed;

    return Math.floor(accumulatedGold);
  };

  const unclaimedGPM = calculateUnclaimedGPM();
  const actualGold = playerAccount?.gold || 0;

  const handleClaimGPM = async () => {
    if (!playerAccount || !gameContract.claimGPM || !account?.address) return;

    setIsClaimingGPM(true);
    try {
      const claimable = await gameContract.getClaimableGold(account.address);

      if (Number(claimable) === 0) {
        setNotification("⏰ No GPM to claim yet. Keep playing to earn more!");
        setIsClaimingGPM(false);
        return;
      }

      await gameContract.claimGPM();
      setNotification(`✅ Claimed ${Number(claimable)} gold from GPM!`);

      setTimeout(async () => {
        await refreshPlayerData();
        setIsClaimingGPM(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error claiming GPM:", error);
      setNotification("❌ Failed to claim GPM: " + (error.message || "Unknown error"));
      setIsClaimingGPM(false);
    }
  };

  const level =
    (playerAccount?.speed || 0) +
    (playerAccount?.attack || 0) +
    (playerAccount?.defense || 0);

  return (
    <>
    <section className="flex w-full justify-end md:absolute md:top-0 md:right-0">

      <div className="ui4 p-5 text-white !text-lg">
        GPM: <span className="text-yellow-400 !text-lg">{playerAccount?.gpm || 0}</span>
      </div>
      <div className="ui4 p-5 text-white flex items-center gap-2 !text-lg">
        <Icon iconName="gold" />
        <span className="!text-lg md:flex hidden ">Gold:</span>
        <span className="text-white font-bold">{actualGold.toLocaleString()}</span>
        {unclaimedGPM > 0 && (
          <>
            <span className="text-gray-400">+</span>
            <span className="text-green-400 font-bold animate-pulse">{unclaimedGPM.toLocaleString()}</span>
          </>
        )}
        <button
          className="!h-[20px] !w-[50px] bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-600 flex items-center justify-center !text-[10px] !text-white transition-colors duration-200 font-bold ml-1"
          onClick={handleClaimGPM}
          disabled={isClaimingGPM || unclaimedGPM === 0}
          title={unclaimedGPM > 0 ? `Claim ${unclaimedGPM} unclaimed GPM gold` : "No GPM to claim"}
        >
          {isClaimingGPM ? "..." : "CLAIM"}
        </button>
      </div>
      <div className="ui4 p-5 text-white flex items-center gap-2 !text-lg">
        <Icon iconName="diamond" />
        <span className="!text-lg md:flex hidden ">Diamonds:</span> {playerAccount?.diamonds}
        <button 
          className="!h-[20px] !w-[20px] bg-green-700 hover:bg-green-600 flex items-center justify-center !text-xl !text-white transition-colors duration-200" 
          onClick={() => setShowDiamondModal(true)}
          title="Purchase Diamonds"
        >
          +
        </button>
      </div>
    </section>


</>
  );
};
