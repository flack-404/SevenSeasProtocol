"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '../libs/providers/player-provider';
import {
  usePlayerGuild,
  useTopGuilds,
  useClaimableDividends,
  useGuildTransaction,
  useContractInstances,
} from '../libs/hooks/useContracts';
import { useReadContract, useSendTransaction } from 'thirdweb/react';
import { prepareContractCall } from 'thirdweb';
import Button from '../components/Button';
import { formatEther } from 'viem';
import { AnimatedGoldCounter } from '../components/AnimatedGoldCounter';

/**
 * Guild Page - Create, browse, join guilds and claim dividends
 * Matches pirate theme from existing UI
 */
export default function GuildsPage() {
  const router = useRouter();
  const { playerAccount, isLoading: playerLoading, refreshPlayerData } = usePlayer();
  const { guildId, guildData, inGuild, refetch: refetchGuild } = usePlayerGuild();
  const { dividends, refetch: refetchDividends } = useClaimableDividends();
  const { guildIds, scores } = useTopGuilds(20);
  const { guildContract } = useContractInstances();

  const [guildName, setGuildName] = useState('');
  const [guildLogo, setGuildLogo] = useState('');
  const [selectedGuildId, setSelectedGuildId] = useState<bigint | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastAction, setLastAction] = useState<'create' | 'join' | 'leave' | 'claim' | null>(null);

  // Use sendTransaction directly
  const { mutate: sendTransaction, isPending, isSuccess, isError, error: txError } = useSendTransaction();

  // Debug logging
  useEffect(() => {
    console.log('Guilds Page - Player Gold Debug:', {
      playerAccount: playerAccount,
      gold: playerAccount?.gold,
      goldType: typeof playerAccount?.gold,
    });
  }, [playerAccount]);

  // Get selected guild data - Use public mapping directly instead of getGuild
  const { data: selectedGuildData } = useReadContract({
    contract: guildContract,
    method: 'function guilds(uint256) view returns (string name, address leader, uint256 createdAt, uint256 memberCount, uint256 treasury, bool isActive, uint256 totalBattlesWon, string logo, uint256 level)',
    params: selectedGuildId ? [selectedGuildId] : undefined,
  });

  const handleCreateGuild = () => {
    if (!playerAccount) {
      setError('Player account not found');
      return;
    }

    if (!guildName.trim()) {
      setError('Guild name cannot be empty');
      return;
    }

    if (guildName.length > 32) {
      setError('Guild name must be 32 characters or less');
      return;
    }

    if (playerAccount.gold < 500) {
      setError('You need 500 gold to create a guild');
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('create');

    try {
      const transaction = prepareContractCall({
        contract: guildContract,
        method: 'function createGuild(string name, string logo)',
        params: [guildName.trim(), guildLogo.trim()],
      });

      sendTransaction(transaction);
      setGuildName('');
      setGuildLogo('');
    } catch (err) {
      setError('Failed to create guild: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleJoinGuild = (targetGuildId: bigint) => {
    setError('');
    setSuccess('');
    setLastAction('join');

    try {
      const transaction = prepareContractCall({
        contract: guildContract,
        method: 'function joinGuild(uint256 guildId)',
        params: [targetGuildId],
      });

      sendTransaction(transaction);
      setSelectedGuildId(null);
    } catch (err) {
      setError('Failed to join guild: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleLeaveGuild = () => {
    if (!confirm('Are you sure you want to leave your guild?')) {
      return;
    }

    setError('');
    setSuccess('');
    setLastAction('leave');

    try {
      const transaction = prepareContractCall({
        contract: guildContract,
        method: 'function leaveGuild()',
        params: [],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to leave guild: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  const handleClaimDividends = () => {
    setError('');
    setSuccess('');
    setLastAction('claim');

    try {
      const transaction = prepareContractCall({
        contract: guildContract,
        method: 'function claimGuildDividends()',
        params: [],
      });

      sendTransaction(transaction);
    } catch (err) {
      setError('Failed to claim dividends: ' + (err as Error).message);
      setLastAction(null);
    }
  };

  // Watch for transaction success
  useEffect(() => {
    if (isSuccess && lastAction) {
      console.log('Guild transaction succeeded, lastAction:', lastAction);

      if (lastAction === 'create') {
        setSuccess('Guild created successfully! 🎉');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchGuild();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'join') {
        setSuccess('Joined guild successfully! ⚓');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchGuild();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'leave') {
        setSuccess('Left guild successfully');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchGuild();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      } else if (lastAction === 'claim') {
        setSuccess('Dividends claimed! 🪙');
        setTimeout(async () => {
          await refreshPlayerData();
          await refetchDividends();
          setSuccess('');
          setLastAction(null);
        }, 2000);
      }
    }
  }, [isSuccess]);

  // Watch for transaction errors
  useEffect(() => {
    if (isError && lastAction) {
      console.log('Guild transaction failed:', txError);
      setError(txError?.message || 'Transaction failed');
      setLastAction(null);
    }
  }, [isError]);

  // Debug logging
  useEffect(() => {
    console.log('Guilds Debug:', {
      playerLoading,
      playerAccount: playerAccount ? 'EXISTS' : 'NULL',
      boatName: playerAccount?.boatName,
      inGuild: inGuild,
      guildId: guildId?.toString(),
      guildData: guildData,
    });
  }, [playerLoading, playerAccount, inGuild, guildId, guildData]);

  // Just wait for loading to finish
  if (playerLoading || !playerAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/sea-bg.jpg')] bg-cover">
        <div className="ui1 p-8 text-white text-center">
          <p>Loading Guilds...</p>
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
              <h1 className="text-4xl font-bold text-[#fbc988] mb-2">⚔️ Guild Hall</h1>
              <p className="text-gray-300">Unite with fellow pirates and conquer the seas together</p>
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

        {/* Your Guild Section (if in guild) */}
        {inGuild && guildData && (
          <div className="ui1 p-6">
            <h2 className="text-2xl font-bold text-[#fbc988] mb-4">🏴‍☠️ Your Guild</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="ui2 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  {guildData[7] && <span className="text-2xl">{guildData[7]}</span>}
                  <h3 className="text-xl font-bold text-white">{guildData[0]}</h3>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-gray-300">👥 Members: <span className="text-white font-bold">{guildData[3].toString()}</span></p>
                  <p className="text-gray-300">💰 Treasury: <span className="text-yellow-400 font-bold">{guildData[4].toString()} gold</span></p>
                  <p className="text-gray-300">⚔️ Battles Won: <span className="text-white font-bold">{guildData[6].toString()}</span></p>
                  <p className="text-gray-300">📊 Level: <span className="text-purple-400 font-bold">{guildData[8].toString()}</span></p>
                </div>
              </div>

              <div className="ui2 p-4 space-y-3">
                <div>
                  <p className="text-gray-300 text-sm mb-2">Claimable Dividends:</p>
                  <p className="text-3xl font-bold text-yellow-400">{dividends.toString()} 🪙</p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleClaimDividends}
                  disabled={isPending || dividends === 0n}
                  className="w-full"
                >
                  {isPending ? 'Claiming...' : 'Claim Dividends'}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleLeaveGuild}
                  disabled={isPending}
                  className="w-full"
                >
                  Leave Guild
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Guild Section (if not in guild) */}
        {!inGuild && (
          <div className="ui1 p-6">
            <h2 className="text-2xl font-bold text-[#fbc988] mb-4">⚓ Create a Guild</h2>
            <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300">
                💰 Cost: <span className="text-yellow-400 font-bold">500 gold</span> |
                Your gold: <span className="text-white font-bold"><AnimatedGoldCounter /></span>
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Guild Name *</label>
                <input
                  type="text"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="Enter guild name..."
                  maxLength={32}
                  className="w-full p-3 bg-[#3a2414] border-2 border-[#7a4f2f] rounded text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">{guildName.length}/32 characters</p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Logo (emoji or URL)</label>
                <input
                  type="text"
                  value={guildLogo}
                  onChange={(e) => setGuildLogo(e.target.value)}
                  placeholder="⚓ or https://..."
                  className="w-full p-3 bg-[#3a2414] border-2 border-[#7a4f2f] rounded text-white placeholder-gray-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={handleCreateGuild}
                disabled={isPending || !guildName.trim() || (playerAccount.gold < 500n)}
                className="w-full md:w-auto"
              >
                {isPending ? 'Creating...' : 'Create Guild (500 gold)'}
              </Button>
            </div>
          </div>
        )}

        {/* Browse Guilds */}
        <div className="ui1 p-6">
          <h2 className="text-2xl font-bold text-[#fbc988] mb-4">🌊 All Guilds</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {guildIds.length === 0 ? (
              <div className="ui2 p-4 text-center">
                <p className="text-gray-300">No guilds yet. Be the first to create one! ⚓</p>
              </div>
            ) : (
              guildIds.map((id, index) => (
                <GuildCard
                  key={id.toString()}
                  guildId={id}
                  score={scores[index]}
                  isSelected={selectedGuildId === id}
                  onSelect={() => setSelectedGuildId(id)}
                  onJoin={handleJoinGuild}
                  canJoin={!inGuild}
                  isPending={isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* Guild Info */}
        <div className="ui2 p-6">
          <h3 className="text-lg font-bold text-[#fbc988] mb-3">💡 Guild Benefits</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li>• <span className="text-white">Treasury System:</span> 10% of all member battle wins go to guild treasury</li>
            <li>• <span className="text-white">Dividend Rewards:</span> Claim your share of the treasury based on contributions</li>
            <li>• <span className="text-white">Guild Wars:</span> Compete with other guilds for bonus rewards (future)</li>
            <li>• <span className="text-white">Social Network:</span> Find allies and coordinate attacks</li>
            <li>• <span className="text-white">Level System:</span> Guilds level up based on total member activity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Guild Card Component - Shows individual guild info
 */
function GuildCard({
  guildId,
  score,
  isSelected,
  onSelect,
  onJoin,
  canJoin,
  isPending,
}: {
  guildId: bigint;
  score: bigint;
  isSelected: boolean;
  onSelect: () => void;
  onJoin: (guildId: bigint) => void;
  canJoin: boolean;
  isPending: boolean;
}) {
  const { guildContract } = useContractInstances();

  // Use public mapping directly instead of getGuild (same as usePlayerGuild hook)
  const { data: guildData } = useReadContract({
    contract: guildContract,
    method: 'function guilds(uint256) view returns (string name, address leader, uint256 createdAt, uint256 memberCount, uint256 treasury, bool isActive, uint256 totalBattlesWon, string logo, uint256 level)',
    params: [guildId],
  });

  if (!guildData || !guildData[5]) return null; // Don't show inactive guilds

  return (
    <div
      className={`ui2 p-4 cursor-pointer transition-transform hover:scale-[1.02] ${
        isSelected ? 'border-2 border-yellow-400' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {guildData[7] && <span className="text-xl">{guildData[7]}</span>}
            <h3 className="text-lg font-bold text-white">{guildData[0]}</h3>
            <span className="text-xs bg-purple-600 px-2 py-1 rounded">Lvl {guildData[8].toString()}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-300">
            <div>👥 {guildData[3].toString()} members</div>
            <div>💰 {guildData[4].toString()} treasury</div>
            <div>⚔️ {guildData[6].toString()} wins</div>
            <div>📊 {score.toString()} score</div>
          </div>
        </div>
        {canJoin && (
          <Button
            variant="primary"
            onClick={(e: any) => {
              e.stopPropagation();
              onJoin(guildId);
            }}
            disabled={isPending}
            className="ml-4"
          >
            Join
          </Button>
        )}
      </div>
    </div>
  );
}
