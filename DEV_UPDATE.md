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

All 10 contracts compiled and deployed on **Monad Testnet (chainId 10143) — Anvil local fork**.

| Contract | Address | Description |
|---|---|---|
| `ArmadaToken.sol` | `0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2` | In-game ERC-20 (ARMD) |
| `ArmadaGuild.sol` | `0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8` | Guild system |
| `BattlePass.sol` | `0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB` | Season battle pass |
| `ShipNFT.sol` | `0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC` | Ship NFT collection |
| `MantleArmada.sol` | `0x13733EFB060e4427330F4Aeb0C46550EAE16b772` | Core game engine |
| `SEASToken.sol` | `0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6` | SEAS ERC-20 (testnet faucet: 10K/claim) |
| `AgentController.sol` | `0xBF60991F0EB51917D2a00563265160F963AC2F27` | AI agent registry + bankroll _(redeployed v3)_ |
| `WagerArena.sol` | `0x629A3d5f01B554eE497803a6A2Af25B72e08180C` | 1v1 wager battle engine _(redeployed v3 — player challenge + 90s window)_ |
| `TournamentArena.sol` | `0xac8DfFBCF084bb67c94D75C826ed2701456de29C` | Bracket tournament system |
| `PredictionMarket.sol` | `0xbF9f25065f3db96C6aE748Bfb3f6FF17a2096997` | Bet on match outcomes _(redeployed v3)_ |

### New contracts written from scratch

**`SEASToken.sol`** — Simple ERC-20 for the testnet. Has a `claimFaucet()` function giving 10,000 SEAS per call. On mainnet this is replaced by a token launched on nad.fun (Monad's token launchpad).

**`AgentController.sol`** — Manages AI agent registration and bankrolls.
- Agents register with an initial SEAS bankroll (`MIN_BANKROLL = 100 SEAS`)
- Tracks ELO rating, wins, losses, total wagers per agent
- Deactivates agents when bankroll drops below `MIN_BANKROLL` (`isActive = false`)
- Deactivated agents can re-register to reactivate
- `getLeaderboard(count)` returns top agents by ELO for the frontend

**`WagerArena.sol`** — Runs 1v1 SEAS wager battles.
- `createMatch(wagerAmount)` — challenger locks SEAS into escrow; open to any wallet (not just registered agents)
- `acceptMatch(matchId)` — opponent locks matching SEAS; no agent registration required
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

**90-second battle window** — After an agent accepts a match, `executeBattle` is intentionally delayed by 90 seconds (`BATTLE_WINDOW_MS = 90_000`). This keeps the prediction market open so spectators can place bets before the outcome is revealed.

**Orphaned match recovery** — On startup, `recoverPendingMatches()` scans the last 30 matches for accepted-but-not-completed matches involving this agent. Recovered matches skip the 90s wait and execute immediately.

---

## Phase 5 — Arena Frontend ✅

**`app/arena/page.tsx`** — Live spectator + player interface.

### Components built

**`OceanScene`** — Full-width ocean backdrop at top of arena page.
- `sky.gif` tiled horizontally with `background: center top/auto 300px repeat-x`
- 5 `AgentShipCard` components floating in the scene (pirate ship GIFs with `floating-animation` CSS)
- `ocean_l2.gif` + `ocean_l1.gif` layered over sky for depth effect matching the main game
- Each card shows agent emoji, name, ELO, win/loss record

**`BattleModal`** — Popup battle scene matching main game's `BattleScene.tsx`.
- Sky tiled, left ship vs right ship (right ship mirrored with `scale-x-[-1]`)
- `explosion.gif` triggers at round 2 and round 5 (fresh `?t=Date.now()` query param forces reload)
- Damage numbers with `damage-animation` CSS class
- `ocean_l2.gif` (50% opacity, flipped) + `ocean_l1.gif` foreground
- `ui2` title banner + live status message bar below ships
- **Win/Lose result overlay**: green (🏆 YOU WON) or red (💀 YOU LOST) full overlay shown after battle completes, with payout amount displayed for wins

**`AgentRow`** — Live agent card in the leaderboard.
- Reads `getAgentStats()` + `agents()` from AgentController
- Shows: name, emoji, ELO, wins/losses, win rate %, SEAS bankroll
- `ui2` pixel-art panel + `text-shadow-full-outline` headers
- Auto-refreshes every 15 seconds

**`BattleFeedEntry`** — Single completed match log entry.
- Shows: match ID, challenger vs opponent, wager size, winner (highlighted green), payout = `wager × 2 × 0.95`

**`BattleFeed`** — Live rolling battle history.
- Fetches `getRecentMatches(15)` from WagerArena
- Renders BattleFeedEntry list below leaderboard
- Pulsing "LIVE" indicator
- Auto-refreshes every 10 seconds

**`MatchCard`** — Open match display with challenge button.
- Pure display component — all battle state lives at `MatchesTab` level (prevents modal from closing when match leaves the open list)
- Shows agent name/emoji/ELO for the challenger
- Green "⚔ Challenge this Agent" button triggers `onChallenge` callback in parent
- "Waiting for challenger…" displayed for unchallenged matches
- **"Post a Wager" form removed** — players only interact with agent-created open challenges

**`PredictionCard`** — Prediction market entry card.
- Active predictions: full bet interface with pool amounts and odds
- Settled predictions: compact card showing winner and final pool (no longer returns `null` — settled predictions remain visible as history)

**`MyBetsTab`** — User's prediction history.
- Scans last 30 predictions via `getBet(predictionId, userAddress)`
- Shows bet amount, side chosen, estimated payout
- Claim button for won-but-unclaimed bets

**`UserBattleCard`** — Single battle history entry for the user.
- Shows match ID, opponent, wager amount, outcome (WON / LOST), SEAS gained or lost

**`MyBattlesTab`** — New tab showing user's complete battle history.
- Scans last 50 matches via `getMatchDetails(matchId)` for matches where user participated
- Renders `UserBattleCard` for each matching match
- Shows total W/L record and net SEAS gain/loss

### ConnectButton
- `ConnectButton` from `thirdweb/react` added to arena header
- Shares `ThirdwebProvider` state with homepage via `app/layout.tsx` — wallet connected on homepage is automatically connected in arena

### Tabs
- **Leaderboard** — Agent rankings + BattleFeed
- **Matches** — Open agent challenges; player accepts via BattleModal; win/lose popup shown after battle
- **Predict** — Active + recently settled prediction markets with bet interface
- **My Bets** — User's prediction history + claim interface
- **My Battles** — User's wager battle history showing outcomes and net SEAS

### Battle result polling
Battle completion is detected via `useReadContract` hook with `refetchInterval: 5_000` (active only while watching a match). A `useEffect` watches the hook data for `isCompleted === true` and then:
1. Checks `winner` address against connected wallet
2. Sets `battleResult` to `"win"` or `"lose"`
3. Displays the result overlay in `BattleModal`

This replaced an earlier approach using `setInterval` + standalone `readContract` which failed silently due to closure context issues.

### Auto-refresh
All `useReadContract` calls use TanStack Query's `refetchInterval`:
- Match data: every **10 seconds**
- Leaderboard / predictions: every **15 seconds**
- Header shows "Live · ↻15s"

---

## Phase 6 — Arena UX & Agent Improvements ✅

### Frontend UX

| Change | Details |
|---|---|
| **Win/Lose result popup** | After `executeBattle` completes, `BattleModal` shows full-screen green/red overlay with 🏆 YOU WON or 💀 YOU LOST, payout amount, and close button |
| **My Battles tab** | New tab scans last 50 matches for user participation; shows W/L per battle, net SEAS, opponent name |
| **Removed "Post a Wager" form** | Players no longer post their own challenges — they only accept open agent challenges |
| **Settled prediction cards** | `PredictionCard` no longer returns `null` for settled predictions; renders compact settled view so history is visible |
| **Battle modal state lifted** | All `BattleModal` state moved from `MatchCard` to `MatchesTab`; modal survives match card unmounting when match is accepted/removed from open list |
| **Human-readable errors** | `friendlyError()` decodes common revert signatures: `0xe450d38c` → "Insufficient SEAS — claim tokens from the faucet above" |

### Agent runner improvements

| Change | Details |
|---|---|
| **90-second battle window** | `BATTLE_WINDOW_MS = 90_000` — agents wait 90s after accepting before calling `executeBattle`, keeping prediction market open |
| **Orphaned match recovery** | `recoverPendingMatches()` on startup — scans last 30 matches and immediately executes any accepted-but-stuck matches from previous runs |
| **Correct local RPC** | `MONAD_RPC_URL_TESTNET` changed to `http://127.0.0.1:8545` so agents write to Anvil fork instead of real testnet |

### Contract changes (v3 redeploy)

`WagerArena.sol` patched to allow regular player wallets (not just registered agents):
```solidity
function createMatch(uint256 wagerAmount) external nonReentrant returns (uint256 matchId) {
    require(wagerAmount >= MIN_WAGER, "Wager below minimum (1 SEAS)");
    require(wagerAmount <= MAX_WAGER, "Wager above maximum (1000 SEAS)");
    // Only check bankroll for registered agents; regular players just need the SEAS transfer to succeed
    if (agentController.isRegistered(msg.sender)) {
        (uint256 bankroll,,,,) = agentController.getAgentStats(msg.sender);
        require(bankroll >= wagerAmount, "Insufficient bankroll");
    }
    require(seasToken.transferFrom(msg.sender, address(this), wagerAmount), "SEAS transfer failed");
```

New addresses after v3 redeploy (updated in `.env.local` + `deployed-addresses-monad-10143.json`):
- `AgentController`:  `0xBF60991F0EB51917D2a00563265160F963AC2F27`
- `WagerArena`:       `0x629A3d5f01B554eE497803a6A2Af25B72e08180C`
- `PredictionMarket`: `0xbF9f25065f3db96C6aE748Bfb3f6FF17a2096997`

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
| Blackbeard 🏴‍☠️ | 18 | 6 | 1270 | ~1713 SEAS |
| Ironclad ⚓ | 6 | 36 | 580 | ~252 SEAS |
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
| Duplicate agent rows in Leaderboard tab | `getLeaderboard` returns duplicate addresses | Added `seen = new Set<string>()` dedup filter in frontend |
| Arena page cannot scroll | `html, body { overflow: hidden }` in `globals.css` affects all pages | Arena outer div set to `h-screen overflow-y-auto` |
| `sky.gif` renders as a small center rectangle | `background: center/auto 100% no-repeat` only renders at native GIF width | Changed to `center top/auto 300px repeat-x` to tile horizontally |
| `placeBet` calls silently failing | `placeBet(predictionId, betSide)` — missing `amount` 3rd param in ABI string | Fixed to `placeBet(uint256, bool, uint256)` with `params: [predictionId, betSide, amount]` |
| `Error fetching upgrades: {}` | `getUpgradeCost` / `getPurchaseCount` fall back to `account.address` which is undefined when `playerAccount` is null | Added `\|\| !playerAccount` guard in `fetchUpgrades` early return |
| ❌ "Not a registered agent" — players cannot challenge agents | `WagerArena.createMatch` required `isRegistered(msg.sender)` + AgentController bankroll check | Patched contract: non-agents skip bankroll check, SEAS `transferFrom` is the only payment gate. Redeployed v3. |
| "No agents registered yet" on arena frontend | Frontend reads went to real Monad testnet RPC; contracts were on Anvil fork | Added `NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:8545` env var; `thirdweb-provider.tsx` reads it instead of hardcoding testnet URL |
| Battle modal closes immediately after `acceptMatch` | `MatchCard` was inside `openIds.map()` — when match was accepted it left the open list, component unmounted, all modal state lost | Lifted all battle state to `MatchesTab` level; `MatchCard` is now a pure display component with `onChallenge` callback |
| `0xe450d38c` raw error shown to user | OpenZeppelin `ERC20InsufficientBalance` custom error not in ABI string used by `acceptMatch` flow | Added `friendlyError()` function that matches known error signatures to readable messages |
| Battle result popup never appears (stays open indefinitely) | `readContract` standalone function inside `setInterval` failed silently — empty `catch {}` swallowed all errors | Replaced with `useReadContract` hook + `useEffect`; hook uses `refetchInterval: 5_000` conditionally; effect fires when `isCompleted` becomes true |
| Accepted matches never execute after agent restart | `pendingMatchIds` and `acceptedAtMs` are in-memory only — cleared on restart; accepted matches become orphaned | Added `recoverPendingMatches()` called on loop start; immediately executes any accepted-not-completed matches involving this agent |
| 41 predictions showing but list appears empty | All predictions were settled; `PredictionCard` returned `null` for settled entries | Settled predictions now render as compact read-only cards showing winner and final pool size |

---

## Remaining / Optional

| Item | Notes |
|---|---|
| **Frontend deploy** | `pnpm build` + Vercel deploy for public URL |
| **nad.fun mainnet launch** | Launch SEAS on nad.fun, swap `NEXT_PUBLIC_SEAS_TOKEN_ADDRESS` in `.env.local` |
| **Groq paid plan** | Free tier hits 100K TPD — paid plan gives uninterrupted LLM decisions |
| **Agent MON top-ups** | Each agent consumes ~0.01–0.05 MON per decision; top up wallets periodically |

---

## Local RPC (Anvil Fork) — Configuration Guide

When running against a **local Anvil fork** instead of real Monad testnet or mainnet, every component that makes network requests must point to `http://127.0.0.1:8545`. Below is a complete checklist.

### Start Anvil

```bash
anvil --fork-url https://testnet-rpc.monad.xyz --chain-id 10143 --port 8545
```

Keep this terminal running. Every other tool below connects to it.

---

### 1. `.env.local` — 3 variables

```env
# Frontend reads (Next.js server + client)
NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:8545

# Agent runner reads + writes
MONAD_RPC_URL_TESTNET=http://127.0.0.1:8545

# Hardhat deploy/script RPC (used by hardhat.config.js url field)
# hardhat.config.js reads this automatically via process.env
```

`NEXT_PUBLIC_MONAD_RPC_URL` and `MONAD_RPC_URL_TESTNET` are the two that matter most. The Hardhat config already reads `MONAD_RPC_URL_TESTNET` for its `monadTestnet` network URL.

---

### 2. MetaMask (browser wallet) — Manual step

MetaMask manages its own RPC per network independently of your app's `.env.local`.

1. Open MetaMask → Settings → Networks
2. Find "Monad Testnet" (chainId 10143)
3. Change RPC URL from `https://testnet-rpc.monad.xyz` to `http://127.0.0.1:8545`
4. Save

> Without this step, transactions (approve SEAS, acceptMatch, etc.) go to the real testnet and will fail with "Transaction fee too low" or "nonce mismatch" unless your wallet has real MON.

---

### 3. `app/libs/providers/thirdweb-provider.tsx` — Already handled via env var

The Monad chain definition reads `NEXT_PUBLIC_MONAD_RPC_URL`:

```tsx
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
  ...
});
```

Setting `NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:8545` in `.env.local` is sufficient — no code change needed.

---

### 4. `hardhat.config.js` — Already handled via env var

```js
monadTestnet: {
  url: process.env.MONAD_RPC_URL_TESTNET || "https://testnet-rpc.monad.xyz",
  chainId: 10143,
  accounts: [process.env.PRIVATE_KEY],
},
```

Setting `MONAD_RPC_URL_TESTNET=http://127.0.0.1:8545` is sufficient.

---

### 5. Agent runner (`scripts/run-agents.ts`) — Already handled via env var

```ts
const RPC_URL = process.env.MONAD_RPC_URL_TESTNET || "https://testnet-rpc.monad.xyz";
const provider = new ethers.JsonRpcProvider(RPC_URL);
```

Setting `MONAD_RPC_URL_TESTNET=http://127.0.0.1:8545` is sufficient.

---

### 6. Fund wallets on Anvil

Anvil forks copy on-chain state but your local wallets start at 0 MON. Use `anvil_setBalance` to fund them:

```bash
# Fund deployer wallet
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"anvil_setBalance","params":["<YOUR_WALLET_ADDRESS>","0x56BC75E2D63100000"],"id":1}'

# 0x56BC75E2D63100000 = 100 ETH/MON in wei
```

Use the same command for each agent wallet (`AGENT_PRIVATE_KEY_0` through `_4`) by deriving their addresses first:
```bash
node -e "const {Wallet} = require('ethers'); console.log(new Wallet(process.env.AGENT_PRIVATE_KEY_0).address)"
```

---

### 7. Re-deploy contracts (if Anvil was restarted)

Anvil state is lost on restart unless you use `--state` persistence. After a restart:

```bash
# Full redeploy
pnpm hardhat run scripts/deploy-monad.js --network monadTestnet

# OR targeted redeploy (arena contracts only)
pnpm hardhat run scripts/redeploy-arena.js --network monadTestnet

# Wire permissions + register agents
pnpm hardhat run scripts/wire-monad.js --network monadTestnet
```

Then update `.env.local` with the new addresses from `deployed-addresses-monad-10143.json`.

---

### Switching back to real testnet / mainnet

Reverse the checklist:

| Component | Testnet value | Mainnet value |
|---|---|---|
| `NEXT_PUBLIC_MONAD_RPC_URL` | `https://testnet-rpc.monad.xyz` | `https://rpc.monad.xyz` |
| `MONAD_RPC_URL_TESTNET` | `https://testnet-rpc.monad.xyz` | _(use `MONAD_RPC_URL_MAINNET`)_ |
| MetaMask RPC | `https://testnet-rpc.monad.xyz` | `https://rpc.monad.xyz` |
| Contract addresses | testnet addresses | mainnet addresses |
| `NEXT_PUBLIC_SEAS_TOKEN_ADDRESS` | deployed `SEASToken.sol` | nad.fun token address |
| Agent wallets | fund via `anvil_setBalance` | send real MON via bridge/faucet |
