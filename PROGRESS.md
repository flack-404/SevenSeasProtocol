# Seven Seas Protocol — Build Progress

---

## ✅ COMPLETED

### Phase 1 — Monad Network Migration
| File | What changed |
|---|---|
| `hardhat.config.js` | Removed Mantle/Avalanche, added monadTestnet (10143) + monadMainnet (41454) |
| `lib/config.ts` | Monad RPC/explorer URLs, GPM=1s, AGENT_TYPES, nad.fun addresses, all new ABIs |
| `app/libs/providers/thirdweb-provider.tsx` | Monad chains replacing Mantle |
| `app/libs/hooks/useThirdweb.ts` | Monad imports + explorer URLs |
| `app/components/WelcomeScreen.tsx` | "Mantle" → "Monad" throughout |
| `app/components/EcosystemDashboard.tsx` | Agent Arena card + live pulsing badge |
| `app/components/Header.tsx` | Subtitle updated to Monad |
| `app/layout.tsx` | Meta tags for Monad + AI agents |
| `package.json` | deploy/agents/verify scripts added |
| `tsconfig.scripts.json` | Created for Node.js scripts |
| `.env.local` | All keys saved (deployer, 5 agents, Groq, Thirdweb) |
| `.env.example` | Full environment template created |

---

### Phase 2 — Smart Contracts

All contracts compile. Deployed on **Monad Testnet (chainId: 10143)**.

| Contract | Address | Status |
|---|---|---|
| `ArmadaToken.sol` | `0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2` | ✅ Live |
| `ArmadaGuild.sol` | `0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8` | ✅ Live |
| `BattlePass.sol` | `0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB` | ✅ Live |
| `ShipNFT.sol` | `0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC` | ✅ Live |
| `MantleArmada.sol` | `0x13733EFB060e4427330F4Aeb0C46550EAE16b772` | ✅ Live — executeDuel, getShipStats, setArenaContract, GPM=1s |
| `SEASToken.sol` | `0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6` | ✅ Live — ERC-20 faucet (10K SEAS/claim) |
| `AgentController.sol` | `0x88e079fC030950a32EF2B806376007837B24e62c` | ✅ Live — MIN_WAGER = 1 SEAS |
| `WagerArena.sol` | `0xB98c6FC37465dC2648a2Aa423Fb747C87C43c108` | ✅ Live — MIN_WAGER = 1 SEAS |
| `TournamentArena.sol` | `0xac8DfFBCF084bb67c94D75C826ed2701456de29C` | ✅ Live |
| `PredictionMarket.sol` | `0x960332535838BF5E0EA4f973d44d632551218B3f` | ✅ Live — wired to new WagerArena |

---

### Phase 3 — Deployment Scripts

| Script | Purpose | Status |
|---|---|---|
| `scripts/deploy-monad.js` | Full deploy from scratch (all 10 contracts) | ✅ Ready |
| `scripts/wire-monad.js` | Resume/setup script — wires permissions, funds agents, registers agents | ✅ Used successfully |
| `scripts/redeploy-arena.js` | Targeted redeploy for WagerArena + AgentController + PredictionMarket | ✅ Ready — waiting for deployer MON |

---

### Phase 4 — AI Agent Runner (`scripts/run-agents.ts`)

| Item | Status |
|---|---|
| 5 Groq-powered agents (llama-3.3-70b-versatile) | ✅ |
| All 13 action types implemented | ✅ |
| Agent wallets funded on-chain | ✅ Each has ~2.5 MON gas + 9K SEAS |
| Game accounts created (all 5) | ✅ |
| AgentController registration | ✅ (old contract — will auto re-register on redeploy) |
| ABI decode bug fixed (tuple → flat return values) | ✅ |
| Wager normalisation (Groq returns whole SEAS, clamped [1, 1000]) | ✅ |
| TournamentArena + PredictionMarket wired into runner | ✅ |
| TypeScript diagnostics | ✅ Zero errors/warnings |

**13 actions agents can execute:**
1. `wager_battle` — Create wager match
2. `accept_match` — Accept open challenge
3. `execute_battle` — Force-execute accepted match
4. `claim_gpm` — Claim GPM gold
5. `repair_ship` — Repair wrecked ship
6. `hire_crew` — Hire crew at port
7. `upgrade` — Buy ship upgrade (8 types)
8. `check_in` — Daily check-in for XP/gold
9. `join_tournament` — Enter bracket tournament
10. `place_bet` — Bet SEAS on match outcome
11. `claim_winnings` — Claim prediction market payout
12. `deposit_bankroll` — Top up AgentController bankroll
13. `cancel_match` — Cancel unaccepted match

**5 Agent personalities:**
| Alias | Type | Strategy |
|---|---|---|
| Blackbeard 🏴‍☠️ | AggressiveRaider | High-risk, large wagers, attacks constantly |
| Ironclad ⚓ | DefensiveTrader | Conservative, only fights when heavily favoured |
| TheGhost 👻 | AdaptiveLearner | Kelly Criterion bankroll, tracks opponent history |
| Admiralty 🎖️ | GuildCoordinator | Guild-focused, builds crew, medium risk |
| Tempest 🌊 | BalancedAdmiral | Adapts to meta, balanced approach |

---

### Phase 5 — Arena Frontend

| File | Status |
|---|---|
| `app/arena/page.tsx` | ✅ 4-tab page: Leaderboard, Matches, Tournaments, Predict |
| `app/page.tsx` | ✅ Floating `⚔️ Arena` button added (shows to all connected wallets) |
| `app/components/EcosystemDashboard.tsx` | ✅ Clickable Arena card with live pulsing indicator |

**Arena tabs:**
- **Leaderboard** — Live ELO rankings, agent emoji + archetype, gold/silver/bronze medals
- **Matches** — Open + recent match feed with wager amounts, create challenge button
- **Tournaments** — Active bracket list with fill progress, create tournament button
- **Predict** — Open predictions with pool bars (Agent1% vs Agent2%), bet + claim winnings

---

## ✅ ALL CORE WORK COMPLETE

All contracts deployed, wired, and live on Monad Testnet.
Agents are running and battling autonomously.

### To start agents
```bash
pnpm run agents:start
```

### To start frontend
```bash
pnpm run dev
```
Visit `http://localhost:3000/arena` to see the live arena.

---

## Live Stats (as of last run)
```
🌊 Tempest    — 5W/0L  ELO: 1100  Bankroll: 770 SEAS  🔥 UNDEFEATED
🏴‍☠️ Blackbeard — 4W/3L  ELO: 1035  Bankroll: 835 SEAS
🎖️ Admiralty  — 3W/4L  ELO: 1000  Bankroll: 154 SEAS
👻 TheGhost   — 2W/4L  ELO:  980  Bankroll: 358 SEAS
⚓ Ironclad   — 0W/4L  ELO:  940  Bankroll: 360 SEAS
```

---

## 🟡 OPTIONAL IMPROVEMENTS

| Item | Description |
|---|---|
| Auto-refresh in Arena frontend | Add 15s polling on leaderboard/matches tabs |
| Full agent stats on leaderboard | Batch-fetch `getAgentStats()` for wins/losses/bankroll display |
| nad.fun token launch | Manual step — launch `$SEAS` on nad.fun mainnet bonding curve, replace `SEAS_TOKEN_ADDRESS` in env |
| Contract verification | `pnpm run verify:monad-testnet <address>` for each contract |
| Tournament auto-advance | Agents periodically call `advanceRound()` on active tournaments |
| Agent stat history | Log agent decisions + outcomes to a local JSON for analytics |

---

## Wallet Addresses (Monad Testnet)

| Wallet | Address | Role |
|---|---|---|
| Deployer | `0x54c9e5C8AA645b35Ab64332b8cE08F85ae4B92A3` | Contract owner, treasury |
| Blackbeard | `0xE74686Fd89ACB480B3903724C367395d86ED4519` | Agent 0 — AggressiveRaider |
| Ironclad | `0x73A5021c0935b79D46C2D650821b212dC5b3b9Eb` | Agent 1 — DefensiveTrader |
| TheGhost | `0xe376319f23B7c5910e776737e1a024AcD153e109` | Agent 2 — AdaptiveLearner |
| Admiralty | `0x9b565aa96A04AAb438d0930Ae2E8D3389b679C04` | Agent 3 — GuildCoordinator |
| Tempest | `0xF3e2398f1E035519a4a0B6d4a11013218D0E59D6` | Agent 4 — BalancedAdmiral |
