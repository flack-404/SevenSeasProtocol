"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useGameContract } from "../libs/hooks/useGameContract";
import { usePlayer } from "../libs/providers/player-provider";
import { useThirdweb } from "../libs/hooks/useThirdweb";
import { Icon } from "./Icons";

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankedPlayer {
  address: string;
  level: number;
  rank: number;
  account?: {
    boatName: string;
    isPirate: boolean;
    hp: number;
    maxHp: number;
    location: number;
  };
}

export function RankingModal({ isOpen, onClose }: RankingModalProps) {
  const gameContract = useGameContract();
  const { playerAccount } = usePlayer();
  const { address: currentAddress } = useThirdweb();
  
  const [rankedPlayers, setRankedPlayers] = useState<RankedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerRank, setCurrentPlayerRank] = useState<number | null>(null);

  const fetchRanking = async () => {
    if (!gameContract.isReady || !('getTopPlayers' in gameContract)) {
      setError('Game contract not ready');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get top 50 players
      const rankingData = await gameContract.getTopPlayers(50);
      
      if (rankingData && rankingData.length >= 2) {
        const [addresses, levels] = rankingData;
        
        // Create ranked players array
        const players: RankedPlayer[] = addresses.map((address: string, index: number) => ({
          address,
          level: Number(levels[index]),
          rank: index + 1,
        }));

        // Filter out players with 0 level (empty accounts)
        const validPlayers = players.filter(player => player.level > 0);

        setRankedPlayers(validPlayers);

        // Find current player's rank
        if (currentAddress) {
          const currentPlayerIndex = validPlayers.findIndex(
            player => player.address.toLowerCase() === currentAddress.toLowerCase()
          );
          setCurrentPlayerRank(currentPlayerIndex >= 0 ? currentPlayerIndex + 1 : null);
        }

        // Fetch account details for top players
        await fetchPlayerDetails(validPlayers.slice(0, 10)); // Only fetch details for top 10
      } else {
        setRankedPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
      setError('Failed to load ranking');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlayerDetails = async (players: RankedPlayer[]) => {
    if (!gameContract.isReady || !('getPlayerAccount' in gameContract)) {
      return;
    }

    try {
      const BATCH_SIZE = 3; // Process 3 players at a time to avoid RPC batch size limits
      const playersWithDetails: any[] = [];

      // Process players in batches
      for (let i = 0; i < players.length; i += BATCH_SIZE) {
        const batch = players.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (player) => {
            try {
              const account = await gameContract.getPlayerAccount(player.address);
              return {
                ...player,
                account: {
                  boatName: account[0] || 'Unknown Ship',
                  isPirate: account[1],
                  hp: Number(account[4]),
                  maxHp: Number(account[5]),
                  location: Number(account[11]),
                },
              };
            } catch (error) {
              console.error(`Error fetching account for ${player.address}:`, error);
              return player;
            }
          })
        );

        playersWithDetails.push(...batchResults);

        // Small delay between batches to avoid overwhelming the RPC
        if (i + BATCH_SIZE < players.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setRankedPlayers(prev => 
        prev.map(player => {
          const playerWithDetails = playersWithDetails.find(p => p.address === player.address);
          return playerWithDetails || player;
        })
      );
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  };

  useEffect(() => {
    if (isOpen && gameContract.isReady) {
      fetchRanking();
    }
  }, [isOpen, gameContract.isReady]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getHPColor = (hp: number, maxHp: number) => {
    if (hp === 0) return 'text-red-600';
    const percentage = hp / maxHp;
    if (percentage > 0.5) return 'text-green-400';
    if (percentage > 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal 
      open={isOpen} 
      setOpen={handleClose}
      title="⚔️ Leaderboard"
    >
      <div className="w-full max-w-4xl mx-auto p-6">
        {/* Current Player Rank */}
        {currentPlayerRank && playerAccount && (
          <div className="mb-6 ui2 p-4">
            <div className="text-center">
              <div className="text-white font-bold text-lg mb-2">Your Ranking</div>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon iconName={playerAccount.isPirate ? "pirates" : "navy"} />
                  <span className="text-white font-bold">{playerAccount.boatName}</span>
                </div>
                <div className="text-yellow-400 font-bold text-xl">
                  Rank #{currentPlayerRank}
                </div>
                <div className="text-gray-300">
                  Level {playerAccount.attack + playerAccount.defense + playerAccount.speed}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Players List */}
        <div className="mb-4">
          <div className="text-white font-bold text-lg mb-3 text-center">
            🏆 Top Captains
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400">{error}</div>
              <button 
                onClick={fetchRanking}
                className="mt-2 text-blue-400 hover:text-blue-300"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rankedPlayers.slice(0, 20).map((player) => {
                const isCurrentPlayer = player.address.toLowerCase() === currentAddress?.toLowerCase();
                
                return (
                  <div
                    key={player.address}
                    className={`ui2 p-4 flex items-center justify-between transition-all ${
                      isCurrentPlayer 
                        ? 'filter !brightness-125' 
                        : 'hover:brightness-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="text-white font-bold text-xl w-12 text-center">
                        {getRankIcon(player.rank)}
                      </div>

                      {/* Player Info */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {player.account && (
                            <Icon iconName={player.account.isPirate ? "pirates" : "navy"} />
                          )}
                          <span className="text-white font-bold">
                            {player.account?.boatName || 'Unknown Ship'}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-yellow-400 text-sm font-bold">(You)</span>
                          )}
                        </div>
                        
                        
                        {/* Address */}
                        <div className="text-gray-500 text-xs">
                          {player.address.slice(0, 8)}...{player.address.slice(-6)}
                        </div>
                      </div>
                    </div>

                    {/* Level */}
                    <div className="text-right">
                      <div className="text-white font-bold text-lg">
                        Level {player.level}
                      </div>
                      {player.rank <= 3 && (
                        <div className="text-green-400 text-xs">
                          Diamond Reward Tier
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {rankedPlayers.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-400">
                  No players found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reward Info */}
        <div className="mt-6 ui1 p-6">
          <div className="text-white font-bold text-sm mb-2">💎 Diamond Purchase Rewards</div>
          <div className="text-gray-300 text-xs space-y-1">
            <div>🥇 Rank #1: 4 MNT per diamond purchase</div>
            <div>🥈 Rank #2: 2 MNT per diamond purchase</div>
            <div>🥉 Rank #3: 1 MNT per diamond purchase</div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={fetchRanking}
            disabled={isLoading}
            className="ui2 p-6 text-white hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : '🔄 Refresh Rankings'}
          </button>
        </div>
      </div>
    </Modal>
  );
} 