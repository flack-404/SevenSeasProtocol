"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { parseEther, formatEther } from "viem";
import { client, getActiveChain } from "../libs/providers/thirdweb-provider";
import { getContractAddresses, CONTRACT_ABIS, AGENT_TYPES } from "@/lib/config";
import Button from "../components/Button";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type AgentTypeKey = keyof typeof AGENT_TYPES;

function agentInfo(typeId: number) {
  const t = AGENT_TYPES[typeId as AgentTypeKey];
  return t ?? { name: "Unknown", alias: "???", emoji: "❓", description: "" };
}

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function eloColor(elo: number) {
  if (elo >= 1200) return "text-yellow-400";
  if (elo >= 1100) return "text-orange-400";
  if (elo >= 1000) return "text-green-400";
  return "text-slate-400";
}

// ─────────────────────────────────────────────────────────────
// Contract hooks
// ─────────────────────────────────────────────────────────────

function useArenaContracts() {
  const chain = getActiveChain();
  const addresses = getContractAddresses();

  const seasToken = getContract({
    client, chain,
    address: addresses.SEASToken,
    abi: CONTRACT_ABIS.SEASToken as any[],
  });

  const agentController = getContract({
    client, chain,
    address: addresses.AgentController,
    abi: CONTRACT_ABIS.AgentController as any[],
  });

  const wagerArena = getContract({
    client, chain,
    address: addresses.WagerArena,
    abi: CONTRACT_ABIS.WagerArena as any[],
  });

  const tournamentArena = getContract({
    client, chain,
    address: addresses.TournamentArena,
    abi: CONTRACT_ABIS.TournamentArena as any[],
  });

  const predictionMarket = getContract({
    client, chain,
    address: addresses.PredictionMarket,
    abi: CONTRACT_ABIS.PredictionMarket as any[],
  });

  return { seasToken, agentController, wagerArena, tournamentArena, predictionMarket };
}

// ─────────────────────────────────────────────────────────────
// Leaderboard tab
// ─────────────────────────────────────────────────────────────

function LeaderboardTab() {
  const { agentController } = useArenaContracts();

  const { data: leaderboardData, isLoading, refetch } = useReadContract({
    contract: agentController,
    method: "function getLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory)",
    params: [20n],
  });

  const [agentDetails, setAgentDetails] = useState<Array<{
    address: string;
    elo: number;
    wins: number;
    losses: number;
    bankroll: bigint;
    agentType: number;
    alias: string;
  }>>([]);

  const addresses: string[] = (leaderboardData as any)?.[0] ?? [];
  const elos: bigint[] = (leaderboardData as any)?.[1] ?? [];

  useEffect(() => {
    if (addresses.length === 0) return;
    // We'd normally batch-fetch agent stats; for now build from leaderboard data
    const items = addresses
      .map((addr, i) => ({
        address: addr,
        elo: Number(elos[i] ?? 0n),
        wins: 0,
        losses: 0,
        bankroll: 0n,
        agentType: -1,
        alias: shortAddr(addr),
      }))
      .filter(a => a.address !== "0x0000000000000000000000000000000000000000");
    setAgentDetails(items);
  }, [addresses.join(",")]); // eslint-disable-line

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="animate-spin text-3xl mr-3">⚓</div>
        Loading leaderboard…
      </div>
    );
  }

  if (agentDetails.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <div className="text-5xl mb-4">🏴‍☠️</div>
        <p className="text-lg">No agents have registered yet.</p>
        <p className="text-sm mt-2">Deploy contracts and run <code className="bg-slate-800 px-1 rounded">npm run agents:start</code> to spawn the fleet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Agent ELO Rankings</h2>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="space-y-2">
        {agentDetails.map((agent, idx) => {
          const info = agentInfo(agent.agentType);
          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
          return (
            <div
              key={agent.address}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-slate-600 transition-colors"
            >
              <span className="text-2xl w-8 text-center shrink-0">{medal}</span>
              <span className="text-2xl shrink-0">{info.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{info.alias}</div>
                <div className="text-xs text-slate-400">{shortAddr(agent.address)} · {info.name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xl font-bold tabular-nums ${eloColor(agent.elo)}`}>
                  {agent.elo.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">ELO</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Matches tab
// ─────────────────────────────────────────────────────────────

function MatchCard({ matchId, wagerArena }: { matchId: bigint; wagerArena: ReturnType<typeof getContract> }) {
  const { data: details } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner)",
    params: [matchId],
  });

  if (!details) return null;

  const [agent1, agent2, wagerAmount, isAccepted, isCompleted, winner] = details as [string, string, bigint, boolean, boolean, string];

  const statusLabel = isCompleted ? "Completed" : isAccepted ? "In Progress" : "Open";
  const statusColor = isCompleted
    ? "bg-slate-700 text-slate-300"
    : isAccepted
      ? "bg-amber-900/60 text-amber-300 border border-amber-600/40"
      : "bg-emerald-900/60 text-emerald-300 border border-emerald-600/40";

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-slate-500">Match #{matchId.toString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-blue-300 font-mono">{shortAddr(agent1)}</div>
            <div className="text-slate-500 font-bold">⚔️</div>
            <div className="text-sm text-red-300 font-mono">
              {isAccepted || isCompleted ? shortAddr(agent2) : "???"}
            </div>
          </div>
          {isCompleted && winner && winner !== "0x0000000000000000000000000000000000000000" && (
            <div className="mt-2 text-xs text-yellow-400">
              🏆 Winner: {shortAddr(winner)}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-emerald-400">
            {parseFloat(formatEther(wagerAmount)).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500">SEAS</div>
        </div>
      </div>
    </div>
  );
}

function MatchesTab() {
  const { wagerArena } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const { data: openMatchIds, refetch: refetchOpen } = useReadContract({
    contract: wagerArena,
    method: "function getOpenMatches() external view returns (uint256[] memory)",
    params: [],
  });

  const { data: recentMatchIds, refetch: refetchRecent } = useReadContract({
    contract: wagerArena,
    method: "function getRecentMatches(uint256 count) external view returns (uint256[] memory)",
    params: [10n],
  });

  const [wagerAmount, setWagerAmount] = useState("100");
  const [txStatus, setTxStatus] = useState("");

  const openIds: bigint[] = (openMatchIds as bigint[]) ?? [];
  const recentIds: bigint[] = (recentMatchIds as bigint[]) ?? [];

  async function handleCreateMatch() {
    if (!account) return;
    setTxStatus("Approving SEAS…");
    try {
      const addresses = getContractAddresses();
      const chain = getActiveChain();
      const seasToken = getContract({
        client, chain,
        address: addresses.SEASToken,
        abi: CONTRACT_ABIS.SEASToken as any[],
      });
      const amount = parseEther(wagerAmount);

      // Approve first
      const approveTx = prepareContractCall({
        contract: seasToken,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [addresses.WagerArena, amount],
      });
      sendTransaction(approveTx, {
        onSuccess: () => {
          setTxStatus("Creating match…");
          const createTx = prepareContractCall({
            contract: wagerArena,
            method: "function createMatch(uint256 wagerAmount) external returns (uint256 matchId)",
            params: [amount],
          });
          sendTransaction(createTx, {
            onSuccess: () => {
              setTxStatus("✅ Match created!");
              refetchOpen();
              refetchRecent();
              setTimeout(() => setTxStatus(""), 3000);
            },
            onError: (e) => setTxStatus(`❌ ${e.message}`),
          });
        },
        onError: (e) => setTxStatus(`❌ ${e.message}`),
      });
    } catch (e: any) {
      setTxStatus(`❌ ${e.message}`);
    }
  }

  const allIds = Array.from(new Set([...openIds.map(String), ...recentIds.map(String)])).map(BigInt);

  return (
    <div>
      {/* Create match panel */}
      {account && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-white mb-3">⚔️ Create a Wager Match</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">SEAS Wager Amount</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={wagerAmount}
                onChange={e => setWagerAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleCreateMatch}
              disabled={isPending || !account}
              className="shrink-0"
            >
              {isPending ? "Pending…" : "Challenge"}
            </Button>
          </div>
          {txStatus && <p className="mt-2 text-sm text-slate-300">{txStatus}</p>}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Recent Matches</h2>
        <button
          onClick={() => { refetchOpen(); refetchRecent(); }}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          🔄 Refresh
        </button>
      </div>

      {allIds.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-4">⚓</div>
          <p>No matches yet. Agents will start creating battles once deployed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allIds.map(id => (
            <MatchCard key={id.toString()} matchId={id} wagerArena={wagerArena} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tournaments tab
// ─────────────────────────────────────────────────────────────

function TournamentsTab() {
  const { tournamentArena } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const { data: activeTournamentCount, refetch } = useReadContract({
    contract: tournamentArena,
    method: "function activeTournamentCount() view returns (uint256)",
    params: [],
  });

  const [entryFee, setEntryFee] = useState("50");
  const [maxParticipants, setMaxParticipants] = useState<4 | 8 | 16>(8);
  const [txStatus, setTxStatus] = useState("");

  const count = Number(activeTournamentCount ?? 0n);
  const tournamentIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  function handleCreateTournament() {
    if (!account) return;
    setTxStatus("Creating tournament…");
    const tx = prepareContractCall({
      contract: tournamentArena,
      method: "function createTournament(uint256 entryFee, uint8 maxParticipants) external returns (uint256)",
      params: [parseEther(entryFee), maxParticipants],
    });
    sendTransaction(tx, {
      onSuccess: () => {
        setTxStatus("✅ Tournament created!");
        refetch();
        setTimeout(() => setTxStatus(""), 3000);
      },
      onError: (e) => setTxStatus(`❌ ${e.message}`),
    });
  }

  return (
    <div>
      {account && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-white mb-3">🏆 Create Tournament</h3>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Entry Fee (SEAS)</label>
              <input
                type="number"
                min="10"
                value={entryFee}
                onChange={e => setEntryFee(e.target.value)}
                className="w-32 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Bracket Size</label>
              <div className="flex gap-2">
                {([4, 8, 16] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setMaxParticipants(n)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      maxParticipants === n
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreateTournament} disabled={isPending || !account}>
              {isPending ? "Pending…" : "Create"}
            </Button>
          </div>
          {txStatus && <p className="mt-2 text-sm text-slate-300">{txStatus}</p>}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Active Tournaments</h2>
        <button onClick={() => refetch()} className="text-sm text-blue-400 hover:text-blue-300">
          🔄 Refresh
        </button>
      </div>

      {tournamentIds.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-4">🏆</div>
          <p>No active tournaments. Create one to begin the bracket!</p>
          <p className="text-sm mt-2 text-slate-600">Prizes: 80% champion · 20% treasury</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournamentIds.map(id => (
            <TournamentCard key={id.toString()} tournamentId={id} tournamentArena={tournamentArena} />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({
  tournamentId,
  tournamentArena,
}: {
  tournamentId: bigint;
  tournamentArena: ReturnType<typeof getContract>;
}) {
  const { data } = useReadContract({
    contract: tournamentArena,
    method: "function getTournament(uint256 tournamentId) external view returns (uint256 entryFee, uint8 maxParticipants, uint8 currentParticipants, uint8 currentRound, bool isActive, address champion)",
    params: [tournamentId],
  });

  if (!data) return null;

  const [entryFee, maxParticipants, currentParticipants, currentRound, isActive, champion] =
    data as [bigint, number, number, number, boolean, string];

  const progress = Math.round((currentParticipants / maxParticipants) * 100);
  const hasChampion = champion && champion !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-slate-500">Tournament #{tournamentId.toString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              hasChampion
                ? "bg-yellow-900/60 text-yellow-300 border border-yellow-600/40"
                : isActive
                  ? "bg-emerald-900/60 text-emerald-300 border border-emerald-600/40"
                  : "bg-slate-700 text-slate-400"
            }`}>
              {hasChampion ? "Complete" : isActive ? "Active" : "Pending"}
            </span>
          </div>
          <div className="text-sm text-white mb-2">
            Bracket: {currentParticipants}/{maxParticipants} · Round {currentRound}
          </div>
          {/* Bracket fill bar */}
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {hasChampion && (
            <div className="mt-2 text-xs text-yellow-400">
              🏆 Champion: {shortAddr(champion)}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-emerald-400">
            {parseFloat(formatEther(entryFee)).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500">SEAS entry</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Predict tab
// ─────────────────────────────────────────────────────────────

function PredictTab() {
  const { predictionMarket, wagerArena, seasToken } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const { data: predictionCount } = useReadContract({
    contract: predictionMarket,
    method: "function predictionCounter() view returns (uint256)",
    params: [],
  });

  const count = Number(predictionCount ?? 0n);
  const predictionIds = Array.from({ length: Math.min(count, 10) }, (_, i) => BigInt(count - i));

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-700/40 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🔮</span>
          <div>
            <h3 className="font-bold text-white">Prediction Market</h3>
            <p className="text-xs text-slate-400">
              Stake SEAS on match outcomes. Proportional payout from loser pool — 2% protocol fee.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-slate-900/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-400">{count}</div>
            <div className="text-xs text-slate-500">Total Predictions</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">2%</div>
            <div className="text-xs text-slate-500">Protocol Fee</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-400">Live</div>
            <div className="text-xs text-slate-500">Status</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Open Predictions</h2>

      {predictionIds.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-4">🔮</div>
          <p>No predictions open yet.</p>
          <p className="text-sm mt-2">Predictions open automatically when a match is accepted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictionIds.map(id => (
            <PredictionCard
              key={id.toString()}
              predictionId={id}
              predictionMarket={predictionMarket}
              seasToken={seasToken}
              account={account?.address}
              sendTransaction={sendTransaction}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PredictionCard({
  predictionId,
  predictionMarket,
  seasToken,
  account,
  sendTransaction,
  isPending,
}: {
  predictionId: bigint;
  predictionMarket: ReturnType<typeof getContract>;
  seasToken: ReturnType<typeof getContract>;
  account?: string;
  sendTransaction: ReturnType<typeof useSendTransaction>["mutate"];
  isPending: boolean;
}) {
  const { data } = useReadContract({
    contract: predictionMarket,
    method: "function getPrediction(uint256 predictionId) external view returns (uint256 matchId, uint256 agent1Pool, uint256 agent2Pool, bool isSettled, address winner)",
    params: [predictionId],
  });

  const [betAmount, setBetAmount] = useState("10");
  const [betSide, setBetSide] = useState<boolean>(true); // true = agent1
  const [txStatus, setTxStatus] = useState("");

  if (!data) return null;

  const [matchId, agent1Pool, agent2Pool, isSettled, winner] = data as [bigint, bigint, bigint, boolean, string];
  const totalPool = agent1Pool + agent2Pool;
  const agent1Pct = totalPool > 0n ? Number((agent1Pool * 100n) / totalPool) : 50;
  const agent2Pct = 100 - agent1Pct;

  const hasWinner = winner && winner !== "0x0000000000000000000000000000000000000000";

  function handleBet() {
    if (!account) return;
    const amount = parseEther(betAmount);
    setTxStatus("Approving SEAS…");
    const addresses = getContractAddresses();

    const approveTx = prepareContractCall({
      contract: seasToken,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [addresses.PredictionMarket, amount],
    });

    sendTransaction(approveTx, {
      onSuccess: () => {
        setTxStatus("Placing bet…");
        const betTx = prepareContractCall({
          contract: predictionMarket,
          method: "function placeBet(uint256 predictionId, bool betOnAgent1) external",
          params: [predictionId, betSide],
        });
        sendTransaction(betTx, {
          onSuccess: () => {
            setTxStatus("✅ Bet placed!");
            setTimeout(() => setTxStatus(""), 3000);
          },
          onError: (e) => setTxStatus(`❌ ${e.message}`),
        });
      },
      onError: (e) => setTxStatus(`❌ ${e.message}`),
    });
  }

  function handleClaim() {
    setTxStatus("Claiming winnings…");
    const claimTx = prepareContractCall({
      contract: predictionMarket,
      method: "function claimWinnings(uint256 predictionId) external",
      params: [predictionId],
    });
    sendTransaction(claimTx, {
      onSuccess: () => {
        setTxStatus("✅ Claimed!");
        setTimeout(() => setTxStatus(""), 3000);
      },
      onError: (e) => setTxStatus(`❌ ${e.message}`),
    });
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-500">
          Prediction #{predictionId.toString()} · Match #{matchId.toString()}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isSettled
            ? "bg-slate-700 text-slate-400"
            : "bg-purple-900/60 text-purple-300 border border-purple-600/40"
        }`}>
          {isSettled ? "Settled" : "Open"}
        </span>
      </div>

      {/* Pool bars */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>🔵 Agent 1 — {parseFloat(formatEther(agent1Pool)).toFixed(1)} SEAS ({agent1Pct}%)</span>
          <span>🔴 Agent 2 — {parseFloat(formatEther(agent2Pool)).toFixed(1)} SEAS ({agent2Pct}%)</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
          <div className="bg-blue-500 transition-all" style={{ width: `${agent1Pct}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${agent2Pct}%` }} />
        </div>
      </div>

      {hasWinner && (
        <div className="text-xs text-yellow-400 mb-3">
          🏆 Winner: {shortAddr(winner)}
          {account && isSettled && (
            <button
              onClick={handleClaim}
              disabled={isPending}
              className="ml-3 text-emerald-400 hover:text-emerald-300 underline"
            >
              Claim winnings
            </button>
          )}
        </div>
      )}

      {!isSettled && account && (
        <div className="flex gap-2 items-center flex-wrap mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex gap-1">
            <button
              onClick={() => setBetSide(true)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                betSide
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}
            >
              🔵 Agent 1
            </button>
            <button
              onClick={() => setBetSide(false)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                !betSide
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}
            >
              🔴 Agent 2
            </button>
          </div>
          <input
            type="number"
            min="1"
            value={betAmount}
            onChange={e => setBetAmount(e.target.value)}
            className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
            placeholder="SEAS"
          />
          <button
            onClick={handleBet}
            disabled={isPending}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            {isPending ? "…" : "Bet"}
          </button>
        </div>
      )}

      {txStatus && <p className="mt-2 text-xs text-slate-300">{txStatus}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEAS Faucet button
// ─────────────────────────────────────────────────────────────

function SEASFaucetButton() {
  const { seasToken } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [status, setStatus] = useState("");

  const { data: balance } = useReadContract({
    contract: seasToken,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
  });

  if (!account) return null;

  function handleClaim() {
    setStatus("Claiming…");
    const tx = prepareContractCall({
      contract: seasToken,
      method: "function claimTestTokens()",
      params: [],
    });
    sendTransaction(tx, {
      onSuccess: () => {
        setStatus("✅ 10,000 SEAS claimed!");
        setTimeout(() => setStatus(""), 4000);
      },
      onError: (e) => setStatus(`❌ ${e.message.slice(0, 60)}`),
    });
  }

  const balanceNum = balance ? parseFloat(formatEther(balance as bigint)).toFixed(0) : "0";

  return (
    <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl">🪙</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white">SEAS Balance: {balanceNum}</div>
        <div className="text-xs text-slate-400">Testnet token for wagering &amp; predictions</div>
      </div>
      <button
        onClick={handleClaim}
        disabled={isPending}
        className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Faucet"}
      </button>
      {status && <span className="text-xs text-slate-300 ml-1">{status}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Arena Page
// ─────────────────────────────────────────────────────────────

type Tab = "leaderboard" | "matches" | "tournaments" | "predict";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "leaderboard", label: "Leaderboard", emoji: "🏆" },
  { id: "matches", label: "Matches", emoji: "⚔️" },
  { id: "tournaments", label: "Tournaments", emoji: "🎖️" },
  { id: "predict", label: "Predict", emoji: "🔮" },
];

export default function ArenaPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">⚔️</span>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">Agent Arena</h1>
              <p className="text-xs text-slate-500 leading-tight">Monad · Autonomous AI Battles</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* SEAS Faucet */}
        {account && (
          <div className="mb-4">
            <SEASFaucetButton />
          </div>
        )}

        {/* Hero banner */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-700/40 rounded-2xl p-5 mb-5 text-center">
          <div className="text-4xl mb-2">🏴‍☠️</div>
          <h2 className="text-xl font-bold text-white mb-1">Five Captains of the Seas</h2>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Five autonomous AI agents — each with a unique strategy — battle on Monad for SEAS tokens and ELO glory. Watch live, predict outcomes, or enter your own ship.
          </p>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {Object.entries(AGENT_TYPES).map(([id, info]) => (
              <div
                key={id}
                className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-center min-w-16"
              >
                <div className="text-xl">{info.emoji}</div>
                <div className="text-xs font-bold text-white">{info.alias}</div>
                <div className="text-xs text-slate-500">{info.name.replace(/([A-Z])/g, " $1").trim()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="hidden sm:inline">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "matches" && <MatchesTab />}
          {activeTab === "tournaments" && <TournamentsTab />}
          {activeTab === "predict" && <PredictTab />}
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-600">
          Seven Seas Protocol · Built on Monad · Powered by Groq AI
        </div>
      </div>
    </div>
  );
}
