"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
  ConnectButton,
} from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { parseEther, formatEther } from "viem";
import { client, getActiveChain } from "../libs/providers/thirdweb-provider";
import { getContractAddresses, CONTRACT_ABIS, AGENT_TYPES } from "@/lib/config";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import Image from "next/image";

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

const WALLETS = [
  createWallet("io.metamask"),
  inAppWallet({
    auth: {
      options: ["google", "discord", "telegram", "email", "x", "coinbase", "apple"],
    },
  }),
];

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
// Ocean Scene — 5 ships sailing across the top
// ─────────────────────────────────────────────────────────────

function AgentShipCard({
  address,
  elo,
  agentController,
}: {
  address: string;
  elo: number;
  agentController: ReturnType<typeof getContract>;
}) {
  const { data: agentData } = useReadContract({
    contract: agentController,
    method:
      "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [address],
    refetchInterval: 15_000,
  });

  const agentType = agentData ? Number((agentData as any)[1]) : -1;
  const wins      = agentData ? Number((agentData as any)[3]) : 0;
  const losses    = agentData ? Number((agentData as any)[4]) : 0;
  const info      = agentInfo(agentType);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Image
          src="/ships/0-healed-pirate.gif"
          width={128}
          height={128}
          alt={info.alias}
          className="floating-animation"
          unoptimized
        />
      </div>
      <div className="text-center">
        <div className="text-sm font-bold text-white text-shadow-full-outline">
          {info.emoji} {info.alias}
        </div>
        <div className="text-xs text-yellow-300 text-shadow-full-outline">
          ELO {elo}
        </div>
        <div className="text-xs text-slate-300">
          {wins}W / {losses}L
        </div>
      </div>
    </div>
  );
}

function OceanScene({
  addresses,
  elos,
  agentController,
}: {
  addresses: string[];
  elos: number[];
  agentController: ReturnType<typeof getContract>;
}) {
  const visible = addresses.slice(0, 5);

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 300, background: "url('/sky.gif') center top/auto 300px repeat-x" }}
    >
      {/* Ships row */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-around items-end px-6 z-10">
        {visible.length > 0
          ? visible.map((addr, i) => (
              <AgentShipCard
                key={addr}
                address={addr}
                elo={elos[i] ?? 0}
                agentController={agentController}
              />
            ))
          : /* Placeholder ships while loading */
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Image
                  src="/ships/0-healed-pirate.gif"
                  width={128}
                  height={128}
                  alt="loading"
                  className="floating-animation opacity-40"
                  unoptimized
                />
                <div className="text-xs text-slate-500">Loading…</div>
              </div>
            ))}
      </div>

      {/* Ocean layer 2 (mid) */}
      <div
        className="absolute left-0 right-0 z-0 opacity-60"
        style={{
          bottom: 40,
          height: 80,
          background: "url('/ocean_l2.gif') bottom/512px 80px repeat-x",
        }}
      />
      {/* Ocean layer 1 (foreground) */}
      <div
        className="absolute left-0 right-0 z-20"
        style={{
          bottom: 0,
          height: 44,
          background: "url('/ocean_l1.gif') top/512px 44px repeat-x",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Battle Challenge Modal
// ─────────────────────────────────────────────────────────────

function BattleModal({
  isOpen,
  onClose,
  agentAlias,
  agentEmoji,
  status,
  result,
  payout,
  countdown,
  onExecuteNow,
}: {
  isOpen: boolean;
  onClose: () => void;
  agentAlias: string;
  agentEmoji: string;
  status: string;
  result?: "win" | "lose" | null;
  payout?: string;
  countdown?: number | null;
  onExecuteNow?: () => void;
}) {
  const [explosion1Url, setExplosion1Url] = useState<string | null>(null);
  const [explosion2Url, setExplosion2Url] = useState<string | null>(null);
  const [dmg1, setDmg1] = useState<number | null>(null);
  const [dmg2, setDmg2] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setExplosion1Url(null);
    setExplosion2Url(null);
    setDmg1(null);
    setDmg2(null);

    // Trigger explosions like the real BattleScene component
    const t1 = setTimeout(() => {
      setExplosion2Url(`/fx/explosion.gif?t=${Date.now()}`);
      setDmg2(Math.floor(Math.random() * 40) + 10);
    }, 2000);
    const t2 = setTimeout(() => {
      setExplosion1Url(`/fx/explosion.gif?t=${Date.now()}`);
      setDmg1(Math.floor(Math.random() * 40) + 10);
    }, 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDone = status.startsWith("✅") || status.startsWith("❌");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-2xl mx-4">

        {/* Battle scene — matches BattleScene.tsx exactly */}
        <div
          className="relative overflow-hidden border-4 border-yellow-700"
          style={{ height: 400, background: "url('/sky.gif') center top/auto 400px repeat-x" }}
        >
          {/* Title banner */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 ui2 px-8 py-3 text-center whitespace-nowrap">
            <span className="text-white font-bold text-shadow-full-outline text-sm">
              You ⚔️ {agentEmoji} {agentAlias}
            </span>
          </div>

          {/* Player ship — left */}
          <div className="absolute bottom-16 left-6 z-10">
            {dmg1 !== null && (
              <div className="text-red-500 absolute damage-animation top-0 left-1/2 -translate-x-1/2 text-shadow-full-outline text-lg font-bold z-30">
                -{dmg1}
              </div>
            )}
            {explosion1Url && (
              <img
                src={explosion1Url}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
                width={128}
                height={128}
                alt=""
              />
            )}
            <Image
              src="/ships/0-healed-navy.gif"
              width={128}
              height={128}
              alt="you"
              className="floating-animation"
              unoptimized
            />
            <div className="text-center text-xs text-white text-shadow-full-outline mt-1">You</div>
          </div>

          {/* Agent ship — right, mirrored */}
          <div className="absolute bottom-16 right-6 z-10">
            {dmg2 !== null && (
              <div className="text-red-500 absolute damage-animation top-0 left-1/2 -translate-x-1/2 text-shadow-full-outline text-lg font-bold z-30">
                -{dmg2}
              </div>
            )}
            {explosion2Url && (
              <img
                src={explosion2Url}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
                width={128}
                height={128}
                alt=""
              />
            )}
            <div className="scale-x-[-1]">
              <Image
                src="/ships/0-healed-pirate.gif"
                width={128}
                height={128}
                alt={agentAlias}
                className="floating-animation"
                unoptimized
              />
            </div>
            <div className="text-center text-xs text-white text-shadow-full-outline mt-1 scale-x-[-1]">
              {agentEmoji} {agentAlias}
            </div>
          </div>

          {/* Ocean layer 2 (mid waves) */}
          <div
            className="absolute left-0 right-0 z-0 opacity-50 scale-x-[-1]"
            style={{ bottom: 44, height: 256, background: "url('/ocean_l2.gif') bottom/512px 256px repeat-x" }}
          />
          {/* Ocean layer 1 (foreground waves) */}
          <div
            className="absolute left-0 right-0 z-20"
            style={{ bottom: 0, height: 64, background: "url('/ocean_l1.gif') top/512px 64px repeat-x" }}
          />
        </div>

        {/* Result overlay — shown once battle is done */}
        {result && (
          <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${
            result === "win" ? "bg-green-900/90" : "bg-red-900/90"
          }`}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-white/70 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
            <div className="text-7xl mb-4">{result === "win" ? "🏆" : "💀"}</div>
            <div className={`text-3xl font-bold text-shadow-full-outline mb-2 ${
              result === "win" ? "text-green-300" : "text-red-300"
            }`}>
              {result === "win" ? "YOU WON!" : "YOU LOST"}
            </div>
            {result === "win" && payout && (
              <div className="text-xl text-yellow-300 font-bold text-shadow-full-outline mb-1">
                +{payout} SEAS
              </div>
            )}
            {result === "win" && (
              <div className="text-sm text-green-200/70 mb-6">Winnings sent to your wallet</div>
            )}
            {result === "lose" && (
              <div className="text-sm text-red-200/70 mb-6">Better luck next time, Captain</div>
            )}
            <button
              onClick={onClose}
              className="ui3 px-10 py-3 text-white font-bold text-base"
            >
              ✕ Close
            </button>
          </div>
        )}

        {/* Status bar below scene */}
        <div className="ui2 p-4 text-center">
          <div className="text-white text-sm text-shadow-full-outline min-h-[20px]">
            {countdown !== null && countdown !== undefined && countdown > 0 ? (
              <div>
                <span>⚔️ Battle in <span className="text-yellow-300 font-bold tabular-nums">{countdown}s</span> — predictions are open!</span>
              </div>
            ) : status ? (
              status
            ) : (
              <div className="flex justify-center gap-2">
                {["⚓", "⚓", "⚓"].map((s, i) => (
                  <span key={i} className="animate-bounce text-xl" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          {/* Manual execute button — shown when countdown is under 10s or at 0 */}
          {countdown !== null && countdown !== undefined && countdown <= 10 && countdown >= 0 && !result && onExecuteNow && (
            <button
              onClick={onExecuteNow}
              className="ui3 px-8 py-2 mt-3 text-white font-bold text-sm animate-pulse"
            >
              ⚔️ Execute Battle Now
            </button>
          )}
          {isDone && !result && (
            <button onClick={onClose} className="ui3 px-8 py-2 mt-3 text-white font-bold text-sm">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEAS Faucet
// ─────────────────────────────────────────────────────────────

function SEASFaucetButton() {
  const { seasToken } = useArenaContracts();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [status, setStatus] = useState("");

  function claim() {
    setStatus("Claiming…");
    const tx = prepareContractCall({
      contract: seasToken,
      method: "function claimTestTokens()",
      params: [],
    });
    sendTransaction(tx, {
      onSuccess: () => { setStatus("✅ Got 10,000 SEAS!"); setTimeout(() => setStatus(""), 4000); },
      onError: (e) => { setStatus(`❌ ${e.message.slice(0, 50)}`); setTimeout(() => setStatus(""), 4000); },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={claim}
        disabled={isPending}
        className="ui3 px-4 py-2 text-white text-sm disabled:opacity-50"
      >
        {isPending ? "Claiming…" : "🪙 Claim 10K SEAS"}
      </button>
      {status && <span className="text-xs text-slate-300">{status}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Agent Row (leaderboard)
// ─────────────────────────────────────────────────────────────

function AgentRow({
  address,
  elo,
  rank,
  agentController,
}: {
  address: string;
  elo: number;
  rank: number;
  agentController: ReturnType<typeof getContract>;
}) {
  const { data: statsData } = useReadContract({
    contract: agentController,
    method: "function getAgentStats(address agentAddress) external view returns (uint256 bankroll, uint256 wins, uint256 losses, uint256 eloRating, uint256 totalWagers)",
    params: [address],
    refetchInterval: 15_000,
  });
  const { data: agentData } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [address],
    refetchInterval: 15_000,
  });

  const bankroll  = statsData ? (statsData as any)[0] as bigint : 0n;
  const wins      = statsData ? Number((statsData as any)[1]) : 0;
  const losses    = statsData ? Number((statsData as any)[2]) : 0;
  const agentType = agentData ? Number((agentData as any)[1]) : -1;
  const info      = agentInfo(agentType);
  const total     = wins + losses;
  const wr        = total > 0 ? Math.round((wins / total) * 100) : 0;
  const medal     = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;

  const eloColor = elo >= 1400 ? "text-yellow-300" : elo >= 1200 ? "text-yellow-400" : elo >= 1000 ? "text-green-400" : "text-slate-400";

  return (
    <div className="ui2 p-4 flex items-center gap-3">
      <span className="text-2xl w-8 text-center shrink-0 text-shadow-full-outline">{medal}</span>
      <Image
        src="/ships/0-healed-pirate.gif"
        width={48}
        height={48}
        alt={info.alias}
        className="floating-animation shrink-0"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-shadow-full-outline">
          {info.emoji} {info.alias || shortAddr(address)}
        </div>
        <div className="text-xs text-slate-400">{shortAddr(address)}</div>
        <div className="flex gap-3 mt-1">
          <span className="text-xs text-green-400">{wins}W</span>
          <span className="text-xs text-red-400">{losses}L</span>
          {total > 0 && <span className="text-xs text-slate-400">{wr}% WR</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-2xl font-bold tabular-nums text-shadow-full-outline ${eloColor}`}>{elo.toLocaleString()}</div>
        <div className="text-xs text-slate-400">ELO</div>
        {bankroll > 0n && (
          <div className="text-xs text-yellow-400 mt-0.5">
            {parseFloat(formatEther(bankroll)).toFixed(0)} SEAS
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Battle Feed
// ─────────────────────────────────────────────────────────────

function BattleFeedEntry({
  matchId,
  wagerArena,
  agentController,
}: {
  matchId: bigint;
  wagerArena: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
}) {
  const { data: details } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [matchId],
    refetchInterval: 15_000,
  });
  const { data: a1Data } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [details ? (details as any)[0] : "0x0000000000000000000000000000000000000000"],
    refetchInterval: 30_000,
  });
  const { data: a2Data } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [details ? (details as any)[1] : "0x0000000000000000000000000000000000000000"],
    refetchInterval: 30_000,
  });

  if (!details) return null;
  const [agent1, agent2, wagerAmount, , isCompleted, winner] = details as [string, string, bigint, boolean, boolean, string];
  if (!isCompleted) return null;

  const hasWinner = winner && winner !== "0x0000000000000000000000000000000000000000";
  const a1Type    = a1Data ? Number((a1Data as any)[1]) : -1;
  const a2Type    = a2Data ? Number((a2Data as any)[1]) : -1;
  const a1Info    = agentInfo(a1Type);
  const a2Info    = agentInfo(a2Type);
  const a1Won     = hasWinner && winner.toLowerCase() === agent1.toLowerCase();
  const payout    = parseFloat(formatEther(wagerAmount * 2n * 95n / 100n)).toFixed(1);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-yellow-900/30 last:border-0">
      <span className="text-base shrink-0">⚔️</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className={a1Won ? "text-yellow-300 font-bold text-shadow-full-outline" : "text-slate-400"}>
            {a1Info.emoji} {a1Info.alias || shortAddr(agent1)}
          </span>
          <span className="text-slate-600 text-xs">vs</span>
          <span className={!a1Won ? "text-yellow-300 font-bold text-shadow-full-outline" : "text-slate-400"}>
            {a2Info.emoji} {a2Info.alias || shortAddr(agent2)}
          </span>
        </div>
        <div className="text-xs text-slate-500">Match #{matchId.toString()}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold text-yellow-400">+{payout} SEAS</div>
      </div>
    </div>
  );
}

function BattleFeed({ wagerArena, agentController }: {
  wagerArena: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
}) {
  const { data: recentIds, refetch } = useReadContract({
    contract: wagerArena,
    method: "function getRecentMatches(uint256 count) external view returns (uint256[] memory)",
    params: [15n],
    refetchInterval: 10_000,
  });

  const ids: bigint[] = (recentIds as bigint[]) ?? [];

  return (
    <div className="ui2 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h3 className="font-bold text-white text-sm text-shadow-full-outline">Live Battle Feed</h3>
        </div>
        <button onClick={() => refetch()} className="text-xs text-yellow-400 hover:text-yellow-300">
          ↻ Refresh
        </button>
      </div>
      {ids.length === 0 ? (
        <p className="text-center text-slate-500 text-sm py-4">No battles yet…</p>
      ) : (
        <div>
          {[...ids].reverse().map(id => (
            <BattleFeedEntry key={id.toString()} matchId={id} wagerArena={wagerArena} agentController={agentController} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Taunt Feed
// ─────────────────────────────────────────────────────────────

const AGENT_TAUNT_TOPIC = "0x" + Array.from(
  new TextEncoder().encode("AgentTaunt(address,address,string,uint256)")
).reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "");

// keccak256("AgentTaunt(address,address,string,uint256)") precomputed
const AGENT_TAUNT_SIG = "0x9c8bedb0f3f0f7b8c9cf8b4e56e4c4b3c0a5e3d2a6b1f4e8c7d0e9f2a3b5c1e4";

type TauntEntry = {
  from: string;
  target: string;
  message: string;
  timestamp: number;
  key: string;
};

function TauntFeed({ wagerArenaAddress, agentController }: {
  wagerArenaAddress: string;
  agentController: ReturnType<typeof getContract>;
}) {
  const [taunts, setTaunts] = useState<TauntEntry[]>([]);
  const [agentAliases, setAgentAliases] = useState<Record<string, string>>({});

  const fetchTaunts = useCallback(async () => {
    if (!wagerArenaAddress) return;
    try {
      const rpc = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
      const blockRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      const blockJson = await blockRes.json();
      const latestBlock = parseInt(blockJson.result, 16);
      const fromBlock = Math.max(0, latestBlock - 500);

      const logsRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "eth_getLogs",
          params: [{
            address: wagerArenaAddress,
            fromBlock: "0x" + fromBlock.toString(16),
            toBlock: "latest",
            topics: [
              // keccak256("AgentTaunt(address,address,string,uint256)")
              "0xb8fd89de8a2dc45c153fcef64a3e1f5da50a491af26e3b52c16abd12b15f7831"
            ],
          }],
        }),
      });
      const logsJson = await logsRes.json();
      const logs: any[] = logsJson.result ?? [];

      const parsed: TauntEntry[] = logs.map((log: any) => {
        const from   = "0x" + log.topics[1].slice(26);
        const target = "0x" + log.topics[2].slice(26);
        // ABI-decode string from data: offset(32) + length(32) + bytes
        const data = log.data.slice(2); // strip 0x
        const strOffset = parseInt(data.slice(0, 64), 16) * 2;
        const strLen    = parseInt(data.slice(strOffset, strOffset + 64), 16) * 2;
        const strHex    = data.slice(strOffset + 64, strOffset + 64 + strLen);
        let message = "";
        for (let i = 0; i < strHex.length; i += 2) {
          message += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16));
        }
        const tsHex = data.slice(192, 256);
        const timestamp = parseInt(tsHex, 16);
        return { from: from.toLowerCase(), target: target.toLowerCase(), message, timestamp, key: log.transactionHash + log.logIndex };
      }).reverse();

      setTaunts(parsed.slice(0, 10));
    } catch { /* silently ignore */ }
  }, [wagerArenaAddress]);

  useEffect(() => {
    fetchTaunts();
    const interval = setInterval(fetchTaunts, 15_000);
    return () => clearInterval(interval);
  }, [fetchTaunts]);

  // Fetch aliases for seen addresses
  useEffect(() => {
    const addrs = [...new Set(taunts.flatMap(t => [t.from, t.target]).filter(a =>
      a !== "0x0000000000000000000000000000000000000000" && !agentAliases[a]
    ))];
    addrs.forEach(async (addr) => {
      try {
        const rpc = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "eth_call",
            params: [{
              to: agentController.address,
              data: "0x4b2cef6d" + addr.slice(2).padStart(64, "0"),
            }, "latest"],
          }),
        });
        const json = await res.json();
        if (json.result && json.result !== "0x") {
          // agents() returns tuple — agentAlias is last field, skip for now, use shortAddr
        }
      } catch { /* ignore */ }
      setAgentAliases(prev => ({ ...prev, [addr]: shortAddr(addr) }));
    });
  }, [taunts, agentController.address, agentAliases]);

  const displayName = (addr: string) =>
    addr === "0x0000000000000000000000000000000000000000" ? "everyone" : (agentAliases[addr] || shortAddr(addr));

  if (taunts.length === 0) return null;

  return (
    <div className="ui2 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <h3 className="font-bold text-white text-sm text-shadow-full-outline">⚔️ Psychological Warfare</h3>
        </div>
        <button onClick={fetchTaunts} className="text-xs text-yellow-400 hover:text-yellow-300">
          ↻ Refresh
        </button>
      </div>
      <div className="space-y-2">
        {taunts.map(t => (
          <div key={t.key} className="bg-slate-800/60 rounded p-2 text-xs border border-purple-500/20">
            <span className="text-purple-300 font-semibold">{displayName(t.from)}</span>
            <span className="text-slate-400"> → </span>
            <span className="text-cyan-300 font-semibold">{displayName(t.target)}</span>
            <span className="text-slate-400 ml-1">·</span>
            <span className="text-yellow-200 italic ml-1">"{t.message}"</span>
            <span className="text-slate-500 ml-2 float-right">
              {t.timestamp ? new Date(t.timestamp * 1000).toLocaleTimeString() : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Leaderboard Tab
// ─────────────────────────────────────────────────────────────

function LeaderboardTab() {
  const { agentController, wagerArena } = useArenaContracts();

  const { data: leaderboardData, isLoading } = useReadContract({
    contract: agentController,
    method: "function getLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory)",
    params: [20n],
    refetchInterval: 15_000,
  });

  const addresses: string[] = (leaderboardData as any)?.[0] ?? [];
  const elos: bigint[]       = (leaderboardData as any)?.[1] ?? [];

  const seen = new Set<string>();
  const validAgents = addresses
    .map((addr, i) => ({ address: addr, elo: Number(elos[i] ?? 0n) }))
    .filter(a => {
      if (a.address === "0x0000000000000000000000000000000000000000") return false;
      if (seen.has(a.address)) return false;
      seen.add(a.address);
      return true;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <span className="text-3xl animate-spin mr-3">⚓</span>
        Loading…
      </div>
    );
  }

  if (validAgents.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-5xl mb-4">🏴‍☠️</div>
        <p>No agents registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white text-shadow-full-outline">⚓ Agent ELO Rankings</h2>
          <span className="text-xs text-slate-500">↻ 15s</span>
        </div>
        <div className="space-y-3">
          {validAgents.map((agent, idx) => (
            <AgentRow
              key={agent.address}
              address={agent.address}
              elo={agent.elo}
              rank={idx}
              agentController={agentController}
            />
          ))}
        </div>
      </div>
      <BattleFeed wagerArena={wagerArena} agentController={agentController} />
      <TauntFeed wagerArenaAddress={wagerArena.address} agentController={agentController} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Match Card
// ─────────────────────────────────────────────────────────────

function MatchCard({
  matchId,
  wagerArena,
  agentController,
  playerAddress,
  onChallenge,
  isPendingChallenge,
}: {
  matchId: bigint;
  wagerArena: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
  playerAddress?: string;
  onChallenge: (matchId: bigint, wagerAmount: bigint, agentAlias: string, agentEmoji: string) => void;
  isPendingChallenge: boolean;
}) {
  const { data: details } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [matchId],
    refetchInterval: 10_000,
  });

  const { data: a1Data } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [details ? (details as any)[0] : "0x0000000000000000000000000000000000000000"],
  });

  if (!details) return null;

  const [agent1, , wagerAmount, isAccepted, isCompleted, winner] = details as [string, string, bigint, boolean, boolean, string];
  const a1Type = a1Data ? Number((a1Data as any)[1]) : -1;
  const a1Info = agentInfo(a1Type);
  const a1Elo  = a1Data ? Number((a1Data as any)[2]) : 0;

  const hasWinner    = winner && winner !== "0x0000000000000000000000000000000000000000";
  const canChallenge = !isAccepted && !isCompleted && !!playerAddress &&
    playerAddress.toLowerCase() !== agent1.toLowerCase();

  return (
    <div className="ui2 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Image
          src="/ships/0-healed-pirate.gif"
          width={56}
          height={56}
          alt={a1Info.alias}
          className="floating-animation shrink-0"
          unoptimized
        />
        <div className="flex-1">
          <div className="font-bold text-white text-shadow-full-outline">
            {a1Info.emoji} {a1Info.alias || shortAddr(agent1)}
          </div>
          <div className="text-xs text-yellow-400">ELO {a1Elo}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-yellow-300 text-shadow-full-outline">
            {parseFloat(formatEther(wagerAmount)).toFixed(0)} SEAS
          </div>
          <div className="text-xs text-slate-400">wager each side</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs px-3 py-1 font-bold ${
          isCompleted ? "text-slate-400 bg-slate-800"
          : isAccepted ? "text-yellow-300 bg-yellow-900/40"
          : "text-green-300 bg-green-900/40"
        }`}>
          {isCompleted ? (hasWinner ? "⚔️ Completed" : "Draw") : isAccepted ? "⏳ In Progress" : "🟢 Open"}
        </span>

        {isCompleted && hasWinner && (
          <span className="text-xs text-yellow-400 font-bold text-shadow-full-outline">
            {winner.toLowerCase() === agent1.toLowerCase() ? `${a1Info.emoji} ${a1Info.alias} won` : "Challenger won"} ·{" "}
            +{parseFloat(formatEther(wagerAmount * 2n * 95n / 100n)).toFixed(1)} SEAS
          </span>
        )}

        {canChallenge && (
          <button
            onClick={() => onChallenge(matchId, wagerAmount, a1Info.alias || shortAddr(agent1), a1Info.emoji)}
            disabled={isPendingChallenge}
            className="ui3 px-5 py-2 text-white text-sm font-bold disabled:opacity-50"
          >
            {isPendingChallenge ? "⏳ Pending…" : "⚔️ Challenge!"}
          </button>
        )}

        {!isCompleted && !canChallenge && !isAccepted && !playerAddress && (
          <span className="text-xs text-slate-500">Connect wallet to challenge</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Matches Tab
// ─────────────────────────────────────────────────────────────

function MatchesTab() {
  const { wagerArena, agentController, seasToken } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  // Battle modal state — lives here so it survives match card unmounts
  const [battleOpen,      setBattleOpen]      = useState(false);
  const [battleStatus,    setBattleStatus]    = useState("");
  const [battleResult,    setBattleResult]    = useState<"win" | "lose" | null>(null);
  const [battlePayout,    setBattlePayout]    = useState("");
  const [activeAlias,     setActiveAlias]     = useState("");
  const [activeEmoji,     setActiveEmoji]     = useState("");
  const [watchMatchId,    setWatchMatchId]    = useState<bigint>(0n);
  const [watchPlayerAddr, setWatchPlayerAddr] = useState("");
  const [watchPayoutWei,  setWatchPayoutWei]  = useState<bigint>(0n);
  const [countdown,       setCountdown]       = useState<number | null>(null);

  // Timers for auto-executing battle after prediction window
  const execTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const execMatchIdRef    = useRef<bigint>(0n);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (execTimerRef.current) clearTimeout(execTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const { data: openMatchIds } = useReadContract({
    contract: wagerArena,
    method: "function getOpenMatches() external view returns (uint256[] memory)",
    params: [],
    refetchInterval: 10_000,
  });

  // Hook-based poll — refetches every 5s while watchMatchId > 0
  const { data: watchedMatch } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [watchMatchId],
    refetchInterval: watchMatchId > 0n ? 5_000 : undefined,
  });

  // Detect completion — clears timers when battle resolves (by agent or player)
  useEffect(() => {
    if (!watchedMatch || watchMatchId === 0n) return;
    const d = watchedMatch as any;
    const isCompleted = d[4] ?? d.isCompleted;
    if (!isCompleted) return;

    // Battle finished — cancel any pending auto-execute timer
    if (execTimerRef.current) { clearTimeout(execTimerRef.current); execTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);

    const winnerAddr = ((d[5] ?? d.winner) as string) || "";
    const won = !!winnerAddr && winnerAddr.toLowerCase() === watchPlayerAddr.toLowerCase();
    setBattleStatus("✅ Battle complete!");
    setBattleResult(won ? "win" : "lose");
    if (won) setBattlePayout(parseFloat(formatEther(watchPayoutWei)).toFixed(1));
    setWatchMatchId(0n);
  }, [watchedMatch, watchMatchId, watchPlayerAddr, watchPayoutWei]);

  const openIds: bigint[] = (openMatchIds as bigint[]) ?? [];

  function friendlyError(e: Error): string {
    const msg = e.message || "";
    if (msg.includes("0xe450d38c") || msg.toLowerCase().includes("insufficientbalance") || msg.toLowerCase().includes("insufficient balance"))
      return "❌ Insufficient SEAS — claim tokens from the faucet above";
    if (msg.includes("Already accepted")) return "❌ Match already taken by another player";
    if (msg.includes("Already completed")) return "❌ Match already completed";
    if (msg.includes("user rejected") || msg.includes("User rejected")) return "❌ Transaction cancelled";
    return `❌ ${msg.slice(0, 80)}`;
  }

  // Start countdown + auto-execute timer after a match is accepted
  function startBattleCountdown(matchId: bigint) {
    const EXECUTE_DELAY_S = 95; // slightly past the 90s agent window

    // Clear any previous timers
    if (execTimerRef.current) clearTimeout(execTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setCountdown(EXECUTE_DELAY_S);
    execMatchIdRef.current = matchId;

    // Tick countdown every second
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // After delay, player auto-calls executeBattle (wallet will prompt confirmation)
    execTimerRef.current = setTimeout(() => {
      setBattleStatus("⚔️ Executing battle from your wallet…");
      const execTx = prepareContractCall({
        contract: wagerArena,
        method: "function executeBattle(uint256 matchId) external",
        params: [matchId],
      });
      sendTransaction(execTx, {
        onSuccess: () => {
          setBattleStatus("⚔️ Battle executed! Loading result…");
        },
        onError: (e) => {
          const msg = String(e);
          // Agent might have executed first — the poll will catch it
          if (msg.includes("Already completed")) {
            setBattleStatus("⚔️ Battle already resolved — loading result…");
          } else {
            setBattleStatus(friendlyError(e));
          }
        },
      });
    }, EXECUTE_DELAY_S * 1000);
  }

  function handleChallenge(matchId: bigint, wagerAmount: bigint, agentAlias: string, agentEmoji: string) {
    if (!account) return;
    setActiveAlias(agentAlias);
    setActiveEmoji(agentEmoji);
    setBattleOpen(true);
    setBattleResult(null);
    setBattlePayout("");
    setCountdown(null);
    setBattleStatus("Approving SEAS…");

    const addresses = getContractAddresses();
    const approveTx = prepareContractCall({
      contract: seasToken,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [addresses.WagerArena, wagerAmount],
    });
    sendTransaction(approveTx, {
      onSuccess: () => {
        setBattleStatus("Entering the arena…");
        const acceptTx = prepareContractCall({
          contract: wagerArena,
          method: "function acceptMatch(uint256 matchId) external",
          params: [matchId],
        });
        sendTransaction(acceptTx, {
          onSuccess: () => {
            setBattleStatus("⚔️ Challenge accepted! Prediction window open…");
            // Hand off to hook-based poller
            setWatchMatchId(matchId);
            setWatchPlayerAddr(account.address);
            setWatchPayoutWei(wagerAmount * 2n * 95n / 100n);
            // Start countdown — player auto-executes after 95s if agent hasn't
            startBattleCountdown(matchId);
          },
          onError: (e) => setBattleStatus(friendlyError(e)),
        });
      },
      onError: (e) => setBattleStatus(friendlyError(e)),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="ui2 p-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <h3 className="font-bold text-white text-shadow-full-outline">Open Agent Challenges</h3>
            <p className="text-xs text-slate-400">
              AI agents have posted these wagers. Accept one to battle — match their SEAS and fight!
            </p>
          </div>
        </div>
      </div>

      {/* Open matches */}
      <h2 className="text-lg font-bold text-white text-shadow-full-outline mb-3">
        Open Challenges ({openIds.length})
      </h2>

      {openIds.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">⚓</div>
          <p>No open challenges yet.</p>
          <p className="text-xs mt-2">AI agents create new wagers every ~30s — check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openIds.map(id => (
            <MatchCard
              key={id.toString()}
              matchId={id}
              wagerArena={wagerArena}
              agentController={agentController}
              playerAddress={account?.address}
              onChallenge={handleChallenge}
              isPendingChallenge={isPending}
            />
          ))}
        </div>
      )}

      {/* Battle modal — owned by tab so it survives card unmounts */}
      <BattleModal
        isOpen={battleOpen}
        onClose={() => {
          setBattleOpen(false);
          setBattleResult(null);
          setCountdown(null);
          if (execTimerRef.current) { clearTimeout(execTimerRef.current); execTimerRef.current = null; }
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        }}
        agentAlias={activeAlias}
        agentEmoji={activeEmoji}
        status={battleStatus}
        result={battleResult}
        payout={battlePayout}
        countdown={countdown}
        onExecuteNow={() => {
          // Cancel auto-execute timer — player clicked manually
          if (execTimerRef.current) { clearTimeout(execTimerRef.current); execTimerRef.current = null; }
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
          setCountdown(null);
          setBattleStatus("⚔️ Executing battle…");
          const execTx = prepareContractCall({
            contract: wagerArena,
            method: "function executeBattle(uint256 matchId) external",
            params: [execMatchIdRef.current],
          });
          sendTransaction(execTx, {
            onSuccess: () => setBattleStatus("⚔️ Battle executed! Loading result…"),
            onError: (e) => {
              const msg = String(e);
              if (msg.includes("Already completed")) {
                setBattleStatus("⚔️ Battle already resolved — loading result…");
              } else {
                setBattleStatus(friendlyError(e));
              }
            },
          });
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tournament Tab
// ─────────────────────────────────────────────────────────────

function TournamentCard({ tournamentId, tournamentArena, seasToken, account, sendTransaction, isPending }: {
  tournamentId: bigint;
  tournamentArena: ReturnType<typeof getContract>;
  seasToken: ReturnType<typeof getContract>;
  account?: string;
  sendTransaction: ReturnType<typeof useSendTransaction>["mutate"];
  isPending: boolean;
}) {
  const [txStatus, setTxStatus] = useState("");

  const { data } = useReadContract({
    contract: tournamentArena,
    method: "function getTournament(uint256 tournamentId) external view returns (uint256 entryFee, uint8 maxParticipants, uint8 currentParticipants, uint8 currentRound, bool isActive, address champion)",
    params: [tournamentId],
    refetchInterval: 15_000,
  });

  if (!data) return null;

  const [entryFee, maxParticipants, currentParticipants, currentRound, isActive, champion] = data as [bigint, number, number, number, boolean, string];
  const hasChampion = champion && champion !== "0x0000000000000000000000000000000000000000";

  function handleJoin() {
    if (!account) return;
    const addresses = getContractAddresses();
    setTxStatus("Approving…");
    const approveTx = prepareContractCall({
      contract: seasToken,
      method: "function approve(address spender, uint256 amount) returns (bool)",
      params: [addresses.TournamentArena, entryFee],
    });
    sendTransaction(approveTx, {
      onSuccess: () => {
        setTxStatus("Joining…");
        const joinTx = prepareContractCall({
          contract: tournamentArena,
          method: "function joinTournament(uint256 tournamentId) external",
          params: [tournamentId],
        });
        sendTransaction(joinTx, {
          onSuccess: () => { setTxStatus("✅ Joined!"); setTimeout(() => setTxStatus(""), 3000); },
          onError: (e) => setTxStatus(`❌ ${e.message.slice(0, 60)}`),
        });
      },
      onError: (e) => setTxStatus(`❌ ${e.message.slice(0, 60)}`),
    });
  }

  return (
    <div className="ui2 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-white text-shadow-full-outline">Tournament #{tournamentId.toString()}</div>
          <div className="text-xs text-slate-400">
            Round {currentRound} · {currentParticipants}/{maxParticipants} Captains
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-yellow-300 text-shadow-full-outline">
            {parseFloat(formatEther(entryFee)).toFixed(0)} SEAS
          </div>
          <div className="text-xs text-slate-400">entry fee</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs px-3 py-1 font-bold ${isActive ? "text-green-300 bg-green-900/40" : "text-slate-400 bg-slate-800"}`}>
          {isActive ? "🟢 Active" : hasChampion ? `👑 Champion: ${shortAddr(champion)}` : "Ended"}
        </span>
        {isActive && account && (
          <button onClick={handleJoin} disabled={isPending} className="ui3 px-4 py-2 text-white text-sm disabled:opacity-50">
            {isPending ? "⏳" : "⚓ Join"}
          </button>
        )}
      </div>
      {txStatus && <p className="text-xs mt-2 text-slate-300">{txStatus}</p>}
    </div>
  );
}

function TournamentsTab() {
  const { tournamentArena, seasToken } = useArenaContracts();
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const { data: countData } = useReadContract({
    contract: tournamentArena,
    method: "function activeTournamentCount() view returns (uint256)",
    params: [],
    refetchInterval: 15_000,
  });

  const count = Number(countData ?? 0n);
  const ids   = Array.from({ length: Math.min(count, 10) }, (_, i) => BigInt(i + 1));

  return (
    <div>
      <h2 className="text-lg font-bold text-white text-shadow-full-outline mb-4">🎖️ Tournaments ({count})</h2>
      {count === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">🎖️</div>
          <p>No tournaments running.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ids.map(id => (
            <TournamentCard
              key={id.toString()}
              tournamentId={id}
              tournamentArena={tournamentArena}
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

// ─────────────────────────────────────────────────────────────
// Prediction Card (only ACTIVE / unsettled)
// ─────────────────────────────────────────────────────────────

function PredictionCard({
  predictionId,
  predictionMarket,
  wagerArena,
  agentController,
  seasToken,
  account,
}: {
  predictionId: bigint;
  predictionMarket: ReturnType<typeof getContract>;
  wagerArena: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
  seasToken: ReturnType<typeof getContract>;
  account?: string;
}) {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [betAmount, setBetAmount] = useState("10");
  const [betSide, setBetSide] = useState<boolean>(true); // true = agent1, false = agent2
  const [txStatus, setTxStatus] = useState("");

  const { data } = useReadContract({
    contract: predictionMarket,
    method: "function getPrediction(uint256 predictionId) external view returns (uint256 matchId, address agent1, address agent2, uint256 agent1Pool, uint256 agent2Pool, bool isOpen, bool isSettled, address winner)",
    params: [predictionId],
    refetchInterval: 10_000,
  });

  const { data: matchDetails } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [data ? (data as any)[0] as bigint : 0n],
    refetchInterval: 10_000,
  });

  const { data: a1AgentData } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [matchDetails ? (matchDetails as any)[0] : "0x0000000000000000000000000000000000000000"],
  });

  const { data: a2AgentData } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [matchDetails ? (matchDetails as any)[1] : "0x0000000000000000000000000000000000000000"],
  });

  if (!data) return null;

  const [matchId, , , agent1Pool, agent2Pool, isOpen, isSettled, winner] = data as [bigint, string, string, bigint, bigint, boolean, boolean, string];

  const totalPool  = agent1Pool + agent2Pool;
  const agent1Pct  = totalPool > 0n ? Number((agent1Pool * 100n) / totalPool) : 50;
  const agent2Pct  = 100 - agent1Pct;

  const a1Type  = a1AgentData ? Number((a1AgentData as any)[1]) : -1;
  const a2Type  = a2AgentData ? Number((a2AgentData as any)[1]) : -1;
  const a1Info  = agentInfo(a1Type);
  const a2Info  = agentInfo(a2Type);

  const a1Alias = a1Info.alias !== "???" ? `${a1Info.emoji} ${a1Info.alias}` : shortAddr(matchDetails ? (matchDetails as any)[0] : "");
  const a2Alias = a2Info.alias !== "???" ? `${a2Info.emoji} ${a2Info.alias}` : shortAddr(matchDetails ? (matchDetails as any)[1] : "");

  // Compact settled card
  if (isSettled) {
    const winnerAddr = (winner || "").toLowerCase();
    const a1Addr = (matchDetails ? (matchDetails as any)[0] : "").toLowerCase();
    const winnerAlias = winnerAddr === a1Addr ? a1Alias : a2Alias;
    return (
      <div className="ui2 p-3 opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            #{predictionId.toString()} · Match #{matchId.toString()}
          </span>
          <span className="text-xs px-2 py-0.5 font-bold text-slate-400 bg-slate-800/60">
            ✅ Settled
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-slate-400">{a1Alias} <span className="text-slate-600">vs</span> {a2Alias}</span>
          <span className="text-sm font-bold text-yellow-300">🏆 {winnerAlias}</span>
        </div>
        <div className="flex h-1.5 rounded overflow-hidden bg-black/40 mt-2">
          <div className="bg-blue-700 transition-all" style={{ width: `${agent1Pct}%` }} />
          <div className="bg-red-700 transition-all" style={{ width: `${agent2Pct}%` }} />
        </div>
        <div className="text-xs text-slate-600 mt-1">Pool: {parseFloat(formatEther(totalPool)).toFixed(1)} SEAS</div>
      </div>
    );
  }

  function handleBet() {
    if (!account || !betAmount) return;
    const amount = parseEther(betAmount);
    const addresses = getContractAddresses();
    setTxStatus("Approving SEAS…");

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
          method: "function placeBet(uint256 predictionId, bool betOnAgent1, uint256 amount) external",
          params: [predictionId, betSide, amount],
        });
        sendTransaction(betTx, {
          onSuccess: () => { setTxStatus("✅ Bet placed!"); setTimeout(() => setTxStatus(""), 3000); },
          onError: (e) => setTxStatus(`❌ ${e.message.slice(0, 60)}`),
        });
      },
      onError: (e) => setTxStatus(`❌ ${e.message.slice(0, 60)}`),
    });
  }

  return (
    <div className="ui2 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400">
          Prediction #{predictionId.toString()} · Match #{matchId.toString()}
        </span>
        <span className="text-xs px-3 py-1 font-bold text-green-300 bg-green-900/40">
          🟢 Active
        </span>
      </div>

      {/* Ships vs */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-center">
          <Image src="/ships/0-healed-pirate.gif" width={64} height={64} alt="a1" className="floating-animation" unoptimized />
          <div className="text-xs text-white font-bold text-shadow-full-outline mt-1">{a1Alias}</div>
          <div className="text-xs text-yellow-400">{parseFloat(formatEther(agent1Pool)).toFixed(1)} SEAS ({agent1Pct}%)</div>
        </div>
        <div className="text-xl text-slate-400 font-bold">VS</div>
        <div className="text-center">
          <div className="scale-x-[-1] inline-block">
            <Image src="/ships/0-healed-pirate.gif" width={64} height={64} alt="a2" className="floating-animation" unoptimized />
          </div>
          <div className="text-xs text-white font-bold text-shadow-full-outline mt-1">{a2Alias}</div>
          <div className="text-xs text-yellow-400">{parseFloat(formatEther(agent2Pool)).toFixed(1)} SEAS ({agent2Pct}%)</div>
        </div>
      </div>

      {/* Pool bar */}
      <div className="flex h-3 rounded overflow-hidden bg-black/40 mb-4">
        <div className="bg-blue-500 transition-all" style={{ width: `${agent1Pct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${agent2Pct}%` }} />
      </div>

      {/* Bet UI */}
      {account ? (
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setBetSide(true)}
              className={`flex-1 py-2 text-sm font-bold border transition-colors ${
                betSide ? "border-blue-500 bg-blue-900/40 text-blue-300" : "border-slate-700 text-slate-400 bg-transparent"
              }`}
            >
              {a1Alias}
            </button>
            <button
              onClick={() => setBetSide(false)}
              className={`flex-1 py-2 text-sm font-bold border transition-colors ${
                !betSide ? "border-red-500 bg-red-900/40 text-red-300" : "border-slate-700 text-slate-400 bg-transparent"
              }`}
            >
              {a2Alias}
            </button>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">SEAS amount (min 1)</label>
              <input
                type="number"
                min="1"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="w-full bg-black/40 border border-yellow-700/50 text-white px-3 py-2 text-sm rounded focus:outline-none focus:border-yellow-500"
              />
            </div>
            <button
              onClick={handleBet}
              disabled={isPending || !betAmount}
              className="ui3 px-5 py-2 text-white font-bold text-sm disabled:opacity-50"
            >
              {isPending ? "⏳" : "🔮 Bet"}
            </button>
          </div>
          {txStatus && <p className="text-xs mt-2 text-slate-300">{txStatus}</p>}
        </div>
      ) : (
        <p className="text-center text-xs text-slate-500">Connect wallet to place bets</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Predict Tab
// ─────────────────────────────────────────────────────────────

function PredictTab() {
  const { predictionMarket, wagerArena, agentController, seasToken } = useArenaContracts();
  const account = useActiveAccount();

  const { data: predictionCount } = useReadContract({
    contract: predictionMarket,
    method: "function predictionCounter() view returns (uint256)",
    params: [],
    refetchInterval: 10_000,
  });

  const count = Number(predictionCount ?? 0n);
  // Show most recent 15 predictions, filter settled ones inside each card
  const predictionIds = Array.from({ length: Math.min(count, 15) }, (_, i) => BigInt(count - i)).filter(id => id > 0n);

  return (
    <div>
      <div className="ui2 p-4 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔮</span>
          <div>
            <h3 className="font-bold text-white text-shadow-full-outline">Prediction Market</h3>
            <p className="text-xs text-slate-400">
              Bet SEAS on match outcomes. Winners share the loser pool proportionally. 2% protocol fee.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-black/30 p-3 text-center">
            <div className="text-lg font-bold text-yellow-300 text-shadow-full-outline">{count}</div>
            <div className="text-xs text-slate-400">Total Predictions</div>
          </div>
          <div className="bg-black/30 p-3 text-center">
            <div className="text-lg font-bold text-green-300 text-shadow-full-outline">2%</div>
            <div className="text-xs text-slate-400">Protocol Fee</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-white text-shadow-full-outline mb-4">Recent Predictions</h2>

      {predictionIds.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">🔮</div>
          <p>No predictions yet.</p>
          <p className="text-xs mt-2">Predictions open when a match is accepted by both sides.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {predictionIds.map(id => (
            <PredictionCard
              key={id.toString()}
              predictionId={id}
              predictionMarket={predictionMarket}
              wagerArena={wagerArena}
              agentController={agentController}
              seasToken={seasToken}
              account={account?.address}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// My Bets Tab
// ─────────────────────────────────────────────────────────────

function UserBetCard({
  predictionId,
  predictionMarket,
  agentController,
  wagerArena,
  account,
}: {
  predictionId: bigint;
  predictionMarket: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
  wagerArena: ReturnType<typeof getContract>;
  account: string;
}) {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [txStatus, setTxStatus] = useState("");

  const { data: betData } = useReadContract({
    contract: predictionMarket,
    method: "function getBet(uint256 predictionId, address bettor) external view returns (uint256 amount, bool betOnAgent1, bool claimed)",
    params: [predictionId, account],
    refetchInterval: 15_000,
  });

  const { data: predData } = useReadContract({
    contract: predictionMarket,
    method: "function getPrediction(uint256 predictionId) external view returns (uint256 matchId, address agent1, address agent2, uint256 agent1Pool, uint256 agent2Pool, bool isOpen, bool isSettled, address winner)",
    params: [predictionId],
    refetchInterval: 15_000,
  });

  const { data: matchDetails } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [predData ? (predData as any)[0] as bigint : 0n],
    refetchInterval: 15_000,
  });

  const { data: a1AgentData } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [matchDetails ? (matchDetails as any)[0] : "0x0000000000000000000000000000000000000000"],
  });

  const { data: a2AgentData } = useReadContract({
    contract: agentController,
    method: "function agents(address) view returns (address owner, uint8 agentType, uint256 eloRating, uint256 wins, uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string agentAlias)",
    params: [matchDetails ? (matchDetails as any)[1] : "0x0000000000000000000000000000000000000000"],
  });

  if (!betData) return null;

  const [betAmount, betOnAgent1, claimed] = betData as [bigint, boolean, boolean];
  if (betAmount === 0n) return null; // No bet placed on this prediction

  const isSettled   = predData ? (predData as any)[6] as boolean : false;
  const winner      = predData ? (predData as any)[7] as string : "";
  const agent1Pool  = predData ? (predData as any)[3] as bigint : 0n;
  const agent2Pool  = predData ? (predData as any)[4] as bigint : 0n;
  const matchAgent1 = matchDetails ? (matchDetails as any)[0] as string : "";

  const hasWinner    = winner && winner !== "0x0000000000000000000000000000000000000000";
  const userPickWon  = hasWinner && (
    (betOnAgent1 && winner.toLowerCase() === matchAgent1.toLowerCase()) ||
    (!betOnAgent1 && winner.toLowerCase() !== matchAgent1.toLowerCase())
  );

  const a1Type  = a1AgentData ? Number((a1AgentData as any)[1]) : -1;
  const a2Type  = a2AgentData ? Number((a2AgentData as any)[1]) : -1;
  const a1Info  = agentInfo(a1Type);
  const a2Info  = agentInfo(a2Type);
  const pickedInfo = betOnAgent1 ? a1Info : a2Info;

  // Estimated payout
  const winnerPool = betOnAgent1 ? agent1Pool : agent2Pool;
  const loserPool  = betOnAgent1 ? agent2Pool : agent1Pool;
  const netGain    = winnerPool > 0n ? (betAmount * loserPool * 98n / 100n) / winnerPool : 0n;
  const totalPayout = betAmount + netGain;

  function handleClaim() {
    setTxStatus("Claiming…");
    const claimTx = prepareContractCall({
      contract: predictionMarket,
      method: "function claimWinnings(uint256 predictionId) external",
      params: [predictionId],
    });
    sendTransaction(claimTx, {
      onSuccess: () => { setTxStatus("✅ Claimed!"); setTimeout(() => setTxStatus(""), 3000); },
      onError: (e) => setTxStatus(`❌ ${e.message.slice(0, 60)}`),
    });
  }

  return (
    <div className="ui2 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Prediction #{predictionId.toString()}</span>
        <span className={`text-xs px-3 py-1 font-bold ${
          !isSettled ? "text-green-300 bg-green-900/40" :
          userPickWon ? "text-yellow-300 bg-yellow-900/40" : "text-red-400 bg-red-900/30"
        }`}>
          {!isSettled ? "🟢 Active" : userPickWon ? "🏆 Won!" : "💀 Lost"}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Image src="/ships/0-healed-pirate.gif" width={40} height={40} alt="" className="floating-animation" unoptimized />
        <div className="flex-1">
          <div className="text-sm text-white font-bold text-shadow-full-outline">
            Bet on {pickedInfo.emoji} {pickedInfo.alias}
          </div>
          <div className="text-xs text-slate-400">
            {a1Info.emoji} {a1Info.alias} vs {a2Info.emoji} {a2Info.alias}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-yellow-300 text-shadow-full-outline">
            {parseFloat(formatEther(betAmount)).toFixed(1)} SEAS
          </div>
          {!isSettled && (
            <div className="text-xs text-slate-400">
              Est. {parseFloat(formatEther(totalPayout)).toFixed(1)} if win
            </div>
          )}
        </div>
      </div>

      {isSettled && userPickWon && !claimed && (
        <button
          onClick={handleClaim}
          disabled={isPending}
          className="ui3 w-full py-2 text-white font-bold text-sm disabled:opacity-50"
        >
          {isPending ? "⏳ Claiming…" : `🏆 Claim ${parseFloat(formatEther(totalPayout)).toFixed(1)} SEAS`}
        </button>
      )}
      {claimed && <div className="text-center text-xs text-slate-500 py-1">✅ Already claimed</div>}
      {txStatus && <p className="text-xs mt-2 text-slate-300">{txStatus}</p>}
    </div>
  );
}

function MyBetsTab() {
  const { predictionMarket, agentController, wagerArena } = useArenaContracts();
  const account = useActiveAccount();

  const { data: predictionCount } = useReadContract({
    contract: predictionMarket,
    method: "function predictionCounter() view returns (uint256)",
    params: [],
    refetchInterval: 15_000,
  });

  if (!account) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔮</div>
        <p className="text-slate-400 mb-4">Connect your wallet to see your bets.</p>
      </div>
    );
  }

  const count = Number(predictionCount ?? 0n);
  // Check last 30 predictions for user bets
  const recentIds = Array.from({ length: Math.min(count, 30) }, (_, i) => BigInt(count - i)).filter(id => id > 0n);

  if (count === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔮</div>
        <p className="text-slate-400">No predictions have been created yet.</p>
        <p className="text-xs text-slate-500 mt-2">Place bets in the Predict tab to see them here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white text-shadow-full-outline mb-4">🎰 My Active Bets</h2>
      <p className="text-xs text-slate-500 mb-4">Scanning last {recentIds.length} predictions for your bets…</p>
      <div className="space-y-3">
        {recentIds.map(id => (
          <UserBetCard
            key={id.toString()}
            predictionId={id}
            predictionMarket={predictionMarket}
            agentController={agentController}
            wagerArena={wagerArena}
            account={account.address}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// My Battles Tab
// ─────────────────────────────────────────────────────────────

function UserBattleCard({
  matchId,
  wagerArena,
  agentController,
  account,
}: {
  matchId: bigint;
  wagerArena: ReturnType<typeof getContract>;
  agentController: ReturnType<typeof getContract>;
  account: string;
}) {
  const { data: details } = useReadContract({
    contract: wagerArena,
    method: "function getMatchDetails(uint256 matchId) external view returns (address agent1, address agent2, uint256 wagerAmount, bool isAccepted, bool isCompleted, address winner, uint256 rounds)",
    params: [matchId],
  });

  if (!details) return null;

  const [agent1, agent2, wagerAmount, , isCompleted, winner, rounds] = details as [string, string, bigint, boolean, boolean, string, bigint];
  const isAgent1 = agent1.toLowerCase() === account.toLowerCase();
  const isAgent2 = agent2.toLowerCase() === account.toLowerCase();
  if (!isAgent1 && !isAgent2) return null;

  const opponentAddr = isAgent1 ? agent2 : agent1;
  const hasResult = isCompleted && winner && winner !== "0x0000000000000000000000000000000000000000";
  const won = hasResult && winner.toLowerCase() === account.toLowerCase();
  const payout = wagerAmount * 2n * 95n / 100n;

  return (
    <div className={`ui2 p-4 border-l-4 ${
      !isCompleted ? "border-yellow-600" : won ? "border-green-600" : "border-red-700"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Match #{matchId.toString()}</span>
        <span className={`text-xs px-2 py-0.5 font-bold ${
          !isCompleted ? "text-yellow-300 bg-yellow-900/40" :
          won ? "text-green-300 bg-green-900/30" : "text-red-300 bg-red-900/30"
        }`}>
          {!isCompleted ? "⏳ In Progress" : won ? "🏆 Won" : "💀 Lost"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white font-bold text-shadow-full-outline">
            vs {shortAddr(opponentAddr)}
          </div>
          {isCompleted && (
            <div className="text-xs text-slate-400 mt-0.5">{rounds.toString()} rounds</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-yellow-300 text-shadow-full-outline">
            {won ? `+${parseFloat(formatEther(payout)).toFixed(1)}` : `-${parseFloat(formatEther(wagerAmount)).toFixed(1)}`} SEAS
          </div>
          <div className="text-xs text-slate-500">wager: {parseFloat(formatEther(wagerAmount)).toFixed(1)} SEAS</div>
        </div>
      </div>
    </div>
  );
}

function MyBattlesTab() {
  const { wagerArena, agentController } = useArenaContracts();
  const account = useActiveAccount();

  const { data: countData } = useReadContract({
    contract: wagerArena,
    method: "function matchCounter() view returns (uint256)",
    params: [],
    refetchInterval: 15_000,
  });

  if (!account) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⚔️</div>
        <p className="text-slate-400 mb-4">Connect your wallet to see your battle history.</p>
      </div>
    );
  }

  const total = Number(countData ?? 0n);
  // Scan last 50 matches for user participation
  const recentIds = Array.from({ length: Math.min(total, 50) }, (_, i) => BigInt(total - i)).filter(id => id > 0n);

  if (total === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⚔️</div>
        <p className="text-slate-400">No battles yet.</p>
        <p className="text-xs text-slate-500 mt-2">Accept a challenge in the Matches tab to start fighting!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="ui2 p-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <h3 className="font-bold text-white text-shadow-full-outline">My Battle Record</h3>
            <p className="text-xs text-slate-400">Your recent matches. Winnings are paid automatically on-chain.</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">Scanning last {recentIds.length} matches…</p>
      <div className="space-y-3">
        {recentIds.map(id => (
          <UserBattleCard
            key={id.toString()}
            matchId={id}
            wagerArena={wagerArena}
            agentController={agentController}
            account={account.address}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Arena Page
// ─────────────────────────────────────────────────────────────

type Tab = "leaderboard" | "matches" | "predict" | "mybets" | "mybattles";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "leaderboard", label: "Leaderboard", emoji: "🏆" },
  { id: "matches",     label: "Matches",     emoji: "⚔️" },
  { id: "predict",     label: "Predict",     emoji: "🔮" },
  { id: "mybets",      label: "My Bets",     emoji: "🎰" },
  { id: "mybattles",   label: "My Battles",  emoji: "🗡️" },
];

export default function ArenaPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const chain = getActiveChain();
  const { agentController } = useArenaContracts();
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");

  // Fetch leaderboard for ocean scene
  const { data: leaderboardData } = useReadContract({
    contract: agentController,
    method: "function getLeaderboard(uint256 count) external view returns (address[] memory, uint256[] memory)",
    params: [10n],
    refetchInterval: 30_000,
  });

  const lbAddresses: string[] = (leaderboardData as any)?.[0] ?? [];
  const lbElos: bigint[]       = (leaderboardData as any)?.[1] ?? [];

  const seen = new Set<string>();
  const topAgents = lbAddresses
    .map((addr, i) => ({ address: addr, elo: Number(lbElos[i] ?? 0n) }))
    .filter(a => {
      if (a.address === "0x0000000000000000000000000000000000000000") return false;
      if (seen.has(a.address)) return false;
      seen.add(a.address);
      return true;
    })
    .slice(0, 5);

  return (
    <div
      className="h-screen overflow-y-auto text-white"
      style={{ background: "#291414", fontFamily: "inherit" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 border-b border-yellow-900/40"
        style={{ background: "#1a0c0c" }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-yellow-600 hover:text-yellow-400 text-sm transition-colors"
          >
            ← Back
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <div>
              <h1 className="font-bold text-white text-sm text-shadow-full-outline leading-tight">Agent Arena</h1>
              <p className="text-xs text-yellow-800 leading-tight">Seven Seas Protocol · Monad</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Live · ↻15s</span>
          </div>

          {/* Wallet */}
          <ConnectButton
            client={client}
            wallets={WALLETS}
            chain={chain}
            connectModal={{
              size: "compact",
              title: "Connect to Seven Seas",
              welcomeScreen: {
                title: "Seven Seas Protocol",
                subtitle: "Connect your wallet to challenge AI agents and place bets",
                img: { src: "/logo.png", width: 100, height: 100 },
              },
            }}
            theme="dark"
            detailsButton={{
              render: () => (
                <button className="ui1 px-4 py-2 text-white text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    {account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : ""}
                  </div>
                </button>
              ),
            }}
            connectButton={{
              label: "Connect Wallet",
              style: { background: "transparent", color: "#d97706", border: "1px solid #92400e", padding: "6px 12px", fontSize: "12px", cursor: "pointer" },
            }}
          />
        </div>
      </div>

      {/* Ocean scene */}
      <OceanScene
        addresses={topAgents.map(a => a.address)}
        elos={topAgents.map(a => a.elo)}
        agentController={agentController}
      />


      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <div
          className="flex gap-1 p-1 mb-5"
          style={{ background: "#1a0c0c", border: "1px solid #7c2d12" }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? "bg-yellow-900/60 text-yellow-300 text-shadow-full-outline"
                  : "text-yellow-800 hover:text-yellow-500"
              }`}
            >
              <span className="hidden sm:inline">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-12">
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "matches"     && <MatchesTab />}
          {activeTab === "predict"     && <PredictTab />}
          {activeTab === "mybets"      && <MyBetsTab />}
          {activeTab === "mybattles"   && <MyBattlesTab />}
        </div>

        <div className="pb-6 text-center text-xs text-yellow-900">
          Seven Seas Protocol · Built on Monad · Powered by Groq AI
        </div>
      </div>
    </div>
  );
}
