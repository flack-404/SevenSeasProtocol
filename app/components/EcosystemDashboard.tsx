"use client";

import { useActiveAccount } from 'thirdweb/react';
import { usePlayer } from '../libs/providers/player-provider';
import {
  useTokenBalance,
  usePlayerGuild,
  usePlayerBattlePass,
  usePlayerShips,
  useClaimableDividends,
  useUnclaimedRewards
} from '../libs/hooks/useContracts';
import { formatEther } from 'viem';
import { useRouter } from 'next/navigation';

/**
 * EcosystemDashboard - Shows all player stats across the entire ecosystem
 * Displays: Account, ARMADA tokens, Guild, Battle Pass, Ship NFTs
 */
export function EcosystemDashboard() {
  const router = useRouter();
  const account = useActiveAccount();
  const { playerAccount } = usePlayer(); // Use existing player provider
  const { balance: tokenBalance } = useTokenBalance();
  const { guildData, inGuild } = usePlayerGuild();
  const { passData, hasActivePass } = usePlayerBattlePass();
  const { shipCount } = usePlayerShips();

  if (!account) {
    return null; // Don't show anything if not connected
  }

  if (!playerAccount) {
    return null; // Don't show anything if no account - WelcomeScreen will handle this
  }

  return (
    <div className="space-y-2">
      {/* Compact Ecosystem Cards - CLICKABLE */}
      <div className="grid grid-cols-2 gap-2">
        {/* ARMADA Token - Click to view (future) */}
        <div
          className="bg-gradient-to-br from-orange-900/80 to-red-900/80 backdrop-blur-md rounded-lg p-3 border border-orange-500/40 cursor-default"
        >
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
            🪙 ARMADA
          </div>
          <div className="text-xl font-bold text-orange-400">
            {parseFloat(formatEther(tokenBalance)).toFixed(0)}
          </div>
        </div>

        {/* Guild - CLICKABLE */}
        <div
          onClick={() => router.push('/guilds')}
          className="bg-gradient-to-br from-indigo-900/80 to-blue-900/80 backdrop-blur-md rounded-lg p-3 border border-indigo-500/40 cursor-pointer hover:scale-105 transition-transform duration-200 hover:border-indigo-400"
        >
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
            ⚔️ Guild
          </div>
          {inGuild && guildData ? (
            <div className="text-sm font-bold text-indigo-400 truncate">
              {guildData[0]}
            </div>
          ) : (
            <div className="text-xs text-white/60">Click to view</div>
          )}
        </div>

        {/* Battle Pass - CLICKABLE */}
        <div
          onClick={() => router.push('/battlepass')}
          className="bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-md rounded-lg p-3 border border-purple-500/40 cursor-pointer hover:scale-105 transition-transform duration-200 hover:border-purple-400"
        >
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
            🎖️ Pass
          </div>
          {hasActivePass && passData ? (
            <div className="text-xl font-bold text-purple-400">
              Lvl {String(passData[1] || 0)}
            </div>
          ) : (
            <div className="text-xs text-white/60">Click to view</div>
          )}
        </div>

        {/* Ship NFTs - CLICKABLE */}
        <div
          onClick={() => router.push('/nfts')}
          className="bg-gradient-to-br from-teal-900/80 to-cyan-900/80 backdrop-blur-md rounded-lg p-3 border border-teal-500/40 cursor-pointer hover:scale-105 transition-transform duration-200 hover:border-teal-400"
        >
          <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
            🚢 NFTs
          </div>
          <div className="text-xl font-bold text-teal-400">
            {shipCount}
          </div>
          <div className="text-[9px] text-white/60 mt-0.5">Click to view</div>
        </div>
      </div>

      {/* Agent Arena - Full-width clickable card */}
      <div
        onClick={() => router.push('/arena')}
        className="bg-gradient-to-r from-slate-800/80 to-indigo-900/60 backdrop-blur-md rounded-lg p-3 border border-indigo-500/40 cursor-pointer hover:scale-[1.02] transition-transform duration-200 hover:border-indigo-400 flex items-center gap-3"
      >
        <span className="text-2xl">⚔️</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white flex items-center gap-1">
            Agent Arena
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-normal">LIVE</span>
            </span>
          </div>
          <div className="text-[10px] text-indigo-300">AI battles · Wager · Predict</div>
        </div>
        <div className="text-slate-400 text-xs">→</div>
      </div>

      {/* Compact Network Badge */}
      <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 backdrop-blur-md rounded-lg p-2 border border-green-500/30">
        <div className="text-center text-[10px] text-green-400 font-semibold">
          🌐 Monad Testnet | ⚡ AI Agent Arena
        </div>
      </div>
    </div>
  );
}

