// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGameContractDuel {
    function executeDuel(address agent1, address agent2) external returns (address winner, uint256 rounds);
}

interface IAgentController {
    function getAgentStats(address agentAddress) external view returns (
        uint256 bankroll, uint256 wins, uint256 losses, uint256 eloRating, uint256 totalWagers
    );
    function updateAfterMatch(address agentAddress, bool won, uint256 wagerAmount) external;
    function isRegistered(address agentAddress) external view returns (bool);
    function agents(address) external view returns (
        address owner, uint8 agentType, uint256 eloRating, uint256 wins,
        uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string memory agentAlias
    );
}

interface IPredictionMarket {
    function openPrediction(uint256 matchId, address agent1, address agent2) external;
    function settlePrediction(uint256 matchId, address winner) external;
}

/**
 * @title WagerArena
 * @dev Match escrow and battle execution for the Seven Seas agent arena.
 *
 * Flow:
 *  1. Agent A calls createMatch(wagerAmount) — locks SEAS in escrow
 *  2. Agent B calls acceptMatch(matchId)     — locks matching SEAS
 *  3. Either agent calls executeBattle(matchId) — runs duel, pays winner
 *
 * House fee: 5% (HOUSE_FEE_BPS = 500) sent to treasury on every payout.
 * Unaccepted matches expire after 1 hour and can be cancelled for full refund.
 */
contract WagerArena is ReentrancyGuard, Ownable {

    IERC20 public seasToken;
    IGameContractDuel public gameContract;
    IAgentController public agentController;
    IPredictionMarket public predictionMarket;

    address public treasury;

    uint256 public constant HOUSE_FEE_BPS = 500; // 5%
    uint256 public constant MIN_WAGER     = 1   * 10**18;
    uint256 public constant MAX_WAGER     = 1000 * 10**18;
    uint256 public constant MATCH_EXPIRY  = 1 hours;

    uint256 public matchCounter;

    struct WagerMatch {
        uint256 matchId;
        address agent1;
        address agent2;
        uint256 wagerAmount;
        bool isAccepted;
        bool isCompleted;
        bool isCancelled;
        address winner;
        uint256 timestamp;
        uint256 rounds;
    }

    mapping(uint256 => WagerMatch) public matches;
    mapping(address => uint256[]) public agentMatches;

    // Recent matches ring buffer (last 50)
    uint256[] private recentMatchIds;
    uint256 private constant RECENT_MAX = 50;

    event MatchCreated(uint256 indexed matchId, address indexed challenger, address indexed opponent, uint256 wagerAmount);
    event MatchAccepted(uint256 indexed matchId, address indexed opponent);
    event MatchCompleted(uint256 indexed matchId, address indexed winner, uint256 payout, uint256 rounds);
    event MatchCancelled(uint256 indexed matchId, address indexed challenger);
    event TreasurySet(address indexed treasury);

    constructor(
        address _gameContract,
        address _agentController,
        address _seasToken,
        address _treasury
    ) Ownable(msg.sender) {
        gameContract    = IGameContractDuel(_gameContract);
        agentController = IAgentController(_agentController);
        seasToken       = IERC20(_seasToken);
        treasury        = _treasury;
    }

    function setPredictionMarket(address _pm) external onlyOwner {
        predictionMarket = IPredictionMarket(_pm);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    // ─────────────────────────────────────────
    // Match Lifecycle
    // ─────────────────────────────────────────

    /**
     * @dev Create an open wager match. Anyone can accept.
     * Caller must approve this contract for wagerAmount SEAS first.
     */
    function createMatch(uint256 wagerAmount) external nonReentrant returns (uint256 matchId) {
        require(agentController.isRegistered(msg.sender), "Not a registered agent");
        require(wagerAmount >= MIN_WAGER, "Wager below minimum (1 SEAS)");
        require(wagerAmount <= MAX_WAGER, "Wager above maximum (1000 SEAS)");

        (uint256 bankroll,,,,) = agentController.getAgentStats(msg.sender);
        require(bankroll >= wagerAmount, "Insufficient bankroll");

        require(seasToken.transferFrom(msg.sender, address(this), wagerAmount), "SEAS transfer failed");

        matchId = ++matchCounter;

        matches[matchId] = WagerMatch({
            matchId:      matchId,
            agent1:       msg.sender,
            agent2:       address(0),
            wagerAmount:  wagerAmount,
            isAccepted:   false,
            isCompleted:  false,
            isCancelled:  false,
            winner:       address(0),
            timestamp:    block.timestamp,
            rounds:       0
        });

        agentMatches[msg.sender].push(matchId);
        _pushRecentMatch(matchId);

        emit MatchCreated(matchId, msg.sender, address(0), wagerAmount);
        return matchId;
    }

    /**
     * @dev Accept an open match. Caller must approve matching wager first.
     */
    function acceptMatch(uint256 matchId) external nonReentrant {
        WagerMatch storage m = matches[matchId];
        require(!m.isAccepted,  "Already accepted");
        require(!m.isCompleted, "Already completed");
        require(!m.isCancelled, "Cancelled");
        require(m.agent1 != address(0), "Match not found");
        require(m.agent1 != msg.sender, "Cannot fight yourself");
        require(block.timestamp <= m.timestamp + MATCH_EXPIRY, "Match expired");
        require(agentController.isRegistered(msg.sender), "Not a registered agent");

        (uint256 bankroll,,,,) = agentController.getAgentStats(msg.sender);
        require(bankroll >= m.wagerAmount, "Insufficient bankroll");

        require(seasToken.transferFrom(msg.sender, address(this), m.wagerAmount), "SEAS transfer failed");

        m.agent2     = msg.sender;
        m.isAccepted = true;

        agentMatches[msg.sender].push(matchId);

        // Open prediction market for this match
        if (address(predictionMarket) != address(0)) {
            try predictionMarket.openPrediction(matchId, m.agent1, m.agent2) {} catch {}
        }

        emit MatchAccepted(matchId, msg.sender);
    }

    /**
     * @dev Execute the battle and pay winner. Either agent can call this.
     */
    function executeBattle(uint256 matchId) external nonReentrant {
        WagerMatch storage m = matches[matchId];
        require(m.isAccepted,   "Not accepted yet");
        require(!m.isCompleted, "Already completed");
        require(!m.isCancelled, "Cancelled");
        require(
            msg.sender == m.agent1 || msg.sender == m.agent2 || msg.sender == owner(),
            "Not a participant"
        );

        // Execute duel in game contract
        (address winner, uint256 rounds) = gameContract.executeDuel(m.agent1, m.agent2);

        m.winner      = winner;
        m.isCompleted = true;
        m.rounds      = rounds;

        // Calculate payout (5% house fee)
        uint256 totalPot  = m.wagerAmount * 2;
        uint256 houseFee  = (totalPot * HOUSE_FEE_BPS) / 10000;
        uint256 payout    = totalPot - houseFee;

        // Pay winner
        require(seasToken.transfer(winner, payout), "Payout failed");

        // House fee to treasury
        if (houseFee > 0 && treasury != address(0)) {
            require(seasToken.transfer(treasury, houseFee), "Treasury transfer failed");
        }

        // Update ELO + bankroll in AgentController
        address loser = winner == m.agent1 ? m.agent2 : m.agent1;
        agentController.updateAfterMatch(winner, true,  m.wagerAmount);
        agentController.updateAfterMatch(loser,  false, m.wagerAmount);

        // Settle prediction market
        if (address(predictionMarket) != address(0)) {
            try predictionMarket.settlePrediction(matchId, winner) {} catch {}
        }

        emit MatchCompleted(matchId, winner, payout, rounds);
    }

    /**
     * @dev Cancel an unaccepted match and refund wager. Only challenger, only before expiry.
     */
    function cancelMatch(uint256 matchId) external nonReentrant {
        WagerMatch storage m = matches[matchId];
        require(msg.sender == m.agent1, "Not the challenger");
        require(!m.isAccepted,  "Already accepted");
        require(!m.isCompleted, "Already completed");
        require(!m.isCancelled, "Already cancelled");

        m.isCancelled = true;

        require(seasToken.transfer(m.agent1, m.wagerAmount), "Refund failed");

        emit MatchCancelled(matchId, m.agent1);
    }

    // ─────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────

    function getMatchDetails(uint256 matchId) external view returns (
        address agent1, address agent2, uint256 wagerAmount,
        bool isAccepted, bool isCompleted, address winner, uint256 rounds
    ) {
        WagerMatch storage m = matches[matchId];
        return (m.agent1, m.agent2, m.wagerAmount, m.isAccepted, m.isCompleted, m.winner, m.rounds);
    }

    function getAgentMatchHistory(address agent) external view returns (uint256[] memory) {
        return agentMatches[agent];
    }

    function getRecentMatches(uint256 count) external view returns (uint256[] memory) {
        uint256 len = recentMatchIds.length < count ? recentMatchIds.length : count;
        uint256[] memory result = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            // Return in reverse order (newest first)
            result[i] = recentMatchIds[recentMatchIds.length - 1 - i];
        }
        return result;
    }

    function getOpenMatches() external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 1; i <= matchCounter; i++) {
            WagerMatch storage m = matches[i];
            if (!m.isAccepted && !m.isCompleted && !m.isCancelled &&
                block.timestamp <= m.timestamp + MATCH_EXPIRY) {
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i = 1; i <= matchCounter; i++) {
            WagerMatch storage m = matches[i];
            if (!m.isAccepted && !m.isCompleted && !m.isCancelled &&
                block.timestamp <= m.timestamp + MATCH_EXPIRY) {
                result[idx++] = i;
            }
        }
        return result;
    }

    // ─────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────

    function _pushRecentMatch(uint256 matchId) internal {
        recentMatchIds.push(matchId);
        if (recentMatchIds.length > RECENT_MAX) {
            // Shift left (drop oldest)
            for (uint256 i = 0; i < recentMatchIds.length - 1; i++) {
                recentMatchIds[i] = recentMatchIds[i + 1];
            }
            recentMatchIds.pop();
        }
    }
}
