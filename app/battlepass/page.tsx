"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '../libs/providers/player-provider';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { prepareContractCall } from 'thirdweb';
import {
  usePlayerBattlePass,
  useUnclaimedRewards,
  useTokenBalance,
  useBattlePassTransaction,
  useContractInstances,
} from '../libs/hooks/useContracts';
import { useReadContract } from 'thirdweb/react';
import Button from '../components/Button';
import { formatEther } from 'viem';

/**
 * Battle Pass Page - View progress, upgrade to premium, claim rewards
 * Matches pirate theme from existing UI
 */
export default function BattlePassPage() {
  const router = useRouter();
  const { playerAccount, isLoading: playerLoading, error: playerError, refreshPlayerData } = usePlayer();
  const activeAccount = useActiveAccount();
  const address = activeAccount?.address;
  const isConnected = !!activeAccount;
  const { passData, seasonInfo, hasActivePass, refetch: refetchPass } = usePlayerBattlePass();
  const { levels: unclaimedLevels, totalGold, totalDiamonds, totalArmada, refetch: refetchRewards } = useUnclaimedRewards();
  const { balance: armadaBalance } = useTokenBalance();
  const { battlePassContract } = useContractInstances();

  // Use sendTransaction directly
  const { mutate: sendTransaction, isPending, isSuccess, isError, error: txError } = useSendTransaction();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [lastAction, setLastAction] = useState<'createPass' | 'upgrade' | 'claim' | null>(null);

  const currentLevel = passData ? Number(passData[1]) : 0;
  const currentXP = passData ? Number(passData[2]) : 0;
  const isPremium = passData ? passData[3] : false;
  const currentSeason = passData ? Number(passData[0]) : 0;

  // If we have a pass but passData is undefined, we need to fetch it differently
  // For now, show a loading state
  const isPassDataLoading = hasActivePass && !passData;

  // Calculate XP needed for next level
  const xpForNextLevel = (currentLevel + 1) * 100;
  const xpProgress = currentXP % 100;
  const xpProgressPercent = (xpProgress / 100) * 100;

  // Monitor transaction state
  useEffect(() => {
    if (isPending) {
      console.log('Transaction pending...');
    }
  }, [isPending]);

  const handleCreatePass = () => {
    setError('');
    setSuccess('');
    setLastAction('createPass');
    console.log('Preparing Battle Pass transaction...');

    try {
      const transaction = prepareContractCall({
        contract: battlePassContract,
        method: 'function createPass()',
        params: [],
      });

      console.log('Transaction prepared:', transaction);
      console.log('Calling sendTransaction...');

      sendTransaction(transaction);
      console.log('sendTransaction called');
    } catch (err) {
      console.error('Error preparing/sending transaction:', err);
      setError('Failed to initiate transaction: ' + (err as Error).message);
    }
  };

  const handleUpgradeToPremium = () => {
    if (armadaBalance < 100n * BigInt(1e18)) {
      setError('You need 100 ARMADA tokens to upgrade');
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('upgrade');

    try {
      const transaction = prepareContractCall({
        contract: battlePassContract,
        method: 'function upgradeToPremium()',
        params: [],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to upgrade: ' + (err as Error).message);
    }
  };

  const handleClaimLevel = (level: number) => {
    setError('');
    setSuccess('');
    setLastAction('claim');

    try {
      const transaction = prepareContractCall({
        contract: battlePassContract,
        method: 'function claimReward(uint256 level)',
        params: [BigInt(level)],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to claim: ' + (err as Error).message);
    }
  };

  const handleClaimMultiple = () => {
    if (selectedLevels.length === 0) {
      setError('No levels selected');
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('claim');

    try {
      const transaction = prepareContractCall({
        contract: battlePassContract,
        method: 'function claimMultipleRewards(uint256[] memory levels)',
        params: [selectedLevels.map(l => BigInt(l))],
      });

      sendTransaction(transaction);
      setSelectedLevels([]);
    } catch (err) {
      setError('Failed to claim: ' + (err as Error).message);
    }
  };

  const toggleLevelSelection = (level: number) => {
    if (selectedLevels.includes(level)) {
      setSelectedLevels(selectedLevels.filter(l => l !== level));
    } else {
      setSelectedLevels([...selectedLevels, level]);
    }
  };

  // Watch for transaction success
  useEffect(() => {
    if (isSuccess && lastAction) {
      console.log('Transaction succeeded, lastAction:', lastAction);

      if (lastAction === 'createPass') {
        setSuccess('Battle Pass created! Refreshing data...');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchPass();
          await refetchRewards();
          setSuccess('Battle Pass created! Start earning XP! 🎖️');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'upgrade') {
        setSuccess('Upgraded to Premium! Refreshing...');
        setTimeout(async () => {
          await refetchPass();
          await refetchRewards();
          setSuccess('Upgraded to Premium! Claim all rewards now! 🎉');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'claim') {
        setSuccess('Rewards claimed! Refreshing...');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchRewards();
          setSuccess('Rewards claimed! 🪙');
          setLastAction(null);
        }, 2000);
      }
    }
  }, [isSuccess]);

  // Watch for transaction errors
  useEffect(() => {
    if (isError && lastAction) {
      console.log('Transaction failed:', txError);
      setError(txError?.message || 'Transaction failed');
      setLastAction(null);
    }
  }, [isError]);

  // Debug logging
  useEffect(() => {
    console.log('Battle Pass Full Debug:');
    console.log('- playerAccount:', playerAccount ? 'EXISTS' : 'NULL');
    console.log('- boatName:', playerAccount?.boatName);
    console.log('- hasActivePass:', hasActivePass);
    console.log('- passData:', passData);
    if (passData) {
      console.log('  - season:', passData[0]?.toString());
      console.log('  - level:', passData[1]?.toString());
      console.log('  - xp:', passData[2]?.toString());
    }
  });  // Run on every render to catch changes

  // Just wait for loading to finish - no wallet check needed
  if (playerLoading || !playerAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/sea-bg.jpg')] bg-cover">
        <div className="ui1 p-8 text-white text-center">
          <p>Loading Battle Pass...</p>
        </div>
      </div>
    );
  }

  // If we know there's a pass but can't read the data yet
  if (isPassDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/sea-bg.jpg')] bg-cover">
        <div className="ui1 p-8 text-white text-center">
          <p>Loading Battle Pass data...</p>
          <p className="text-sm text-gray-400 mt-2">Reading from contract...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[url('/sea-bg.jpg')] bg-cover p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="ui1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#fbc988] mb-2">🎖️ Battle Pass</h1>
              <p className="text-gray-300">Complete challenges and earn legendary rewards</p>
            </div>
            <Button variant="secondary" onClick={() => router.push('/')}>
              ← Back to Sea
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="ui2 p-4 border-2 border-red-500">
            <p className="text-red-300">⚠️ {error}</p>
          </div>
        )}
        {success && (
          <div className="ui2 p-4 border-2 border-green-500">
            <p className="text-green-300">✅ {success}</p>
          </div>
        )}

        {/* No Pass - Create */}
        {!hasActivePass && (
          <div className="ui1 p-6 text-center">
            <h2 className="text-2xl font-bold text-[#fbc988] mb-4">Create Your Battle Pass</h2>
            <p className="text-gray-300 mb-6">
              Start your journey through 100 levels of rewards!<br />
              Earn XP from battles, check-ins, and claiming GPM.
            </p>
            <Button variant="primary" onClick={handleCreatePass} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Battle Pass (FREE)'}
            </Button>
          </div>
        )}

        {/* Has Pass - Show Progress */}
        {hasActivePass && passData && (
          <>
            {/* Current Progress */}
            <div className="ui1 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[#fbc988]">Your Progress</h2>
                <div className="text-sm">
                  <span className="text-gray-300">Season {currentSeason}</span>
                  {isPremium && <span className="ml-3 bg-yellow-500 text-black px-3 py-1 rounded font-bold">⭐ PREMIUM</span>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Level & XP */}
                <div className="ui2 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Level</span>
                    <span className="text-3xl font-bold text-purple-400">{currentLevel}</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{xpProgress} XP</span>
                      <span>{xpForNextLevel} XP</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${xpProgressPercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {100 - xpProgress} XP to next level
                  </p>
                </div>

                {/* Unclaimed Rewards */}
                <div className="ui2 p-4">
                  <h3 className="text-sm text-gray-300 mb-2">Unclaimed Rewards</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">🪙 Gold: <span className="text-yellow-400 font-bold">{totalGold.toString()}</span></p>
                    <p className="text-gray-300">💎 Diamonds: <span className="text-cyan-400 font-bold">{totalDiamonds.toString()}</span></p>
                    <p className="text-gray-300">🎖️ ARMADA: <span className="text-orange-400 font-bold">{formatEther(totalArmada)}</span></p>
                  </div>
                  {unclaimedLevels.length > 0 && (
                    <p className="text-xs text-purple-300 mt-2">
                      {unclaimedLevels.length} levels ready to claim!
                    </p>
                  )}
                </div>
              </div>

              {/* Upgrade to Premium */}
              {!isPremium && (
                <div className="mt-4 ui2 p-4 border-2 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-yellow-400">⭐ Upgrade to Premium</h3>
                      <p className="text-sm text-gray-300">
                        Get 50% more rewards on all levels! Retroactive for past levels too!
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleUpgradeToPremium}
                      disabled={isPending}
                    >
                      Upgrade (100 ARMADA)
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Your balance: {parseFloat(formatEther(armadaBalance)).toFixed(0)} ARMADA
                  </p>
                </div>
              )}

              {/* Claim All Button */}
              {unclaimedLevels.length > 0 && (
                <div className="mt-4">
                  <Button
                    variant="primary"
                    onClick={handleClaimMultiple}
                    disabled={isPending || selectedLevels.length === 0}
                    className="w-full"
                  >
                    Claim Selected ({selectedLevels.length}) Rewards
                  </Button>
                </div>
              )}
            </div>

            {/* Rewards Grid */}
            <div className="ui1 p-6">
              <h2 className="text-2xl font-bold text-[#fbc988] mb-4">📜 Reward Tiers (Levels 0-99)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto">
                {Array.from({ length: 100 }, (_, i) => i).map((level) => {
                  // Level 0 has no rewards (starting level)
                  const hasRewards = level >= 1;
                  const isUnlocked = level <= currentLevel;
                  const isClaimed = !unclaimedLevels.map(l => Number(l)).includes(level);
                  const isClaimable = hasRewards && isUnlocked && !isClaimed;
                  const isSelected = selectedLevels.includes(level);

                  // Calculate rewards based on level (matches contract logic)
                  let baseGold = 0;
                  let baseDiamonds = 0;
                  let baseArmada = 0;

                  if (level >= 1 && level <= 20) {
                    baseGold = 10 * level;
                    baseDiamonds = 0;
                    baseArmada = 1;
                  } else if (level >= 21 && level <= 50) {
                    baseGold = 20 * level;
                    baseDiamonds = level % 10 === 0 ? 1 : 0;
                    baseArmada = 2;
                  } else if (level >= 51 && level <= 80) {
                    baseGold = 30 * level;
                    baseDiamonds = level % 5 === 0 ? 1 : 0;
                    baseArmada = 3;
                  } else if (level >= 81) {
                    baseGold = 50 * level;
                    baseDiamonds = 2;
                    baseArmada = 5;
                  }

                  const gold = isPremium ? Math.floor(baseGold * 1.5) : baseGold;
                  const diamonds = isPremium ? Math.floor(baseDiamonds * 1.5) : baseDiamonds;
                  const armada = isPremium ? Math.floor(baseArmada * 1.5) : baseArmada;

                  return (
                    <div
                      key={level}
                      className={`ui2 p-3 text-center transition-all ${
                        !isUnlocked ? 'opacity-40' : ''
                      } ${
                        isClaimed && hasRewards ? 'bg-green-900/20' : ''
                      } ${
                        isSelected ? 'border-2 border-yellow-400 scale-105' : ''
                      } ${
                        isClaimable ? 'hover:scale-105 cursor-pointer' : level === 0 ? 'cursor-default' : 'cursor-not-allowed'
                      }`}
                      onClick={() => isClaimable && toggleLevelSelection(level)}
                    >
                      <div className="text-lg font-bold text-white mb-1">
                        Lvl {level}
                      </div>
                      {level === 0 ? (
                        <div className="text-xs text-gray-400 py-2">
                          Starting Level
                        </div>
                      ) : (
                        <div className="text-xs space-y-1">
                          <div className="text-yellow-400">🪙 {gold}</div>
                          {diamonds > 0 && <div className="text-cyan-400">💎 {diamonds}</div>}
                          <div className="text-orange-400">🎖️ {armada}</div>
                        </div>
                      )}
                      <div className="mt-2 text-xs">
                        {level === 0 ? (
                          <span className="text-blue-400">🎯 Start</span>
                        ) : isClaimed ? (
                          <span className="text-green-400">✓ Claimed</span>
                        ) : isUnlocked ? (
                          <span className="text-yellow-400">★ Ready</span>
                        ) : (
                          <span className="text-gray-500">🔒 Locked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How to Earn XP */}
            <div className="ui2 p-6">
              <h3 className="text-lg font-bold text-[#fbc988] mb-3">⚔️ How to Earn XP</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-900/20 rounded p-3">
                  <div className="text-2xl mb-2">⚔️</div>
                  <div className="font-bold text-white mb-1">Win Battles</div>
                  <div className="text-sm text-gray-300">+10 XP per battle won</div>
                </div>
                <div className="bg-blue-900/20 rounded p-3">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-bold text-white mb-1">Daily Check-In</div>
                  <div className="text-sm text-gray-300">+5 XP per check-in</div>
                </div>
                <div className="bg-blue-900/20 rounded p-3">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-bold text-white mb-1">Claim GPM</div>
                  <div className="text-sm text-gray-300">+1 XP per claim</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                💡 Tip: Each level requires 100 XP. The more you play, the faster you progress!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
