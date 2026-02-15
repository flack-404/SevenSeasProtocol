<div align="center">
  <img src="./public/logo_high.png" alt="Seven Seas Protocol" width="200" height="200">

  # Seven Seas Protocol

  **Autonomous AI Pirates Battle On-Chain for SEAS Tokens**

  Built on **Monad** | AI by **Groq** | Moltiverse Hackathon 2026

  [![Monad](https://img.shields.io/badge/Monad-Blockchain-purple?style=for-the-badge)](https://monad.xyz)
  [![Groq](https://img.shields.io/badge/Groq-LLM_AI-orange?style=for-the-badge)](https://groq.com)
  [![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge)](https://nextjs.org/)
  [![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue?style=for-the-badge)](https://soliditylang.org/)

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

All contracts deployed on **Monad Testnet (chainId 10143)**.

| Contract | Purpose |
|---|---|
| **MantleArmada.sol** | Core game engine — ship stats, duels, GPM, locations, check-ins |
| **SEASToken.sol** | ERC-20 token with testnet faucet (10K SEAS per claim) |
| **AgentController.sol** | AI agent registry — ELO tracking, bankroll management, leaderboard |
| **WagerArena.sol** | 1v1 wager battles — create/accept/execute, 5% protocol fee |
| **PredictionMarket.sol** | Bet on match outcomes — proportional payout from loser pool |
| **TournamentArena.sol** | Bracket tournaments with entry fees and champion rewards |
| **ShipNFT.sol** | Ship NFT collection (ERC-721) |
| **ArmadaGuild.sol** | Guild system for team play |
| **ArmadaToken.sol** | In-game gold token (ARMD) |
| **BattlePass.sol** | Season-based progression system |

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
| **Blockchain** | Monad (testnet: 10143 / mainnet: 41454) |
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

- Node.js 18+, pnpm
- MetaMask or compatible wallet
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Thirdweb client ID (free at [thirdweb.com](https://thirdweb.com))

### 1. Clone and Install

```bash
git clone https://github.com/flack-404/SevenSeasProtocol.git
cd SevenSeasProtocol
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:
- `PRIVATE_KEY` — deployer wallet private key
- `GROQ_API_KEY` — from Groq console
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` — from Thirdweb dashboard
- `AGENT_PRIVATE_KEY_0` through `AGENT_PRIVATE_KEY_4` — 5 fresh wallet keys for AI agents

### 3. Deploy Contracts

```bash
# Deploy all 10 contracts to Monad testnet
pnpm deploy:monad-testnet

# Wire permissions and register agents
npx hardhat run scripts/wire-monad.js --network monadTestnet
```

### 4. Start the Frontend

```bash
pnpm dev
# Open http://localhost:3000/arena
```

### 5. Start the AI Agents

```bash
pnpm agents:testnet
```

Watch the terminal — 5 agents start making LLM-powered decisions every 30 seconds.

---

## Local Development (Anvil Fork)

For gas-free testing using a local Anvil fork:

```bash
# Terminal 1 — Start Anvil
anvil --fork-url https://testnet-rpc.monad.xyz --chain-id 10143

# Terminal 2 — Fund wallets (100 MON each)
curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"anvil_setBalance","params":["YOUR_WALLET","0x56BC75E2D63100000"],"id":1}'

# Deploy to local fork
pnpm deploy:monad-testnet
```

Update `.env.local`:
```env
NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:8545
MONAD_RPC_URL_TESTNET=http://127.0.0.1:8545
```

Update MetaMask RPC to `http://127.0.0.1:8545` for chain ID 10143.

> See `DEV_UPDATE.md` for a complete local RPC switching checklist.

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
| **Mainnet** | Launch on [nad.fun](https://nad.fun) (Monad's token launchpad) — replace address in `.env.local` |

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
