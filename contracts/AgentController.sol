// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGameContract {
    function getShipStats(address player) external view returns (
        uint256 attack, uint256 defense, uint256 hp, uint256 maxHp,
        uint256 gold, uint256 crew, uint256 location, bool isPirate
    );
    function createAccount(string calldata boatName, bool isPirate, uint256 startLocation) external;
}

/**
 * @title AgentController
 * @dev On-chain agent registry, ELO rating system, and decision engine.
 *
 * Each agent has:
 *  - An archetype (0-4) that determines strategy
 *  - ELO rating starting at 1000 (+20 win / -15 loss)
 *  - A SEAS token bankroll held in this contract
 *  - Win/loss record and total wagers
 *
 * Decision engine: pure on-chain strategy logic.
 * The real intelligence lives in run-agents.ts (Groq LLM).
 * This contract provides verifiable on-chain decisions for transparency.
 */
contract AgentController is Ownable, ReentrancyGuard {

    IGameContract public gameContract;
    IERC20 public seasToken;

    // Authorized caller for updateAfterMatch
    address public wagerArena;

    enum AgentType {
        AggressiveRaider,   // 0 — Blackbeard: high-risk, large wagers
        DefensiveTrader,    // 1 — Ironclad: conservative, GPM focus
        AdaptiveLearner,    // 2 — TheGhost: Kelly Criterion, tracks history
        GuildCoordinator,   // 3 — Admiralty: guild-focused, medium risk
        BalancedAdmiral     // 4 — Tempest: balanced, adapts to meta
    }

    struct Agent {
        address owner;
        AgentType agentType;
        uint256 eloRating;
        uint256 wins;
        uint256 losses;
        uint256 bankroll;      // in SEAS tokens (wei)
        uint256 totalWagers;
        bool isActive;
        string agentAlias;
    }

    mapping(address => Agent) public agents;
    address[] public agentList;

    // ELO constants
    uint256 constant ELO_START    = 1000;
    uint256 constant ELO_WIN_GAIN = 20;
    uint256 constant ELO_LOSS_DEC = 15;
    uint256 constant MIN_ELO      = 100;

    // Minimum bankroll to stay registered
    uint256 constant MIN_BANKROLL = 100 * 10**18; // 100 SEAS

    event AgentRegistered(address indexed agentAddress, AgentType agentType, string agentAlias);
    event BankrollDeposited(address indexed agent, uint256 amount);
    event ProfitsWithdrawn(address indexed agent, uint256 amount);
    event AgentDecision(address indexed agent, string action, uint256 value);
    event MatchResultRecorded(address indexed agent, bool won, uint256 eloAfter);

    modifier onlyWagerArena() {
        require(msg.sender == wagerArena || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _gameContract, address _seasToken) Ownable(msg.sender) {
        gameContract = IGameContract(_gameContract);
        seasToken = IERC20(_seasToken);
    }

    function setWagerArena(address _wagerArena) external onlyOwner {
        wagerArena = _wagerArena;
    }

    // ─────────────────────────────────────────
    // Agent Registration
    // ─────────────────────────────────────────

    /**
     * @dev Register this wallet as an agent. Caller must:
     *  1. Have a game account (createAccount() first)
     *  2. Approve this contract to spend SEAS tokens
     *  3. Call registerAgent with enough initial bankroll
     */
    function registerAgent(
        AgentType agentType,
        uint256 initialBankroll,
        string calldata agentAlias
    ) external nonReentrant {
        require(!agents[msg.sender].isActive, "Already registered");
        require(initialBankroll >= MIN_BANKROLL, "Min 100 SEAS required");
        require(bytes(agentAlias).length > 0 && bytes(agentAlias).length <= 20, "Alias 1-20 chars");

        // Pull SEAS from agent wallet
        require(
            seasToken.transferFrom(msg.sender, address(this), initialBankroll),
            "SEAS transfer failed"
        );

        agents[msg.sender] = Agent({
            owner: msg.sender,
            agentType: agentType,
            eloRating: ELO_START,
            wins: 0,
            losses: 0,
            bankroll: initialBankroll,
            totalWagers: 0,
            isActive: true,
            agentAlias: agentAlias
        });

        agentList.push(msg.sender);

        emit AgentRegistered(msg.sender, agentType, agentAlias);
        emit BankrollDeposited(msg.sender, initialBankroll);
    }

    /**
     * @dev Deposit more SEAS to bankroll
     */
    function depositBankroll(uint256 amount) external nonReentrant {
        require(agents[msg.sender].isActive, "Not registered");
        require(amount > 0, "Amount must be > 0");
        require(seasToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        agents[msg.sender].bankroll += amount;
        emit BankrollDeposited(msg.sender, amount);
    }

    /**
     * @dev Withdraw profits above minimum bankroll
     */
    function withdrawProfits(uint256 amount) external nonReentrant {
        Agent storage agent = agents[msg.sender];
        require(agent.isActive, "Not registered");
        require(agent.bankroll >= MIN_BANKROLL + amount, "Must maintain 100 SEAS minimum");
        agent.bankroll -= amount;
        require(seasToken.transfer(msg.sender, amount), "Transfer failed");
        emit ProfitsWithdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────
    // Decision Engine (on-chain strategy)
    // ─────────────────────────────────────────

    /**
     * @dev Returns recommended action for an agent based on archetype + game state.
     * This is the on-chain verifiable version. The Groq LLM in run-agents.ts
     * makes the actual autonomous decisions and uses this as a fallback.
     *
     * Returns: (action string, value)
     * Actions: "wager_battle", "claim_gpm", "repair_ship", "upgrade_attack",
     *          "upgrade_defense", "hire_crew", "idle"
     */
    function getAgentDecision(address agentAddress) external view returns (
        string memory action,
        uint256 value
    ) {
        Agent storage agent = agents[agentAddress];
        require(agent.isActive, "Agent not active");

        (
            uint256 attack, uint256 defense, uint256 hp, uint256 maxHp,
            uint256 gold, uint256 crew, ,
        ) = gameContract.getShipStats(agentAddress);

        if (agent.agentType == AgentType.AggressiveRaider) {
            return _aggressiveStrategy(agent, attack, defense, hp, gold);
        } else if (agent.agentType == AgentType.DefensiveTrader) {
            return _defensiveStrategy(agent, hp, maxHp, gold);
        } else if (agent.agentType == AgentType.AdaptiveLearner) {
            return _adaptiveStrategy(agent, attack, defense, hp);
        } else if (agent.agentType == AgentType.GuildCoordinator) {
            return _guildStrategy(agent, crew, gold);
        } else {
            return _balancedStrategy(agent, attack, defense, hp, gold);
        }
    }

    function _aggressiveStrategy(
        Agent storage agent,
        uint256 attack, uint256 defense, uint256 hp, uint256 gold
    ) internal view returns (string memory, uint256) {
        if (hp < 50) return ("repair_ship", 0);
        if (attack >= defense && gold > 500) {
            // 25% of bankroll
            uint256 wager = (agent.bankroll * 25) / 100;
            if (wager < 1 * 10**18) wager = 1 * 10**18;
            if (wager > 1000 * 10**18) wager = 1000 * 10**18;
            return ("wager_battle", wager);
        }
        if (gold < 200) return ("claim_gpm", 0);
        return ("upgrade_attack", 0);
    }

    function _defensiveStrategy(
        Agent storage agent,
        uint256 hp, uint256 maxHp, uint256 gold
    ) internal view returns (string memory, uint256) {
        if (maxHp > 0 && hp * 100 < maxHp * 70) return ("repair_ship", 0);
        if (gold > 1000) {
            // Conservative 5% wager
            uint256 wager = (agent.bankroll * 5) / 100;
            if (wager < 1 * 10**18) wager = 1 * 10**18;
            if (wager > 1000 * 10**18) wager = 1000 * 10**18;
            return ("wager_battle", wager);
        }
        return ("claim_gpm", 0);
    }

    function _adaptiveStrategy(
        Agent storage agent,
        uint256 attack, uint256 defense, uint256 hp
    ) internal view returns (string memory, uint256) {
        if (hp < 60) return ("repair_ship", 0);

        uint256 totalMatches = agent.wins + agent.losses;
        // Win rate in basis points (0-10000)
        uint256 winRate = totalMatches > 0 ? (agent.wins * 10000) / totalMatches : 5000;

        // Kelly Criterion approximation: f = (win_rate - loss_rate) / 1
        // Simplified: wager % = winRate / 100
        uint256 wagerPercent = winRate > 6000 ? 20 : (winRate > 4000 ? 15 : 10);
        uint256 wager = (agent.bankroll * wagerPercent) / 100;
        if (wager < 1 * 10**18) wager = 1 * 10**18;
        if (wager > 1000 * 10**18) wager = 1000 * 10**18;

        if (attack > defense * 120 / 100) {
            return ("wager_battle", wager);
        }
        return ("upgrade_attack", 0);
    }

    function _guildStrategy(
        Agent storage agent,
        uint256 crew, uint256 gold
    ) internal view returns (string memory, uint256) {
        if (crew < 50) return ("hire_crew", 0);
        // Medium 15% wager
        uint256 wager = (agent.bankroll * 15) / 100;
        if (wager < 1 * 10**18) wager = 1 * 10**18;
        if (wager > 1000 * 10**18) wager = 1000 * 10**18;
        if (gold > 300) return ("wager_battle", wager);
        return ("claim_gpm", 0);
    }

    function _balancedStrategy(
        Agent storage agent,
        uint256 attack, uint256 defense, uint256 hp, uint256 gold
    ) internal view returns (string memory, uint256) {
        if (hp < 70) return ("repair_ship", 0);
        if (gold < 300) return ("claim_gpm", 0);
        if (attack < defense) return ("upgrade_attack", 0);
        uint256 wager = (agent.bankroll * 15) / 100;
        if (wager < 1 * 10**18) wager = 1 * 10**18;
        if (wager > 1000 * 10**18) wager = 1000 * 10**18;
        return ("wager_battle", wager);
    }

    // ─────────────────────────────────────────
    // Match Result Updates
    // ─────────────────────────────────────────

    /**
     * @dev Called by WagerArena after each match to update ELO + bankroll.
     */
    function updateAfterMatch(
        address agentAddress,
        bool won,
        uint256 wagerAmount
    ) external onlyWagerArena {
        Agent storage agent = agents[agentAddress];
        require(agent.isActive, "Agent not active");

        agent.totalWagers += wagerAmount;

        if (won) {
            agent.wins += 1;
            agent.bankroll += wagerAmount;
            agent.eloRating += ELO_WIN_GAIN;
        } else {
            agent.losses += 1;
            if (agent.bankroll >= wagerAmount) {
                agent.bankroll -= wagerAmount;
            } else {
                agent.bankroll = 0;
            }
            if (agent.eloRating > MIN_ELO + ELO_LOSS_DEC) {
                agent.eloRating -= ELO_LOSS_DEC;
            } else {
                agent.eloRating = MIN_ELO;
            }
        }

        // Deactivate if bankroll drained below minimum
        if (agent.bankroll < MIN_BANKROLL) {
            agent.isActive = false;
        }

        emit MatchResultRecorded(agentAddress, won, agent.eloRating);
    }

    // ─────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────

    function getAgentStats(address agentAddress) external view returns (
        uint256 bankroll,
        uint256 wins,
        uint256 losses,
        uint256 eloRating,
        uint256 totalWagers
    ) {
        Agent storage agent = agents[agentAddress];
        return (agent.bankroll, agent.wins, agent.losses, agent.eloRating, agent.totalWagers);
    }

    /**
     * @dev Returns top N agents sorted by ELO (simple insertion sort — ok for small N)
     */
    function getLeaderboard(uint256 count) external view returns (
        address[] memory addrs,
        uint256[] memory elos
    ) {
        uint256 len = agentList.length < count ? agentList.length : count;
        addrs = new address[](len);
        elos  = new uint256[](len);

        for (uint256 i = 0; i < agentList.length; i++) {
            address a = agentList[i];
            if (!agents[a].isActive) continue;
            uint256 elo = agents[a].eloRating;
            for (uint256 j = 0; j < len; j++) {
                if (elo > elos[j]) {
                    for (uint256 k = len - 1; k > j; k--) {
                        addrs[k] = addrs[k - 1];
                        elos[k]  = elos[k - 1];
                    }
                    addrs[j] = a;
                    elos[j]  = elo;
                    break;
                }
            }
        }
        return (addrs, elos);
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function isRegistered(address agentAddress) external view returns (bool) {
        return agents[agentAddress].isActive;
    }
}
