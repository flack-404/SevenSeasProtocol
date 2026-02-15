"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "../libs/providers/player-provider";
import { useGameContract } from "../libs/hooks/useGameContract";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import Button from "./Button";
import { Icon } from "./Icons";
import { RankingModal } from "./RankingModal";

export const RankingSection = () => {
  const { playerAccount } = usePlayer();
  const gameContract = useGameContract();
  const { address: currentAddress } = useThirdweb();
  
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [currentPlayerRank, setCurrentPlayerRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlayerRank = async () => {
    if (!gameContract.isReady || !('getTopPlayers' in gameContract) || !currentAddress) {
      return;
    }

    setIsLoading(true);
    try {
      // Get top 50 players to find current player's rank
      const rankingData = await gameContract.getTopPlayers(50);
      
      if (rankingData && rankingData.length >= 2) {
        const [addresses, levels] = rankingData;
        
        // Filter out players with 0 level
        const validPlayers = addresses
          .map((address: string, index: number) => ({
            address,
            level: Number(levels[index]),
            rank: index + 1,
          }))
          .filter(player => player.level > 0);

        setTotalPlayers(validPlayers.length);

        // Find current player's rank
        const currentPlayerIndex = validPlayers.findIndex(
          player => player.address.toLowerCase() === currentAddress.toLowerCase()
        );
        
        setCurrentPlayerRank(currentPlayerIndex >= 0 ? currentPlayerIndex + 1 : null);
      }
    } catch (error) {
      console.error('Error fetching player rank:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch rank when component mounts or when player account changes
  useEffect(() => {
    if (gameContract.isReady && currentAddress && playerAccount) {
      fetchPlayerRank();
    }
  }, [gameContract.isReady, currentAddress, playerAccount]);

  const handleOpenRanking = () => {
    setShowRankingModal(true);
  };

  const handleCloseRanking = () => {
    setShowRankingModal(false);
  };

  const getRankDisplay = () => {
    if (isLoading) return "Loading...";
    if (currentPlayerRank === null) return "Unranked";
    if (currentPlayerRank <= 3) {
      const medals = ["🥇", "🥈", "🥉"];
      return `${medals[currentPlayerRank - 1]} #${currentPlayerRank}`;
    }
    return `#${currentPlayerRank}`;
  };

  const getRankColor = () => {
    if (currentPlayerRank === null) return "text-gray-400";
    if (currentPlayerRank === 1) return "text-yellow-400";
    if (currentPlayerRank === 2) return "text-gray-300";
    if (currentPlayerRank === 3) return "text-amber-600";
    return "text-white";
  };

  return playerAccount && (<>
      <div className="backdrop-blur-sm ui2 flex flex-col items-center gap-2 p-4 fixed top-[210px] right-[35px]">
        
          <button
            onClick={handleOpenRanking}
            className=" flex flex-col items-center justify-center min-w-[120px]"
          >
            <div className="text-yellow-400 font-bold">🏆 Ranking</div>
            <div className="flex items-center justify-center gap-1">
              <span className={getRankDisplay() !== "Unranked" ? getRankColor() : "text-gray-400"}>
                {getRankDisplay()}
              </span>
              {totalPlayers > 0 && (
                <span className="text-gray-300 text-sm">
                  /{totalPlayers}
                </span>
              )}
            </div>
          </button>
       
      </div>

      <RankingModal
        isOpen={showRankingModal}
        onClose={handleCloseRanking}
      />
    </>
  );
}; 