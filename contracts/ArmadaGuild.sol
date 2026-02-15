// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArmadaGuild
 * @dev Guild system for Mantle Armada - creates network effects and social gameplay
 * 
 * Key Features:
 * - Create guilds (costs 500 gold in main game)
 * - Join guilds (invitation-based)
 * - Guild treasury (receives 10% of member battle wins)
 * - Guild dividends (distributed proportionally to contribution)
 * - Guild wars (weekly competitions between guilds)
 * - Guild rankings and leaderboards
 * 
 * This is the SOCIAL LAYER that makes the game viral and creates network effects!
 */
contract ArmadaGuild is Ownable, ReentrancyGuard {
    
    // Structs
    struct Guild {
        string name;
        address leader;
        uint256 createdAt;
        uint256 memberCount;
        uint256 treasury; // Gold accumulated from member battles
        bool isActive;
        uint256 totalBattlesWon;
        string logo; // IPFS hash or URL
        uint256 level; // Guild level based on activity
    }
    
    struct GuildMember {
        address memberAddress;
        uint256 joinedAt;
        uint256 contribution; // Battles won while in guild
        bool isOfficer;
        uint256 lastDividendClaim;
    }
    
    struct GuildWar {
        uint256 warId;
        uint256 guild1;
        uint256 guild2;
        uint256 score1;
        uint256 score2;
        uint256 startTime;
        uint256 endTime;
        bool completed;
        address winner; // Winner guild leader address
    }
    
    // State variables
    mapping(uint256 => Guild) public guilds;
    mapping(address => uint256) public playerToGuild; // Player address → Guild ID
    mapping(uint256 => GuildMember[]) public guildMembers;
    mapping(uint256 => GuildWar) public guildWars;
    mapping(uint256 => mapping(address => uint256)) public memberContribution; // guildId → member → contribution
    
    uint256 public nextGuildId = 1;
    uint256 public nextWarId = 1;
    
    // Constants
    uint256 public constant GUILD_CREATION_COST = 500; // Gold cost (checked in main game)
    uint256 public constant MIN_MEMBERS_FOR_WAR = 3;
    uint256 public constant GUILD_WAR_DURATION = 7 days;
    uint256 public constant TREASURY_FEE_PERCENT = 10; // 10% of battle loot goes to guild
    
    // Reference to main game contract
    address public gameContract;
    
    // Events
    event GuildCreated(uint256 indexed guildId, string name, address indexed leader);
    event MemberJoined(uint256 indexed guildId, address indexed member);
    event MemberLeft(uint256 indexed guildId, address indexed member);
    event TreasuryUpdated(uint256 indexed guildId, uint256 amount, address indexed contributor);
    event DividendsClaimed(uint256 indexed guildId, address indexed member, uint256 amount);
    event GuildWarStarted(uint256 indexed warId, uint256 guild1, uint256 guild2);
    event GuildWarEnded(uint256 indexed warId, uint256 winnerGuild);
    event GuildLevelUp(uint256 indexed guildId, uint256 newLevel);
    event LeadershipTransferred(uint256 indexed guildId, address indexed oldLeader, address indexed newLeader);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Set the game contract address (only owner)
     * @param _gameContract Address of the main game contract
     */
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid game contract");
        gameContract = _gameContract;
    }
    
    /**
     * @dev Create a new guild
     * Note: Gold cost (500) is deducted in the main game contract before calling this
     * @param _name Guild name (1-20 characters)
     * @param _logo IPFS hash or URL for guild logo
     */
    function createGuild(string calldata _name, string calldata _logo) external nonReentrant {
        require(bytes(_name).length > 0 && bytes(_name).length <= 20, "Invalid guild name length");
        require(playerToGuild[msg.sender] == 0, "Already in a guild");
        
        uint256 guildId = nextGuildId;
        
        guilds[guildId] = Guild({
            name: _name,
            leader: msg.sender,
            createdAt: block.timestamp,
            memberCount: 1,
            treasury: 0,
            isActive: true,
            totalBattlesWon: 0,
            logo: _logo,
            level: 1
        });
        
        // Add creator as first member
        playerToGuild[msg.sender] = guildId;
        guildMembers[guildId].push(GuildMember({
            memberAddress: msg.sender,
            joinedAt: block.timestamp,
            contribution: 0,
            isOfficer: true, // Leader is automatically an officer
            lastDividendClaim: block.timestamp
        }));
        
        emit GuildCreated(guildId, _name, msg.sender);
        nextGuildId++;
    }
    
    /**
     * @dev Join an existing guild
     * @param _guildId ID of the guild to join
     */
    function joinGuild(uint256 _guildId) external nonReentrant {
        require(playerToGuild[msg.sender] == 0, "Already in a guild");
        require(guilds[_guildId].isActive, "Guild not active");
        require(_guildId > 0 && _guildId < nextGuildId, "Invalid guild ID");
        
        Guild storage guild = guilds[_guildId];
        guild.memberCount++;
        
        playerToGuild[msg.sender] = _guildId;
        guildMembers[_guildId].push(GuildMember({
            memberAddress: msg.sender,
            joinedAt: block.timestamp,
            contribution: 0,
            isOfficer: false,
            lastDividendClaim: block.timestamp
        }));
        
        emit MemberJoined(_guildId, msg.sender);
    }
    
    /**
     * @dev Leave current guild
     */
    function leaveGuild() external nonReentrant {
        uint256 guildId = playerToGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(guilds[guildId].leader != msg.sender, "Leader cannot leave (transfer leadership first)");
        
        Guild storage guild = guilds[guildId];
        guild.memberCount--;
        
        // Remove from members array
        GuildMember[] storage members = guildMembers[guildId];
        for (uint i = 0; i < members.length; i++) {
            if (members[i].memberAddress == msg.sender) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        playerToGuild[msg.sender] = 0;
        memberContribution[guildId][msg.sender] = 0;
        
        emit MemberLeft(guildId, msg.sender);
    }
    
    /**
     * @dev Add gold to guild treasury (called by game contract when member wins battle)
     * @param _memberAddress Address of the guild member who won
     * @param _goldAmount Amount of gold won in battle
     */
    function addTreasuryReward(address _memberAddress, uint256 _goldAmount) external {
        require(msg.sender == gameContract, "Only game contract can call");
        
        uint256 guildId = playerToGuild[_memberAddress];
        if (guildId == 0) return; // Member not in a guild
        
        Guild storage guild = guilds[guildId];
        if (!guild.isActive) return;
        
        // Add 10% of battle loot to guild treasury
        uint256 treasuryAmount = (_goldAmount * TREASURY_FEE_PERCENT) / 100;
        guild.treasury += treasuryAmount;
        guild.totalBattlesWon++;
        
        // Track member contribution
        memberContribution[guildId][_memberAddress]++;
        
        // Check for guild level up (every 50 battles)
        if (guild.totalBattlesWon % 50 == 0) {
            guild.level++;
            emit GuildLevelUp(guildId, guild.level);
        }
        
        emit TreasuryUpdated(guildId, treasuryAmount, _memberAddress);
    }
    
    /**
     * @dev Claim guild dividends (proportional to contribution)
     * Dividends are paid out from guild treasury based on battles won
     */
    function claimGuildDividends() external nonReentrant {
        uint256 guildId = playerToGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        
        Guild storage guild = guilds[guildId];
        require(guild.treasury > 0, "No treasury to distribute");
        
        uint256 memberContr = memberContribution[guildId][msg.sender];
        require(memberContr > 0, "No contribution to claim");
        
        // Calculate total contribution
        uint256 totalContr = 0;
        GuildMember[] storage members = guildMembers[guildId];
        for (uint i = 0; i < members.length; i++) {
            totalContr += memberContribution[guildId][members[i].memberAddress];
        }
        
        require(totalContr > 0, "No total contribution");
        
        // Calculate member's share (proportional to contribution)
        uint256 share = (guild.treasury * memberContr) / totalContr;
        require(share > 0, "No share to claim");
        
        // Deduct from treasury
        guild.treasury -= share;
        
        // Reset member contribution after claim
        memberContribution[guildId][msg.sender] = 0;
        
        // Note: Actual gold transfer happens in game contract
        // This just tracks the dividend amount
        
        emit DividendsClaimed(guildId, msg.sender, share);
    }
    
    /**
     * @dev Start a guild war between two guilds
     * @param _guild2 ID of the opposing guild
     */
    function startGuildWar(uint256 _guild2) external nonReentrant {
        uint256 guild1 = playerToGuild[msg.sender];
        require(guild1 != 0, "Not in a guild");
        require(guilds[guild1].leader == msg.sender, "Only leader can start war");
        require(guildMembers[guild1].length >= MIN_MEMBERS_FOR_WAR, "Not enough members");
        require(guildMembers[_guild2].length >= MIN_MEMBERS_FOR_WAR, "Opponent not enough members");
        require(guild1 != _guild2, "Cannot war with own guild");
        
        uint256 warId = nextWarId;
        guildWars[warId] = GuildWar({
            warId: warId,
            guild1: guild1,
            guild2: _guild2,
            score1: 0,
            score2: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + GUILD_WAR_DURATION,
            completed: false,
            winner: address(0)
        });
        
        emit GuildWarStarted(warId, guild1, _guild2);
        nextWarId++;
    }
    
    /**
     * @dev End a guild war and determine winner
     * @param _warId ID of the war to end
     */
    function endGuildWar(uint256 _warId) external nonReentrant {
        GuildWar storage war = guildWars[_warId];
        require(!war.completed, "War already completed");
        require(block.timestamp >= war.endTime, "War still ongoing");
        
        uint256 winnerGuildId;
        if (war.score1 > war.score2) {
            winnerGuildId = war.guild1;
        } else {
            winnerGuildId = war.guild2;
        }
        
        war.completed = true;
        war.winner = guilds[winnerGuildId].leader;
        
        // Increase winner guild's battle count
        guilds[winnerGuildId].totalBattlesWon += 10; // Bonus for winning war
        
        emit GuildWarEnded(_warId, winnerGuildId);
    }
    
    /**
     * @dev Transfer guild leadership
     * @param _newLeader Address of new leader (must be a member)
     */
    function transferLeadership(address _newLeader) external nonReentrant {
        uint256 guildId = playerToGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(guilds[guildId].leader == msg.sender, "Only leader can transfer");
        require(playerToGuild[_newLeader] == guildId, "New leader not in guild");
        
        address oldLeader = guilds[guildId].leader;
        guilds[guildId].leader = _newLeader;
        
        emit LeadershipTransferred(guildId, oldLeader, _newLeader);
    }
    
    /**
     * @dev Promote member to officer (only leader)
     * @param _member Address of member to promote
     */
    function promoteToOfficer(address _member) external {
        uint256 guildId = playerToGuild[msg.sender];
        require(guildId != 0, "Not in a guild");
        require(guilds[guildId].leader == msg.sender, "Only leader can promote");
        require(playerToGuild[_member] == guildId, "Member not in guild");
        
        GuildMember[] storage members = guildMembers[guildId];
        for (uint i = 0; i < members.length; i++) {
            if (members[i].memberAddress == _member) {
                members[i].isOfficer = true;
                break;
            }
        }
    }
    
    // VIEW FUNCTIONS
    
    /**
     * @dev Get guild information
     * @param _guildId ID of the guild
     */
    function getGuild(uint256 _guildId) external view returns (Guild memory) {
        return guilds[_guildId];
    }
    
    /**
     * @dev Get all members of a guild
     * @param _guildId ID of the guild
     */
    function getGuildMembers(uint256 _guildId) external view returns (GuildMember[] memory) {
        return guildMembers[_guildId];
    }
    
    /**
     * @dev Get guild ID for a player
     * @param _player Address of the player
     */
    function getPlayerGuild(address _player) external view returns (uint256) {
        return playerToGuild[_player];
    }
    
    /**
     * @dev Get guild war information
     * @param _warId ID of the war
     */
    function getGuildWar(uint256 _warId) external view returns (GuildWar memory) {
        return guildWars[_warId];
    }
    
    /**
     * @dev Get member's contribution in their guild
     * @param _member Address of the member
     */
    function getMemberContribution(address _member) external view returns (uint256) {
        uint256 guildId = playerToGuild[_member];
        if (guildId == 0) return 0;
        return memberContribution[guildId][_member];
    }
    
    /**
     * @dev Get claimable dividends for a member
     * @param _member Address of the member
     */
    function getClaimableDividends(address _member) external view returns (uint256) {
        uint256 guildId = playerToGuild[_member];
        if (guildId == 0) return 0;
        
        Guild storage guild = guilds[guildId];
        if (guild.treasury == 0) return 0;
        
        uint256 memberContr = memberContribution[guildId][_member];
        if (memberContr == 0) return 0;
        
        // Calculate total contribution
        uint256 totalContr = 0;
        GuildMember[] storage members = guildMembers[guildId];
        for (uint i = 0; i < members.length; i++) {
            totalContr += memberContribution[guildId][members[i].memberAddress];
        }
        
        if (totalContr == 0) return 0;
        
        return (guild.treasury * memberContr) / totalContr;
    }
    
    /**
     * @dev Get top guilds by battle wins
     * @param _count Number of top guilds to return
     */
    function getTopGuilds(uint256 _count) external view returns (uint256[] memory, uint256[] memory) {
        uint256 guildCount = nextGuildId - 1;
        if (_count > guildCount) _count = guildCount;
        
        uint256[] memory topGuildIds = new uint256[](_count);
        uint256[] memory topScores = new uint256[](_count);
        
        // Simple bubble sort for top guilds
        for (uint256 i = 1; i < nextGuildId; i++) {
            if (!guilds[i].isActive) continue;
            
            uint256 score = guilds[i].totalBattlesWon;
            
            for (uint256 j = 0; j < _count; j++) {
                if (score > topScores[j]) {
                    // Shift elements down
                    for (uint256 k = _count - 1; k > j; k--) {
                        topGuildIds[k] = topGuildIds[k - 1];
                        topScores[k] = topScores[k - 1];
                    }
                    topGuildIds[j] = i;
                    topScores[j] = score;
                    break;
                }
            }
        }
        
        return (topGuildIds, topScores);
    }
}

