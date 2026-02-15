# Seven Seas Protocol — Development Update
**Moltiverse Hackathon | Monad Blockchain**
**Last updated: 2026-02-15**

---

## Overview

Seven Seas Protocol is an on-chain pirate battle game on Monad where autonomous AI agents compete in real-time wager battles. Players can spectate, challenge agents, bet on outcomes via a prediction market, and earn SEAS tokens. The project started as a Mantle-network codebase and was fully migrated to Monad with new contracts, AI agent infrastructure, and a live arena frontend.

**Live repo:** https://github.com/flack-404/SevenSeasProtocol

---

## Phase 1 — Monad Network Migration ✅

Migrated the entire codebase from Mantle testnet to Monad.

| File | Change |
|---|---|
| `hardhat.config.js` | Removed Mantle/Avalanche networks, added `monadTestnet` (chainId 10143) + `monadMainnet` (chainId 41454) |
| `lib/config.ts` | Monad RPC/explorer URLs, GPM=1s block time, AGENT_TYPES enum, nad.fun addresses, all new contract ABIs |
| `app/libs/providers/thirdweb-provider.tsx` | Swapped Mantle chains for Monad chains via Thirdweb v5 |
| `app/libs/hooks/useThirdweb.ts` | Monad imports + explorer URL helpers |
| `app/components/WelcomeScreen.tsx` | "Mantle" → "Monad" rebranding throughout |
| `app/components/EcosystemDashboard.tsx` | Agent Arena card added with live pulsing badge |
| `app/components/Header.tsx` | Subtitle updated to Monad |
| `app/layout.tsx` | Meta tags updated for Monad + AI agents |
| `package.json` | `deploy`, `agents:testnet`, `agents:mainnet`, `verify` scripts added |
| `tsconfig.scripts.json` | New tsconfig for Node.js scripts (ts-node) |
| `.env.local` | All keys — deployer, 5 agent wallets, Groq API key, Thirdweb client ID |
| `.env.example` | Full environment template with nad.fun mainnet token placeholders |

---

## Phase 2 — Smart Contracts ✅

All 10 contracts compiled and deployed on **Monad Testnet (chainId 10143)**.

| Contract | Address | Description |
|---|---|---|
| `ArmadaToken.sol` | `0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2` | In-game ERC-20 (ARMD) |
| `ArmadaGuild.sol` | `0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8` | Guild system |
| `BattlePass.sol` | `0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB` | Season battle pass |
| `ShipNFT.sol` | `0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC` | Ship NFT collection |
| `MantleArmada.sol` | `0x13733EFB060e4427330F4Aeb0C46550EAE16b772` | Core game engine |
| `SEASToken.sol` | `0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6` | SEAS ERC-20 (testnet faucet: 10K/claim) |
| `AgentController.sol` | `0x88e079fC030950a32EF2B806376007837B24e62c` | AI agent registry + bankroll |
| `WagerArena.sol` | `0xB98c6FC37465dC2648a2Aa423Fb747C87C43c108` | 1v1 wager battle engine |
| `TournamentArena.sol` | `0xac8DfFBCF084bb67c94D75C826ed2701456de29C` | Bracket tournament system |
| `PredictionMarket.sol` | `0x960332535838BF5E0EA4f973d44d632551218B3f` | Bet on match outcomes |

### New contracts written from scratch

**`SEASToken.sol`** — Simple ERC-20 for the testnet. Has a `claimFaucet()` function giving 10,000 SEAS per call. On mainnet this is replaced by a token launched on nad.fun (Monad's token launchpad).

**`AgentController.sol`** — Manages AI agent registration and bankrolls.
- Agents register with an initial SEAS bankroll (`MIN_BANKROLL = 100 SEAS`)
- Tracks ELO rating, wins, losses, total wagers per agent
- Deactivates agents when bankroll drops below `MIN_BANKROLL` (`isActive = false`)
- Deactivated agents can re-register to reactivate
- `getLeaderboard(count)` returns top agents by ELO for the frontend

**`WagerArena.sol`** — Runs 1v1 SEAS wager battles.
- `createMatch(wagerAmount)` — challenger locks SEAS into escrow
- `acceptMatch(matchId)` — opponent locks matching SEAS
- `executeBattle(matchId)` — resolves match via `MantleArmada.executeDuel()`, pays winner 95% of pot (5% protocol fee)
- `getOpenMatches()` — returns all pending matchIds waiting for an opponent

**`TournamentArena.sol`** — Bracket tournaments with configurable entry fees and participant caps.

**`PredictionMarket.sol`** — Prediction market linked to WagerArena matches.
- A prediction pool is created automatically when a match is created
- Players bet SEAS on either agent before the match executes
- Winners claim from the loser pool proportionally after match settlement

### MantleArmada.sol updates
- Added `executeDuel(address attacker, address defender)` — deterministic battle resolution used by WagerArena
- Added `getShipStats(address player)` — returns HP/attack/defense/crew for arena display
- Added `setArenaContract(address arena)` — owner-only, authorises WagerArena to trigger duels
- GPM timing set to 1 second (Monad block time) for demo speed

---

## Phase 3 — Deployment Scripts ✅

| Script | Purpose |
|---|---|
| `scripts/deploy-monad.js` | Full deploy from scratch — deploys all 10 contracts in order, wires permissions, saves addresses |
| `scripts/wire-monad.js` | Resume/setup script — wires contract permissions, funds agent wallets, registers all 5 agents |
| `scripts/redeploy-arena.js` | Targeted redeploy for WagerArena + AgentController + PredictionMarket only |
| `scripts/fix-registration.js` | Re-registers deactivated agents (TheGhost / Admiralty) when bankroll drops below MIN_BANKROLL |
| `scripts/check-balance.js` | Checks MON + SEAS balances for all agent wallets |
| `scripts/update-addresses.js` | Syncs deployed-addresses JSON to `.env.local` and `lib/config.ts` |

---

## Phase 4 — AI Agent Runner ✅

**`scripts/run-agents.ts`** — Autonomous AI fleet. Runs 5 pirate agents on Monad testnet simultaneously. Each agent has its own wallet, reads on-chain state, calls Groq LLM for decisions, and executes transactions.

**Architecture:**
```
Every 30 seconds per agent:
  1. Read game state from MantleArmada (HP, gold, GPM, location, etc.)
  2. Read agent state from AgentController (bankroll, ELO, wins/losses)
  3. Read open matches from WagerArena
  4. Build compact prompt → call Groq llama-3.3-70b-versatile
  5. Parse JSON decision from LLM response
  6. Sanity overrides (block impossible actions)
  7. Execute decision on-chain
```

**13 actions agents can execute:**

| Action | Contract | Description |
|---|---|---|
| `wager_battle` | WagerArena | Create a new wager match |
| `accept_match` | WagerArena | Accept an existing open challenge |
| `execute_battle` | WagerArena | Force-resolve an accepted match |
| `claim_gpm` | MantleArmada | Claim accumulated GPM gold |
| `repair_ship` | MantleArmada | Repair damaged ship |
| `hire_crew` | MantleArmada | Hire crew (only at port) |
| `upgrade` | MantleArmada | Buy a ship upgrade (8 upgrade types) |
| `check_in` | MantleArmada | Daily check-in for XP/streak bonus |
| `join_tournament` | TournamentArena | Enter a bracket tournament |
| `place_bet` | PredictionMarket | Bet SEAS on a match outcome |
| `claim_winnings` | PredictionMarket | Claim prediction market payout |
| `deposit_bankroll` | AgentController | Top up SEAS bankroll |
| `idle` | — | Skip this cycle |

**Sanity override system** — Pre-execution guards that correct impossible LLM decisions:
- `claim_gpm` when `claimableGold = 0` → overridden to fallback decision
- `hire_crew` when not at port → overridden to fallback decision
- Float wager amounts (e.g. `253.94`) → `Math.floor()` before BigInt conversion
- Auto re-register when agent is deactivated (`isRegistered = false`)
- Proactive bankroll top-up when bankroll < 200 SEAS

**Fallback rule-based system** — When Groq daily limit (100K TPD) is exhausted, each agent falls back to hardcoded rules matching their archetype. No downtime.

---

## Phase 5 — Arena Frontend ✅

**`app/arena/page.tsx`** — Live spectator + player interface.

### Components built

**`AgentRow`** — Live agent card in the leaderboard.
- Reads `getAgentStats()` + `agents()` from AgentController
- Shows: name, emoji, ELO, wins/losses, win rate %, SEAS bankroll
- Auto-refreshes every 15 seconds

**`BattleFeedEntry`** — Single completed match log entry.
- Shows: match ID, challenger vs opponent, wager size, winner (highlighted green), payout = `wager × 2 × 0.95`

**`BattleFeed`** — Live rolling battle history.
- Fetches `getRecentMatches(15)` from WagerArena
- Renders BattleFeedEntry list below leaderboard
- Pulsing "LIVE" indicator
- Auto-refreshes every 10 seconds

**`MatchCard`** — Open match display with challenge button.
- Shows agent name/emoji/ELO for the challenger
- Green "⚔ Challenge this Agent" button for players to join open matches
- Full flow: approve SEAS → `acceptMatch()` → `executeBattle()`
- Shows "Waiting for challenger…" with estimated wait time for unwanted matches

**`SEASFaucetButton`** — Claims test SEAS from `SEASToken.claimFaucet()`.

### Tabs
- **Leaderboard** — Agent rankings + BattleFeed
- **Matches** — Open challenges waiting for opponents
- **Predictions** — Active prediction markets with bet interface
- **Tournaments** — Bracket listings

### Auto-refresh
All `useReadContract` calls use TanStack Query's `refetchInterval`:
- Match data: every **10 seconds**
- Leaderboard / predictions: every **15 seconds**
- Header shows "Live · ↻15s"

---

## Infrastructure & DevOps ✅

**Agent wallets (all funded):**
| Agent | MON (gas) | SEAS |
|---|---|---|
| Blackbeard | ~2 MON | ~9000 SEAS |
| Ironclad | ~2 MON | ~9000 SEAS |
| TheGhost | ~2 MON | ~9000 SEAS |
| Admiralty | ~2 MON | ~9000 SEAS |
| Tempest | ~2 MON | ~9000 SEAS |

**GitHub:** Pushed to `flack-404/SevenSeasProtocol` via SSH alias `github-account2`.
- 503 files, 90,750 insertions
- `.env.local` gitignored — no secrets committed

---

## Live Stats (at last session)

| Agent | W | L | ELO | Bankroll |
|---|---|---|---|---|
| Tempest 🌊 | 33 | 0 | 1660 | ~3001 SEAS |
| Blackbeard 🏴‍☠️ | active | — | — | ~500 SEAS |
| Ironclad ⚓ | active | — | — | ~500 SEAS |
| TheGhost 👻 | active | — | — | ~500 SEAS |
| Admiralty 🎖️ | active | — | — | ~500 SEAS |

---

## Known Issues Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| `isRegistered: false` for TheGhost/Admiralty | Bankroll dropped below `MIN_BANKROLL = 100 SEAS` after early losses → contract set `isActive = false` | `fix-registration.js` re-registers with 500 SEAS; agent runner auto re-registers |
| `Cannot convert 253.94 to a BigInt` | Groq returns float wager amounts | `Math.floor(parseFloat())` before BigInt |
| Unterminated JSON from Groq | `max_tokens = 120` too small for full response | Increased to `200` |
| `claim_gpm` spam when claimable = 0 | LLM pattern-matches "claim gold = good" regardless of state | Pre-execution override block |
| `hire_crew` fails "Must be at port" | LLM ignores location state | Pre-execution override block |
| Nonce collisions on agent wallets | Multiple `ts-node` processes running simultaneously on same wallets | `kill -9` all processes, clean restart |
| "Signer had insufficient balance" | Agent wallets low on MON for gas | Topped all agents to 2+ MON |

---

## Remaining / Optional

| Item | Notes |
|---|---|
| **Frontend deploy** | `pnpm build` + Vercel deploy for public URL |
| **nad.fun mainnet launch** | Launch SEAS on nad.fun, swap `NEXT_PUBLIC_SEAS_TOKEN_ADDRESS` in `.env.local` |
| **Groq paid plan** | Free tier hits 100K TPD — paid plan gives uninterrupted LLM decisions |
| **Agent MON top-ups** | Each agent consumes ~0.01–0.05 MON per decision; top up wallets periodically |
