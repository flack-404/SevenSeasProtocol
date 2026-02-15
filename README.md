<div align="center">
  <img src="./public/logo_high.png" alt="Seven Seas Protocol Logo" width="300" height="300">

  # 🏴‍☠️ Seven Seas Protocol

  **Conquer the Seven Seas on Mantle Network**

  *A fully on-chain naval strategy game where you command your ship, explore vast oceans, engage in epic battles, form powerful guilds, mint yield-bearing NFTs, and rise through the ranks in this immersive blockchain-powered maritime adventure!*

  [![Mantle Network](https://img.shields.io/badge/Mantle-Network-blue)](https://www.mantle.xyz/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Next.js 15](https://img.shields.io/badge/Next.js-15.3.2-black)](https://nextjs.org/)
  [![Solidity 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org/)
</div>

---

## 🌊 Overview

**Seven Seas Protocol** is a fully on-chain naval strategy game that demonstrates Mantle Network's capabilities for high-performance GameFi applications. Players become naval commanders, choosing between the disciplined Navy or rebellious Pirates, while engaging in strategic gameplay powered entirely by smart contracts on Mantle Sepolia.

### 🎯 Mantle Hackathon Alignment

This project showcases Mantle's strengths for the **Mantle Global Hackathon 2025**:

- ✅ **High-Performance GameFi**: Optimized for Mantle's low gas fees and fast block times (10-second GPM cycles)
- ✅ **RWA Integration**: Ship NFTs as yield-bearing assets (foundation for future DeFi integration)
- ✅ **DeFi Primitives**: ARMADA token with staking, Battle Pass economics, Guild treasury system
- ✅ **Ecosystem Growth**: Social features (Guilds), competitive elements (Battle Pass), NFT marketplace-ready
- ✅ **User Experience**: Smooth gameplay with Thirdweb v5, social login, and optimized transactions

---

## ✨ Key Features

### 🎮 Core Gameplay
- **🏴‍☠️ Faction System**: Choose Navy ⚓ or Pirates 🏴‍☠️
- **⚔️ Strategic Combat**: Skill-based battles with damage calculations
- **🚢 Ship Upgrades**: Enhance attack, defense, speed, and crew capacity
- **🗺️ Ocean Exploration**: 100-location map with travel mechanics
- **💰 Economic System**: Gold Per Minute (GPM), daily check-ins, crew management
- **🔧 Repair System**: Multiple repair options (free, gold, diamond)
- **🏆 Ranking System**: Global leaderboard with rewards

### 🆕 Advanced Features

#### ⚓ **Guilds System**
- **Create & Join Guilds**: Form alliances with fellow pirates/navy
- **Guild Treasury**: Shared resources from member victories
- **Dividend System**: Claim your share of guild earnings
- **Guild Wars**: Compete against other guilds (coming soon)
- **Leadership & Officers**: Hierarchical guild structure

#### 🎖️ **Battle Pass**
- **Seasonal Progression**: Level up through gameplay
- **Free & Premium Tiers**: Basic rewards for all, enhanced rewards for premium
- **XP System**: Earn XP from battles, check-ins, upgrades, GPM claims
- **Reward Tiers**: Gold, diamonds, and ARMADA tokens
- **100 ARMADA Cost**: Premium upgrade using game token

#### 🚢 **Ship NFTs (RWA Foundation)**
- **Mint Ship NFTs**: Convert your ship into a tradeable ERC-721 asset
- **Yield-Bearing Assets**: Ships generate passive ARMADA token yield
- **APY Tiers**: 0.1% - 1.0% daily based on battle power
- **Staking System**: Stake ships for 2x yield multiplier
- **Ship Classes**: Sloop, Brigantine, Frigate, Man-of-War
- **Secondary Market Ready**: Tradeable NFTs with on-chain metadata

#### 💎 **ARMADA Token**
- **ERC-20 Token**: Game's native utility token
- **Earn from Gameplay**: Win battles, complete Battle Pass, claim NFT yield
- **Staking Rewards**: Stake Ship NFTs for enhanced yield
- **Premium Features**: Upgrade Battle Pass, future governance

#### 🎁 **Referral System**
- **Viral Growth Mechanics**: Invite friends and earn rewards
- **Auto-Generated Codes**: Each player gets unique code (e.g., REF_A3F2B1)
- **Two-Way Rewards**: Both referrer and new player benefit
- **Referrer Rewards**: +50 ARMADA + 1 Diamond per successful referral
- **New Player Bonus**: +100 ARMADA + 200 Gold + 1 Diamond
- **Social Sharing**: Easy sharing via Twitter, Telegram, and direct links
- **On-Chain Tracking**: All referrals tracked transparently on blockchain

---

## 🛠️ Technology Stack

### 🎯 Frontend Technologies

- **[Next.js 15.3.2](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://reactjs.org/)** - Latest React with concurrent features
- **[TypeScript 5.8](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4.0](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations
- **[PixiJS](https://pixijs.com/)** - High-performance 2D rendering
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications

### ⛓️ Blockchain & Web3

- **[Mantle Network](https://www.mantle.xyz/)** - High-performance L2 with low fees
- **[Thirdweb SDK v5](https://thirdweb.com/)** - Complete Web3 development platform
- **[Viem](https://viem.sh/)** - Type-safe Ethereum client
- **[Solidity 0.8.24](https://soliditylang.org/)** - Smart contract development
- **[OpenZeppelin 5.3](https://openzeppelin.com/)** - Security-audited contract libraries

### 🔧 Development Tools

- **[Hardhat](https://hardhat.org/)** - Ethereum development environment
- **[TypeChain](https://github.com/dethcrypto/TypeChain)** - TypeScript bindings
- **[ESLint](https://eslint.org/)** - Code linting

### 💳 Wallet Integration

- **MetaMask** - Browser extension wallet
- **Thirdweb In-App Wallet** - Social login (Google, Discord, Telegram)
- **WalletConnect** - Mobile wallet support

---

## 📜 Smart Contracts (Mantle Sepolia)

All contracts are verified on [Mantle Sepolia Explorer](https://sepolia.mantlescan.xyz):

| Contract | Address | Purpose |
|----------|---------|---------|
| **MantleArmada** | `0x7dC53Ba9097B4E963A0b45B50030D0Fd56138C8A` | Main game logic + Referral + PvP |
| **ArmadaToken** | `0x76C25bf63B05a286e967857080b230f762e29772` | ERC-20 utility token |
| **ArmadaGuild** | `0x1dd10f7d8c5C558A936e62E2ace11F1353dc5a25` | Guild system |
| **BattlePass** | `0xa3a52de616052408F1F571B52aCAa7609487fc31` | Seasonal progression |
| **ShipNFT** | `0xB6048f00925E89c6266D041Cc00f232715B59d1a` | Yield-bearing NFTs |

**Network Details:**
- Chain ID: `5003`
- RPC: `https://rpc.sepolia.mantle.xyz`
- Explorer: `https://sepolia.mantlescan.xyz`
- Faucet: [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz)

---

## 🎮 Game Mechanics

### 🏗️ Account Creation
- Choose ship name (up to 12 characters)
- Select faction: Navy ⚓ or Pirates 🏴‍☠️
- Pick starting location (0-100 on map)
- Begin with basic stats and 100 gold

### ⚔️ Combat System
- **Strategic Battles**: Attack stat vs Defense stat calculations
- **Ship Destruction**: 0 HP ships teleport to nearest port
- **Safe Zones**: Ports (25, 55, 89) are attack-free
- **Loot System**: Winners steal gold based on crew size
- **Faction Warfare**: Pirates can attack anyone (including other pirates), Navy can only attack Pirates

### 🚢 Ship Management
- **Upgrades**: Attack, Defense, Speed, Max HP, Max Crew, GPM
- **Exponential Pricing**: 1.5x multiplier per purchase
- **Crew Hiring**: 10 gold per crew member at ports
- **Repair Options**:
  - **Free**: Time-based (30 min per 25 maxHP)
  - **Gold**: Faster (5 min per 25 maxHP)
  - **Diamond**: Instant repair

### 💰 Economic Features
- **Daily Check-ins**: Earn gold + XP with streak bonuses
- **Gold Per Minute (GPM)**: Passive income (10-second cycles on Mantle!)
- **Diamond Purchases**: Premium currency with MNT
- **Revenue Sharing**: Top 3 players get diamond purchase rewards

### ⚓ Guild Features
- **Create Guild**: 500 gold cost
- **Join Existing**: Free to join open guilds
- **Guild Treasury**: Funded by member victories (10% of loot)
- **Dividends**: Members claim proportional share
- **Guild Levels**: Grow guild through activity

### 🎖️ Battle Pass Progression
- **XP Sources**:
  - Battle wins: 10 XP
  - Daily check-ins: 5 XP
  - GPM claims: 1 XP
  - Ship upgrades: 3 XP
- **Levels**: 100 levels per season
- **Rewards Per Level**: Gold, Diamonds, ARMADA tokens
- **Premium Benefits**: 2x rewards, exclusive cosmetics

### 🚢 Ship NFT System
- **Minting Requirements**: 10+ battle power
- **Yield Calculation**: Based on ship power and time
- **APY Tiers**:
  - Power 10-25: 0.1% daily
  - Power 26-50: 0.25% daily
  - Power 51-100: 0.5% daily
  - Power 100+: 1.0% daily
- **Staking Bonus**: 2x yield when staked
- **Claim Anytime**: Accumulated ARMADA tokens

---

## 📜 Deployed Contracts (Mantle Testnet)

| Contract Name | Environment Variable | Address |
|--------------|----------------------|---------|
| 🎮 Game Contract | `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS` | `0x7dC53Ba9097B4E963A0b45B50030D0Fd56138C8A` |
| 💎 ARMADA Token (ERC-20) | `NEXT_PUBLIC_ARMADA_TOKEN_ADDRESS` | `0x76C25bf63B05a286e967857080b230f762e29772` |
| ⚓ Guild Contract | `NEXT_PUBLIC_GUILD_CONTRACT_ADDRESS` | `0x1dd10f7d8c5C558A936e62E2ace11F1353dc5a25` |
| 🎖️ Battle Pass | `NEXT_PUBLIC_BATTLE_PASS_ADDRESS` | `0xa3a52de616052408F1F571B52aCAa7609487fc31` |
| 🚢 Ship NFT (ERC-721) | `NEXT_PUBLIC_SHIP_NFT_ADDRESS` | `0xB6048f00925E89c6266D041Cc00f232715B59d1a` |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- MetaMask or Web3 wallet
- Some MNT for transactions (get from [faucet](https://faucet.sepolia.mantle.xyz))

### Installation

```bash
# Clone the repository
git clone https://github.com/Kaustubh-404/hackathon-game-AVAX
cd hackathon-game-AVAX

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=
NEXT_PUBLIC_NETWORK=testnet
```

### Development

```bash
# Start development server
pnpm dev

# Open browser
# Visit http://localhost:3000

# Compile contracts (if modifying)
pnpm compile

# Deploy to Mantle Sepolia
pnpm deploy:mantle-testnet
```

---

## 🏗️ Smart Contract Architecture

### MantleArmada.sol
**Main game logic contract** featuring:
- Account management and state
- Combat system with damage calculations
- Upgrade system with exponential pricing
- Travel mechanics with time calculations
- GPM (Gold Per Minute) distribution
- Diamond economy with revenue sharing
- Integration with Guild, BattlePass, ShipNFT contracts

**Optimizations for Mantle:**
- 10-second GPM cycles (vs 60 seconds on other chains)
- Batch operations for gas efficiency
- Optimized storage patterns

### ArmadaToken.sol
**ERC-20 utility token** with:
- Mintable by authorized contracts (game, NFT, BattlePass)
- Burnable for future features
- Integration with all game systems
- Supports staking and governance (future)

### ArmadaGuild.sol
**Social coordination layer** featuring:
- Guild creation and management
- Member tracking with contributions
- Treasury system with dividend distribution
- Guild wars preparation (future)
- Officer and leadership roles

### BattlePass.sol
**Seasonal progression system** with:
- XP tracking from multiple sources
- Level-based rewards (gold, diamonds, ARMADA)
- Free and premium tiers
- Season management
- Reward claiming with checks

### ShipNFT.sol
**RWA-focused yield-bearing NFTs**:
- ERC-721 standard compliance
- Yield generation based on battle power
- Staking for enhanced rewards
- On-chain metadata and ship classes
- Marketplace-ready design
- Foundation for future DeFi integration

**Security Features:**
- OpenZeppelin's `Ownable`, `ReentrancyGuard`
- Input validation and bounds checking
- Time-based action protection
- Reentrancy guards on all state changes

---

## 💎 Diamond Economy

| Package | Cost | Diamonds | Uses |
|---------|------|----------|------|
| Starter | 10 MNT | 1 💎 | Fast travel, instant repairs |
| Adventurer | 45 MNT | 5 💎 | 10% discount per diamond |
| Captain | 90 MNT | 10 💎 | 12.5% discount per diamond |

**Revenue Distribution:**
- 40% → Rank #1 Player
- 20% → Rank #2 Player
- 10% → Rank #3 Player
- 30% → Contract Treasury

---

## 🏆 Why Mantle Network?

### ⚡ Performance Benefits
- **Fast Block Times**: 10-second GPM cycles enable real-time gameplay
- **Low Gas Fees**: Affordable transactions for frequent game actions
- **High Throughput**: Supports multiple concurrent players

### 🎯 RWA Vision Alignment
- **Ship NFTs**: Yield-bearing assets demonstrate RWA principles
- **DeFi Integration**: Foundation for bonds, fractional ownership
- **Compliance Ready**: KYC integration potential for regulated features

### 🌟 Developer Experience
- **EVM Compatibility**: Easy migration and development
- **Robust Infrastructure**: Reliable RPC and explorer
- **Growing Ecosystem**: Access to Mantle's DeFi primitives

### 💪 Unique Features Enabled by Mantle
1. **Real-time GPM**: 10-second cycles vs 60 seconds on other chains
2. **Complex Game Logic**: Multiple contracts working together efficiently
3. **NFT Yield System**: On-chain calculations without prohibitive gas costs
4. **Guild Treasury**: Frequent dividend distributions feasible

---

## 🎯 Hackathon Categories

This project competes in:

### 🏆 **Primary: GameFi & NFT**
- Fully on-chain game mechanics
- Yield-bearing Ship NFTs
- ARMADA token economy
- Guild social coordination

### 🏆 **Secondary: DeFi**
- Staking system (Ship NFTs)
- Yield generation (0.1%-1.0% daily)
- Treasury management (Guilds)
- Token distribution (Battle Pass)

### 🏆 **Tertiary: RWA Innovation**
- Ships as real-world-analogous assets
- Yield-bearing properties
- Tradeable ownership
- Foundation for bonds/fractional ownership

---

## 🔐 Security & Testing

### Security Measures
- ✅ Reentrancy protection on all state-changing functions
- ✅ Input validation and sanitization
- ✅ Time-based action cooldowns
- ✅ Access control (Ownable pattern)
- ✅ Safe math operations (Solidity 0.8+)
- ✅ Non-upgradeable contracts (immutability)

### Testing
```bash
# Run test suite (when implemented)
pnpm test

# Gas optimization analysis
pnpm test:gas

# Coverage report
pnpm test:coverage
```
---

## 🔗 Links

- **Live Demo**: [seven-seas-protocol.vercel.app](https://seven-seas-protocol.vercel.app) 
- **Contracts**: [Mantle Sepolia Explorer](https://sepolia.mantlescan.xyz)
---

## 🙏 Acknowledgments

- **Mantle Network** - For the hackathon and incredible L2 infrastructure
- **Thirdweb** - For the amazing Web3 SDK
- **OpenZeppelin** - For secure smart contract libraries
- **The Community** - For feedback and support

---

<div align="center">
  <h3>⚓ Set sail and conquer the Seven Seas! ⚓</h3>
  <p><em>Built for Mantle Global Hackathon 2025</em></p>
  <p><em>Seven Seas Protocol - Where blockchain meets the high seas.</em></p>

  <br/>

  <a href="https://www.mantle.xyz/">
    <img src="https://img.shields.io/badge/Powered%20by-Mantle-blue?style=for-the-badge" alt="Powered by Mantle"/>
  </a>
</div>
