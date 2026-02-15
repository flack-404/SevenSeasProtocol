// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PredictionMarket
 * @dev Community prediction market for Seven Seas agent battles.
 *
 * Flow:
 *  1. WagerArena opens a prediction when match is accepted
 *  2. Anyone places bets on Agent1 or Agent2 with SEAS
 *  3. WagerArena settles prediction after match completes
 *  4. Winners claim proportional payout from loser pool (minus 2% fee)
 *
 * Payout formula:
 *  winnings = (your_bet / winner_pool) × loser_pool × 0.98
 */
contract PredictionMarket is ReentrancyGuard, Ownable {

    IERC20 public seasToken;
    address public wagerArena;
    address public treasury;

    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2%
    uint256 public constant MIN_BET          = 1 * 10**18; // 1 SEAS

    uint256 public predictionCounter;

    struct Prediction {
        uint256 matchId;
        address agent1;
        address agent2;
        uint256 agent1Pool;  // total SEAS bet on agent1
        uint256 agent2Pool;  // total SEAS bet on agent2
        bool    isOpen;
        bool    isSettled;
        address winner;
    }

    struct Bet {
        uint256 amount;
        bool    betOnAgent1;
        bool    claimed;
    }

    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => Bet)) public bets;

    // matchId => predictionId (so WagerArena can find it by matchId)
    mapping(uint256 => uint256) public matchToPrediction;

    event PredictionOpened(uint256 indexed predictionId, uint256 indexed matchId, address agent1, address agent2);
    event BetPlaced(uint256 indexed predictionId, address indexed bettor, bool betOnAgent1, uint256 amount);
    event PredictionSettled(uint256 indexed predictionId, address indexed winner);
    event WinningsClaimed(uint256 indexed predictionId, address indexed claimer, uint256 amount);

    modifier onlyWagerArena() {
        require(msg.sender == wagerArena || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _seasToken, address _treasury) Ownable(msg.sender) {
        seasToken = IERC20(_seasToken);
        treasury  = _treasury;
    }

    function setWagerArena(address _wagerArena) external onlyOwner {
        wagerArena = _wagerArena;
    }

    // ─────────────────────────────────────────
    // Lifecycle (called by WagerArena)
    // ─────────────────────────────────────────

    /**
     * @dev Open a prediction for a match. Called by WagerArena when match is accepted.
     */
    function openPrediction(uint256 matchId, address agent1, address agent2) external onlyWagerArena {
        uint256 predictionId = ++predictionCounter;

        predictions[predictionId] = Prediction({
            matchId:    matchId,
            agent1:     agent1,
            agent2:     agent2,
            agent1Pool: 0,
            agent2Pool: 0,
            isOpen:     true,
            isSettled:  false,
            winner:     address(0)
        });

        matchToPrediction[matchId] = predictionId;

        emit PredictionOpened(predictionId, matchId, agent1, agent2);
    }

    /**
     * @dev Settle prediction after match result. Called by WagerArena.
     */
    function settlePrediction(uint256 matchId, address winner) external onlyWagerArena {
        uint256 predictionId = matchToPrediction[matchId];
        if (predictionId == 0) return; // No prediction for this match

        Prediction storage p = predictions[predictionId];
        require(p.isOpen,     "Prediction not open");
        require(!p.isSettled, "Already settled");

        p.isOpen    = false;
        p.isSettled = true;
        p.winner    = winner;

        emit PredictionSettled(predictionId, winner);
    }

    // ─────────────────────────────────────────
    // Betting
    // ─────────────────────────────────────────

    /**
     * @dev Place a bet on a prediction. Caller must approve SEAS first.
     */
    function placeBet(uint256 predictionId, bool betOnAgent1, uint256 amount) external nonReentrant {
        Prediction storage p = predictions[predictionId];
        require(p.isOpen,      "Prediction not open");
        require(!p.isSettled,  "Already settled");
        require(amount >= MIN_BET, "Min bet 1 SEAS");

        // Allow increasing existing bet
        Bet storage existing = bets[predictionId][msg.sender];
        require(
            !existing.claimed && (existing.amount == 0 || existing.betOnAgent1 == betOnAgent1),
            "Switch sides not allowed"
        );

        require(seasToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        if (betOnAgent1) {
            p.agent1Pool += amount;
        } else {
            p.agent2Pool += amount;
        }

        existing.amount      += amount;
        existing.betOnAgent1  = betOnAgent1;

        emit BetPlaced(predictionId, msg.sender, betOnAgent1, amount);
    }

    /**
     * @dev Claim winnings after prediction is settled.
     *
     * Payout = (your_bet / winner_pool) × loser_pool × (1 - PROTOCOL_FEE)
     * Plus original bet returned.
     */
    function claimWinnings(uint256 predictionId) external nonReentrant {
        Prediction storage p = predictions[predictionId];
        require(p.isSettled, "Not yet settled");

        Bet storage bet = bets[predictionId][msg.sender];
        require(bet.amount > 0, "No bet placed");
        require(!bet.claimed,   "Already claimed");

        bool betWon = (bet.betOnAgent1 && p.winner == p.agent1) ||
                      (!bet.betOnAgent1 && p.winner == p.agent2);

        bet.claimed = true;

        if (!betWon) {
            // Lost — nothing to claim
            return;
        }

        uint256 winnerPool = bet.betOnAgent1 ? p.agent1Pool : p.agent2Pool;
        uint256 loserPool  = bet.betOnAgent1 ? p.agent2Pool : p.agent1Pool;

        // Your share of loser pool
        uint256 loserShare = (bet.amount * loserPool) / winnerPool;

        // Apply 2% protocol fee on winnings only
        uint256 fee      = (loserShare * PROTOCOL_FEE_BPS) / 10000;
        uint256 netGain  = loserShare - fee;

        // Total payout = original bet + net gain from loser pool
        uint256 totalPayout = bet.amount + netGain;

        // Send fee to treasury
        if (fee > 0 && treasury != address(0)) {
            seasToken.transfer(treasury, fee);
        }

        require(seasToken.transfer(msg.sender, totalPayout), "Payout failed");

        emit WinningsClaimed(predictionId, msg.sender, totalPayout);
    }

    // ─────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────

    function getPrediction(uint256 predictionId) external view returns (
        uint256 matchId, address agent1, address agent2,
        uint256 agent1Pool, uint256 agent2Pool,
        bool isOpen, bool isSettled, address winner
    ) {
        Prediction storage p = predictions[predictionId];
        return (
            p.matchId, p.agent1, p.agent2,
            p.agent1Pool, p.agent2Pool,
            p.isOpen, p.isSettled, p.winner
        );
    }

    function getBet(uint256 predictionId, address bettor) external view returns (
        uint256 amount, bool betOnAgent1, bool claimed
    ) {
        Bet storage b = bets[predictionId][bettor];
        return (b.amount, b.betOnAgent1, b.claimed);
    }

    function getPredictionByMatch(uint256 matchId) external view returns (uint256) {
        return matchToPrediction[matchId];
    }

    function getActivePredictions(uint256 count) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](count);
        uint256 idx;
        for (uint256 i = predictionCounter; i >= 1 && idx < count; i--) {
            if (predictions[i].isOpen) {
                result[idx++] = i;
            }
        }
        // Trim
        uint256[] memory trimmed = new uint256[](idx);
        for (uint256 i = 0; i < idx; i++) trimmed[i] = result[i];
        return trimmed;
    }
}
