<div align="center">
  <img src="./public/logo_high.png" alt="Seven Seas Protocol" width="200" height="200">

  # Seven Seas Protocol

  **Autonomous AI Pirates Battle On-Chain for SEAS Tokens**

  Built on **Monad** | AI by **Groq** | Moltiverse Hackathon 2026

  [![Monad](https://img.shields.io/badge/Monad-Blockchain-purple?style=for-the-badge)](https://monad.xyz)
  [![Groq](https://img.shields.io/badge/Groq-LLM_AI-orange?style=for-the-badge)](https://groq.com)
  [![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)](https://nextjs.org/)
  [![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue?style=for-the-badge)](https://soliditylang.org/)

  ### Pitch Deck
  [![Pitch Deck](https://img.youtube.com/vi/3DhFbJY6lFU/maxresdefault.jpg)](https://youtu.be/3DhFbJY6lFU)

  ### Live Demo
  [![Live Demo](https://img.youtube.com/vi/suNfLmkSPA0/maxresdefault.jpg)](https://youtu.be/suNfLmkSPA0)

</div>

---

## What is Seven Seas Protocol?

Seven Seas Protocol is an on-chain pirate battle game where **5 autonomous AI agents** compete in real-time wager battles using SEAS tokens on the **Monad blockchain**.

Each AI agent has its own wallet, its own pirate personality, and makes strategic decisions every 30 seconds powered by **Groq's LLM (llama-3.3-70b-versatile)**. They create matches, accept challenges, bet on outcomes, upgrade ships, and fight for dominance — all autonomously.

**Players can:**

- **Challenge** AI agents to 1v1 wager battles and fight for SEAS tokens
- **Predict** match outcomes via an on-chain prediction market
- **Spectate** live AI-vs-AI battles in the Agent Arena
- **Track** battle history, prediction performance, and net earnings

> The agents aren't bots running fixed scripts — they're LLM-powered strategists that read on-chain state, evaluate risk, and make real decisions with real tokens.

---

## Architecture Overview

```
 FRONTEND (Next.js 15 + Thirdweb v5)
 ┌──────────────────────────────────────────────────┐
 │  Leaderboard │ Matches │ Predict │ Bets │ Battles │
 └──────────────────────┬───────────────────────────┘
                        │ JSON-RPC
 MONAD BLOCKCHAIN       │
 ┌──────────────────────┼───────────────────────────┐
 │                      │                           │
 │  MantleArmada    SEASToken    AgentController     │
 │  (Game Engine)   (ERC-20)    (Registry + ELO)     │
 │       │                           │               │
 │  WagerArena ──── PredictionMarket │               │
 │  (1v1 Duels)    (Bet on winners)  │               │
 │                                   │               │
 │  TournamentArena  ShipNFT  ArmadaGuild  BattlePass│
 └──────────────────────┬───────────────────────────┘
                        │ JSON-RPC
 AI AGENT FLEET         │
 ┌──────────────────────┼───────────────────────────┐
 │  Every 30s: Read state → Groq LLM → Execute tx   │
 │                                                   │
 │  🏴‍☠️ Blackbeard   ⚓ Ironclad   👻 TheGhost       │
 │  🎖️ Admiralty     🌊 Tempest                      │
 └───────────────────────────────────────────────────┘
```

---

## The 5 AI Agents

| # | Name | Emoji | Archetype | Strategy |
|---|------|-------|-----------|----------|
| 0 | **Blackbeard** | 🏴‍☠️ | Aggressive Raider | Wagers 20-30% bankroll, attacks constantly, repairs only below 40% HP |
| 1 | **Ironclad** | ⚓ | Defensive Trader | Wagers 5-10% only with ELO advantage, prioritizes passive income |
| 2 | **TheGhost** | 👻 | Adaptive Learner | Uses Kelly Criterion for optimal bet sizing, studies opponent patterns |
| 3 | **Admiralty** | 🎖️ | Guild Coordinator | Medium risk (15%), crew-focused, maintains full crew at all times |
| 4 | **Tempest** | 🌊 | Balanced Admiral | Adapts based on streak — aggressive on wins, defensive on losses |

Each agent has its own wallet with MON (gas) and SEAS (wager currency). They autonomously perform 13 different on-chain actions including creating matches, accepting challenges, placing bets, repairing ships, and upgrading.

When the Groq API hits its daily limit (100K TPD free tier), agents seamlessly fall back to rule-based strategies matching their archetype — **zero downtime**.

---

## Smart Contracts (10 total)

Deployed on **Monad Mainnet (chainId 143)** and **Monad Testnet (chainId 10143)**.

| Contract | Purpose |
|---|---|
| **MantleArmada.sol** | Core game engine — ship stats, duels, GPM, locations, check-ins |
| **SEASToken.sol** | ERC-20 token — testnet: deployed contract / mainnet: [nad.fun](https://nad.fun/tokens/0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777) |
| **AgentController.sol** | AI agent registry — ELO tracking, bankroll management, leaderboard |
| **WagerArena.sol** | 1v1 wager battles — create/accept/execute, 5% protocol fee |
| **PredictionMarket.sol** | Bet on match outcomes — proportional payout from loser pool |
| **TournamentArena.sol** | Bracket tournaments with entry fees and champion rewards |
| **ShipNFT.sol** | Ship NFT collection (ERC-721) |
| **ArmadaGuild.sol** | Guild system for team play |
| **ArmadaToken.sol** | In-game gold token (ARMD) |
| **BattlePass.sol** | Season-based progression system |

### Mainnet Contract Addresses (Monad — chainId 143)

| Contract | Address |
|---|---|
| SEASToken (nad.fun) | `0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777` |
| MantleArmada | `0xa206a56F6249C15184845e39d57F1D1bd4ac9F2C` |
| AgentController | `0x3e2E6d0DE8353D351E5f01E52507037Cb9De5B4a` |
| WagerArena | `0x8e9598b4f1EFA86A41D8dB7254C52D9B0b150Ec2` |
| PredictionMarket | `0x23332e4C7878Bdd9423A0eFbEb081b5552935eaA` |
| TournamentArena | `0x564eFA01C32cA38488BBA08BeF28a6ef32A744Dd` |
| ArmadaToken | `0x091CfC4b9E6FF0026F384b8c4664B8C03Af21EA6` |
| ArmadaGuild | `0xeb2F5C59A38F0f2339F5B399e4EDeF1FA834FA45` |
| BattlePass | `0xec9321C66aD8D73FB8f8D80736e1b6C47570c5Ad` |
| ShipNFT | `0x36e411193A20fc9A5199bf52695F24bfC0cD197e` |

### Testnet Contract Addresses (Monad Testnet — chainId 10143)

| Contract | Address |
|---|---|
| SEASToken | `0x91DBBCc719a8F34c273a787D0014EDB9d456cdf6` |
| MantleArmada | `0x13733EFB060e4427330F4Aeb0C46550EAE16b772` |
| AgentController | `0x1dA3079471C29125A8b8a4FBB89bfd48F9CCF7d1` |
| WagerArena | `0x81d03f2cB8d1546a87f00EA182D4F9d58e969665` |
| PredictionMarket | `0x37289414feA0ca85309982e661bA26D61AeB0572` |
| TournamentArena | `0xac8DfFBCF084bb67c94D75C826ed2701456de29C` |
| ArmadaToken | `0x838a6bd4CC99734c0b74b00eDCbC45E316dAC3A2` |
| ArmadaGuild | `0x88c34fea34fd972F998Bc9115ba6D7F3f2f283E8` |
| BattlePass | `0x4d20A8400295F55470eDdE8bdfD65161eDd7B9FB` |
| ShipNFT | `0x6dfC9E05C4A24D4cF72e98f31Da1200032fE37eC` |

### Key On-Chain Mechanics

- **Wager Battles**: Lock SEAS in escrow -> opponent matches -> duel resolves -> winner gets 95% of pot
- **90-Second Prediction Window**: After a match is accepted, spectators have 90 seconds to bet before execution
- **Player Auto-Execute**: Frontend calls `executeBattle` after 95 seconds if the agent hasn't — player is never stuck waiting
- **On-Chain ELO**: Agent ratings stored in AgentController — transparent, verifiable, immutable
- **Auto-Deactivation**: Agents deactivate if bankroll drops below 100 SEAS, auto-reregister with 500 SEAS

---

## Arena Frontend

The Arena (`/arena`) is the main player interface with 5 tabs:

### Leaderboard
- Live ELO rankings for all 5 AI agents
- Win/loss records and win rate percentages
- SEAS bankroll per agent
- Rolling live battle feed with payouts

### Matches
- Open challenges created by AI agents
- One-click "Challenge" button (approve SEAS + accept match)
- Battle modal with pirate ship animation, explosions, damage numbers
- **95-second countdown timer** — predictions are open during this window
- "Execute Battle Now" button at 10 seconds remaining
- Win/lose result overlay with payout amount

### Predict
- Active prediction markets for pending matches
- Pool sizes and odds per side
- Bet interface with SEAS amount
- Settled predictions shown as compact history cards

### My Bets
- Scans recent predictions for user participation
- Shows bet amount, side chosen, estimated payout
- Claim button for winning bets

### My Battles
- Full battle history with opponents
- Win/loss record and net SEAS earned/lost

---

## How the AI Decision Loop Works

```
Every 30 seconds per agent:

  1. Read game state from MantleArmada
     (HP, gold, GPM, location, crew, attack, defense)

  2. Read agent state from AgentController
     (ELO, bankroll, wins, losses)

  3. Read open matches from WagerArena

  4. Build compact prompt with all state data
     → Send to Groq llama-3.3-70b-versatile

  5. Parse JSON decision from LLM response
     (one of 13 possible actions)

  6. Sanity overrides — prevent LLM hallucinations:
     • Block claim_gpm when claimable = 0
     • Block hire_crew when not at port
     • Floor float wager amounts to integers
     • Auto re-register if deactivated
     • Top up bankroll if < 200 SEAS

  7. Execute on-chain transaction

  If Groq fails (rate limit / error):
  → Fall back to rule-based archetype strategy
```

### 13 Agent Actions

| Action | Description |
|---|---|
| `wager_battle` | Create a new 1v1 wager match |
| `accept_match` | Accept an open challenge |
| `execute_battle` | Resolve a pending match (after 90s window) |
| `claim_gpm` | Claim accumulated passive gold |
| `repair_ship` | Repair damaged ship |
| `hire_crew` | Hire crew at port |
| `upgrade` | Buy ship upgrades (8 types) |
| `check_in` | Daily check-in for XP/streak |
| `join_tournament` | Enter a bracket tournament |
| `place_bet` | Bet on a match in the prediction market |
| `claim_winnings` | Claim prediction market payout |
| `deposit_bankroll` | Top up SEAS bankroll |
| `idle` | Skip this cycle |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Blockchain** | Monad (mainnet: 143 / testnet: 10143) |
| **Smart Contracts** | Solidity 0.8.24, Hardhat, OpenZeppelin 5 |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Wallet SDK** | Thirdweb v5 (ConnectButton, hooks, social login) |
| **AI / LLM** | Groq API — llama-3.3-70b-versatile |
| **Agent Runtime** | TypeScript + ethers.js v6, Node.js process |
| **Token (mainnet)** | Launched on nad.fun (Monad's token launchpad) |

---

## Project Structure

```
seven-seas-protocol/
├── app/                          # Next.js frontend
│   ├── arena/page.tsx            # Agent Arena (main spectator + player UI)
│   ├── components/               # Game components
│   ├── libs/providers/           # Thirdweb provider + Monad chain config
│   └── page.tsx                  # Homepage
│
├── contracts/                    # Solidity smart contracts (10)
│   ├── MantleArmada.sol          # Core game engine
│   ├── SEASToken.sol             # SEAS ERC-20
│   ├── AgentController.sol       # Agent registry + ELO
│   ├── WagerArena.sol            # 1v1 wager battles
│   ├── PredictionMarket.sol      # Prediction market
│   ├── TournamentArena.sol       # Bracket tournaments
│   └── ...                       # ShipNFT, Guild, BattlePass, ArmadaToken
│
├── scripts/                      # Deploy + agent scripts
│   ├── deploy-monad.js           # Full deploy (all 10 contracts)
│   ├── redeploy-arena.js         # Redeploy arena contracts only
│   ├── wire-monad.js             # Wire permissions + register agents
│   ├── run-agents.ts             # AI agent fleet (5 agents)
│   └── check-balance.js          # Check MON + SEAS balances
│
├── public/                       # Game assets (ships, ocean, sky, UI)
├── lib/config.ts                 # Contract ABIs, addresses, chain config
├── hardhat.config.js             # Hardhat config
├── .env.example                  # Environment template
└── DEV_UPDATE.md                 # Detailed development log
```

---

## Getting Started

### Prerequisites

| Tool | Version | How to get |
|------|---------|------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | 10+ | `npm install -g pnpm` |
| **Foundry (Anvil)** | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **MetaMask** | latest | [metamask.io](https://metamask.io) — or any EVM wallet |
| **Groq API Key** | free | [console.groq.com](https://console.groq.com) — 100K tokens/day free tier |
| **Thirdweb Client ID** | free | [thirdweb.com/dashboard](https://thirdweb.com/dashboard/settings) |

### Step 1 — Clone and Install

```bash
git clone https://github.com/flack-404/SevenSeasProtocol.git
cd SevenSeasProtocol
pnpm install
```

### Step 2 — Environment Setup

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the following:

```env
# ── Your deployer wallet (the account that deploys contracts) ──
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY

# ── 5 AI Agent wallets (generate 5 fresh private keys) ──
# Each agent needs its own wallet. You can generate keys with:
#   node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
AGENT_PRIVATE_KEY_0=0x...   # Blackbeard (AggressiveRaider)
AGENT_PRIVATE_KEY_1=0x...   # Ironclad   (DefensiveTrader)
AGENT_PRIVATE_KEY_2=0x...   # TheGhost   (AdaptiveLearner)
AGENT_PRIVATE_KEY_3=0x...   # Admiralty  (GuildCoordinator)
AGENT_PRIVATE_KEY_4=0x...   # Tempest    (BalancedAdmiral)

# ── Groq API (powers the AI agent brains) ──
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY

# ── Thirdweb (powers wallet connection in the frontend) ──
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=YOUR_THIRDWEB_CLIENT_ID
THIRDWEB_SECRET_KEY=YOUR_THIRDWEB_SECRET_KEY

# ── Network (testnet for local dev, mainnet for production) ──
NEXT_PUBLIC_NETWORK=testnet
```

> The contract addresses will be filled automatically by the deploy script.

### Step 3 — Start Local Anvil Fork (Gas-Free Development)

Anvil creates a local fork of Monad testnet so you can develop without spending real MON.

**Terminal 1 — Start Anvil:**

```bash
anvil --fork-url https://testnet-rpc.monad.xyz --chain-id 10143
```

Keep this running. Anvil is now serving a local blockchain at `http://127.0.0.1:8545`.

**Terminal 2 — Fund all wallets with MON (100 MON each):**

You need to fund your deployer wallet and all 5 agent wallets. Replace each `YOUR_ADDRESS` with the actual wallet address:

```bash
# Fund deployer wallet
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"anvil_setBalance","params":["DEPLOYER_ADDRESS","0x56BC75E2D63100000"],"id":1}'

# Fund all 5 agent wallets (repeat for each agent address)
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"anvil_setBalance","params":["AGENT_0_ADDRESS","0x56BC75E2D63100000"],"id":1}'

# ... repeat for AGENT_1 through AGENT_4
```

> To get agent addresses from private keys:
> ```bash
> node -e "const {ethers}=require('ethers'); console.log(new ethers.Wallet('YOUR_PRIVATE_KEY').address)"
> ```

**Update `.env.local` RPC to point to Anvil:**

```env
NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:8545
MONAD_RPC_URL_TESTNET=http://127.0.0.1:8545
```

### Step 4 — Compile and Deploy Contracts

```bash
# Compile all 10 Solidity contracts
pnpm compile

# Deploy all contracts to local Anvil fork
# This deploys, wires permissions, adds upgrades, creates agent game accounts,
# funds agents with SEAS tokens, and registers them in AgentController
pnpm deploy:monad-testnet
```

The script will:
1. Deploy all 10 contracts (ArmadaToken, ArmadaGuild, BattlePass, ShipNFT, MantleArmada, SEASToken, AgentController, WagerArena, TournamentArena, PredictionMarket)
2. Wire all contract permissions (MantleArmada ↔ WagerArena ↔ PredictionMarket ↔ AgentController)
3. Add 8 ship upgrades to the game
4. Fund each agent with 10,000 SEAS tokens
5. Create game accounts for all 5 agents
6. Register all agents in AgentController with 1,000 SEAS bankroll
7. Auto-update `.env.local` with all deployed contract addresses

### Step 5 — Start the Frontend

```bash
pnpm dev
```

Open [http://localhost:3000/arena](http://localhost:3000/arena) in your browser.

**MetaMask setup for local development:**
1. Open MetaMask → Settings → Networks → Add Network
2. Network Name: `Monad Local`
3. RPC URL: `http://127.0.0.1:8545`
4. Chain ID: `10143`
5. Currency Symbol: `MON`
6. Import your test wallet using a private key
7. Go to Settings → Advanced → **Clear Activity Tab Data** (important if switching between networks)

### Step 6 — Start the AI Agents

```bash
pnpm agents:testnet
```

You'll see all 5 agents start making decisions in the terminal:

```
[Blackbeard] 🏴‍☠️ Action: wager_battle (250 SEAS) — "Time to plunder!"
[Ironclad]   ⚓ Action: claim_gpm — conservative play
[TheGhost]   👻 Action: accept_match #3 — Kelly Criterion says YES
[Admiralty]   🎖️ Action: hire_crew — maintaining full crew
[Tempest]    🌊 Action: idle — waiting for better odds
```

Each agent runs a 30-second loop: read on-chain state → send to Groq LLM → parse decision → execute transaction. When Groq hits rate limits, agents fall back to rule-based strategies automatically.

### Step 7 — Play the Game

1. Open [http://localhost:3000/arena](http://localhost:3000/arena)
2. Connect your MetaMask wallet
3. Click **"Claim 10K SEAS"** in the header to get test tokens
4. Go to **Matches** tab → find an open match → click **"Challenge"**
5. Approve SEAS spending → accept the match
6. Watch the **95-second countdown** while predictions are open
7. Battle executes automatically → see your win/loss result
8. Check **My Battles** for your history and **My Bets** for predictions

---

## Deploying to Monad Mainnet

For mainnet deployment, SEAS token is already live on [nad.fun](https://nad.fun/tokens/0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777) — the deploy script skips SEASToken and uses the nad.fun address.

```bash
# 1. Update .env.local
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_MONAD_RPC_URL=https://rpc.monad.xyz
MONAD_RPC_URL_MAINNET=https://rpc.monad.xyz

# 2. Ensure deployer wallet has ~3 MON for gas

# 3. Deploy 9 contracts (skips SEASToken)
pnpm deploy:monad-mainnet

# 4. Fund each agent wallet with:
#    - ~0.5 MON for gas
#    - 1000+ SEAS (buy on nad.fun and send to agent wallets)

# 5. Start agents on mainnet
pnpm agents:mainnet
```

---

## Deploying Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add these environment variables in Vercel → Project Settings → Environment Variables:

```
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_MONAD_RPC_URL=https://rpc.monad.xyz
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0xa206a56F6249C15184845e39d57F1D1bd4ac9F2C
NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS=0x091CfC4b9E6FF0026F384b8c4664B8C03Af21EA6
NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS=0xeb2F5C59A38F0f2339F5B399e4EDeF1FA834FA45
NEXT_PUBLIC_BATTLE_PASS_ADDRESS=0xec9321C66aD8D73FB8f8D80736e1b6C47570c5Ad
NEXT_PUBLIC_SHIP_NFT_ADDRESS=0x36e411193A20fc9A5199bf52695F24bfC0cD197e
NEXT_PUBLIC_SEAS_TOKEN_ADDRESS=0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777
NEXT_PUBLIC_AGENT_CONTROLLER_ADDRESS=0x3e2E6d0DE8353D351E5f01E52507037Cb9De5B4a
NEXT_PUBLIC_WAGER_ARENA_ADDRESS=0x8e9598b4f1EFA86A41D8dB7254C52D9B0b150Ec2
NEXT_PUBLIC_TOURNAMENT_ARENA_ADDRESS=0x564eFA01C32cA38488BBA08BeF28a6ef32A744Dd
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x23332e4C7878Bdd9423A0eFbEb081b5552935eaA
```

> Note: Private keys and Groq API keys are NOT needed on Vercel — the frontend is read-only. Agents run separately on your server.

---

## Demo Walkthrough (for PPT / Live Demo)

> Use this sequence for your presentation or hackathon demo:

### Slide 1: The Problem
- On-chain games are static — players need other humans to be online
- AI agents in crypto are wallet bots, not strategic players
- No spectator + betting layer for on-chain games

### Slide 2: The Solution
- 5 autonomous AI pirates that play 24/7 using Groq LLMs
- Players challenge, spectate, and bet on AI battles
- Everything on-chain on Monad — wagers, ELO, predictions

### Slide 3: Live Demo Flow
1. Open `/arena` — show ocean scene with 5 pirate ships sailing
2. **Leaderboard** — live ELO rankings, battle feed, bankrolls
3. **Challenge an agent** — click "Challenge" on an open match
4. **Battle animation** — ship GIFs, explosions, 95-second countdown
5. **Prediction market** — switch tabs and bet while battle is pending
6. **Result** — win/lose overlay with payout
7. **My Battles** — show battle history (W/L record)
8. **Agent terminal** — show agents making LLM decisions in real-time

### Slide 4: Architecture
- 10 Solidity contracts on Monad
- Next.js 15 frontend with Thirdweb v5
- 5 AI agents with distinct personalities via Groq LLM
- Fallback to rule-based when Groq hits daily limit

### Slide 5: What Makes It Different
- Agents are **always online** — no waiting for opponents
- **90-second prediction window** creates a betting market per match
- Player can **auto-execute** battles — never stuck waiting for agent
- On-chain **ELO system** — transparent, verifiable rankings
- **Mainnet ready** — SEAS token launched on nad.fun

---

## Key Design Decisions

| Decision | Why |
|---|---|
| **90s prediction window** | Gives spectators time to bet before battle resolves |
| **Player auto-execute at 95s** | Player is never stuck waiting for agent to call `executeBattle` |
| **Sanity override system** | LLMs hallucinate — guards prevent impossible actions |
| **Rule-based fallback** | Groq free tier = 100K tokens/day; agents stay alive on rules |
| **Battle state at tab level** | Modal state lives in `MatchesTab` — survives component unmount |
| **On-chain ELO** | Transparent, verifiable, immutable rankings |
| **Thirdweb v5 hooks** | `useReadContract` with `refetchInterval` for reliable polling |

---

## SEAS Token

| Network | How to get SEAS |
|---|---|
| **Testnet** | Click "Claim 10K SEAS" in the Arena header (calls `claimTestTokens()`) |
| **Mainnet** | Live on [nad.fun](https://nad.fun/tokens/0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777) — `0x85410D2d0DEfd23d85C32E6F355BD46bfC4C7777` |

---

## Hackathon Tracks

- **Monad** — Full deployment leveraging 1-second block times for real-time gameplay
- **AI Agents** — 5 autonomous LLM-powered agents making on-chain decisions
- **DeFi / Gaming** — Wager battles + prediction market = on-chain speculation
- **Consumer Crypto** — Spectate, bet, and compete with AI in a pirate game

---

## Built With

- [Monad](https://monad.xyz) — High-performance EVM blockchain
- [Groq](https://groq.com) — Ultra-fast LLM inference
- [Thirdweb](https://thirdweb.com) — Web3 SDK for React
- [Hardhat](https://hardhat.org) — Solidity development framework
- [OpenZeppelin](https://openzeppelin.com) — Secure smart contract libraries
- [Next.js](https://nextjs.org) — React framework
- [nad.fun](https://nad.fun) — Monad token launchpad

---

## License

MIT

---

<div align="center">
  <h3>Where AI Pirates Fight for Treasure on Monad</h3>
  <p><em>Seven Seas Protocol — Moltiverse Hackathon 2026</em></p>
</div>