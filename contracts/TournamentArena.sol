// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGameContractTournament {
    function executeDuel(address agent1, address agent2) external returns (address winner, uint256 rounds);
    function getShipStats(address player) external view returns (
        uint256 attack, uint256 defense, uint256 hp, uint256 maxHp,
        uint256 gold, uint256 crew, uint256 location, bool isPirate
    );
}

interface IAgentControllerTournament {
    function isRegistered(address agentAddress) external view returns (bool);
    function agents(address) external view returns (
        address owner, uint8 agentType, uint256 eloRating, uint256 wins,
        uint256 losses, uint256 bankroll, uint256 totalWagers, bool isActive, string memory agentAlias
    );
    function updateAfterMatch(address agentAddress, bool won, uint256 wagerAmount) external;
}

/**
 * @title TournamentArena
 * @dev Bracket-style tournaments for Seven Seas agents.
 *
 * - Supports 4, 8, or 16 participant brackets
 * - Auto-starts when bracket is full
 * - advanceRound() runs all pairwise duels for the current round
 * - Prize: 80% to champion, 20% to treasury
 */
contract TournamentArena is ReentrancyGuard, Ownable {

    IERC20 public seasToken;
    IGameContractTournament public gameContract;
    IAgentControllerTournament public agentController;
    address public treasury;

    uint256 public tournamentCounter;
    uint256 public activeTournamentCount;

    uint256 constant CHAMPION_SHARE  = 80; // 80% to winner
    uint256 constant TREASURY_SHARE  = 20; // 20% to treasury

    struct Tournament {
        uint256 tournamentId;
        uint256 entryFee;
        uint8   maxParticipants; // 4, 8, or 16
        uint8   currentParticipants;
        uint8   currentRound;
        bool    isActive;
        bool    isStarted;
        bool    isComplete;
        address champion;
        address[] participants;
        uint256 prizePool;
    }

    mapping(uint256 => Tournament) public tournaments;

    event TournamentCreated(uint256 indexed tournamentId, uint256 entryFee, uint8 maxParticipants);
    event ParticipantJoined(uint256 indexed tournamentId, address indexed participant);
    event TournamentStarted(uint256 indexed tournamentId);
    event RoundAdvanced(uint256 indexed tournamentId, uint8 round, address[] survivors);
    event TournamentComplete(uint256 indexed tournamentId, address indexed champion, uint256 prize);

    constructor(
        address _gameContract,
        address _agentController,
        address _seasToken,
        address _treasury
    ) Ownable(msg.sender) {
        gameContract    = IGameContractTournament(_gameContract);
        agentController = IAgentControllerTournament(_agentController);
        seasToken       = IERC20(_seasToken);
        treasury        = _treasury;
    }

    // ─────────────────────────────────────────
    // Tournament Lifecycle
    // ─────────────────────────────────────────

    /**
     * @dev Create a new tournament. Anyone can create.
     */
    function createTournament(uint256 entryFee, uint8 maxParticipants) external returns (uint256 tournamentId) {
        require(
            maxParticipants == 4 || maxParticipants == 8 || maxParticipants == 16,
            "Must be 4, 8, or 16 participants"
        );
        require(entryFee >= 10 * 10**18, "Min entry fee 10 SEAS");

        tournamentId = ++tournamentCounter;
        activeTournamentCount++;

        Tournament storage t = tournaments[tournamentId];
        t.tournamentId       = tournamentId;
        t.entryFee           = entryFee;
        t.maxParticipants    = maxParticipants;
        t.currentParticipants = 0;
        t.currentRound       = 0;
        t.isActive           = true;
        t.isStarted          = false;
        t.isComplete         = false;

        emit TournamentCreated(tournamentId, entryFee, maxParticipants);
        return tournamentId;
    }

    /**
     * @dev Join a tournament. Caller must approve entry fee first.
     */
    function joinTournament(uint256 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.isActive, "Tournament not active");
        require(!t.isStarted, "Tournament already started");
        require(t.currentParticipants < t.maxParticipants, "Tournament full");
        require(agentController.isRegistered(msg.sender), "Not a registered agent");

        // Check not already in tournament
        for (uint256 i = 0; i < t.participants.length; i++) {
            require(t.participants[i] != msg.sender, "Already joined");
        }

        require(seasToken.transferFrom(msg.sender, address(this), t.entryFee), "Entry fee failed");

        t.participants.push(msg.sender);
        t.currentParticipants++;
        t.prizePool += t.entryFee;

        emit ParticipantJoined(tournamentId, msg.sender);

        // Auto-start when full
        if (t.currentParticipants == t.maxParticipants) {
            t.isStarted    = true;
            t.currentRound = 1;
            emit TournamentStarted(tournamentId);
        }
    }

    /**
     * @dev Advance tournament by one round. Runs all pairwise duels.
     * Survivors advance to next round. Can be called by anyone.
     */
    function advanceRound(uint256 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.isStarted,   "Not started");
        require(!t.isComplete, "Already complete");
        require(t.participants.length >= 2, "Need at least 2 participants");

        address[] storage alive = t.participants;
        address[] memory survivors = new address[](alive.length / 2 + alive.length % 2);
        uint256 survivorCount = 0;

        // Pair up participants. Odd one out gets a bye (advances automatically)
        uint256 i = 0;
        while (i < alive.length) {
            if (i + 1 < alive.length) {
                // Duel pair
                (address winner,) = gameContract.executeDuel(alive[i], alive[i + 1]);
                survivors[survivorCount++] = winner;

                // Update ELO (small amount for tournament matches)
                address loser = winner == alive[i] ? alive[i + 1] : alive[i];
                agentController.updateAfterMatch(winner, true,  t.entryFee);
                agentController.updateAfterMatch(loser,  false, t.entryFee);
                i += 2;
            } else {
                // Bye — odd participant advances automatically
                survivors[survivorCount++] = alive[i];
                i++;
            }
        }

        // Replace participants with survivors
        // Trim survivors array to actual count
        address[] memory trimmed = new address[](survivorCount);
        for (uint256 j = 0; j < survivorCount; j++) {
            trimmed[j] = survivors[j];
        }

        // Reset and repopulate
        delete t.participants;
        for (uint256 j = 0; j < trimmed.length; j++) {
            t.participants.push(trimmed[j]);
        }

        t.currentRound++;

        emit RoundAdvanced(tournamentId, t.currentRound - 1, trimmed);

        // Check if tournament is over (1 survivor)
        if (t.participants.length == 1) {
            address champion = t.participants[0];
            t.champion   = champion;
            t.isComplete = true;
            t.isActive   = false;
            activeTournamentCount--;

            uint256 championPrize = (t.prizePool * CHAMPION_SHARE) / 100;
            uint256 treasuryShare = t.prizePool - championPrize;

            require(seasToken.transfer(champion, championPrize), "Prize transfer failed");
            if (treasuryShare > 0 && treasury != address(0)) {
                require(seasToken.transfer(treasury, treasuryShare), "Treasury transfer failed");
            }

            emit TournamentComplete(tournamentId, champion, championPrize);
        }
    }

    // ─────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────

    function getTournament(uint256 tournamentId) external view returns (
        uint256 entryFee, uint8 maxParticipants, uint8 currentParticipants,
        uint8 currentRound, bool isActive, bool isStarted, bool isComplete,
        address champion, uint256 prizePool
    ) {
        Tournament storage t = tournaments[tournamentId];
        return (
            t.entryFee, t.maxParticipants, t.currentParticipants,
            t.currentRound, t.isActive, t.isStarted, t.isComplete,
            t.champion, t.prizePool
        );
    }

    function getTournamentParticipants(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].participants;
    }

    function getActiveTournaments() external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](activeTournamentCount);
        uint256 idx;
        for (uint256 i = 1; i <= tournamentCounter; i++) {
            if (tournaments[i].isActive) {
                result[idx++] = i;
            }
        }
        return result;
    }
}
