// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IArmadaToken {
    function mintFromGameplay(address to, uint256 amount, string calldata reason) external;
    function burnFrom(address from, uint256 amount, string calldata reason) external;
}

/**
 * @title BattlePass
 * @dev Seasonal progression system for Mantle Armada
 * 
 * Key Features:
 * - 90-day seasons with 100 levels
 * - XP from battles, check-ins, and GPM claims
 * - Free and Premium tiers
 * - Rewards: gold, diamonds, $ARMADA tokens, cosmetics
 * - Auto-level up on XP milestones
 * - Premium pass costs 100 $ARMADA
 * 
 * This creates daily login habits and long-term player retention!
 */
contract BattlePass is Ownable, ReentrancyGuard {
    
    IArmadaToken public armadaToken;
    address public gameContract;
    
    // Structs
    struct PassLevel {
        uint256 experienceRequired;
        uint256 goldReward;
        uint256 diamondReward;
        uint256 armadaReward; // In wei (with 18 decimals)
        string cosmeticReward; // NFT ID or item ID
        bool hasPremiumReward;
    }
    
    struct PlayerPass {
        uint256 season;
        uint256 level;
        uint256 experience;
        bool isPremium;
        uint256 lastRewardClaimed;
        uint256 createdAt;
    }
    
    // State variables
    mapping(uint256 => PassLevel) public passLevels;
    mapping(address => PlayerPass) public playerPasses;
    
    uint256 public constant SEASON_DURATION = 90 days;
    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant PREMIUM_COST = 100 * 10**18; // 100 ARMADA tokens
    
    uint256 public currentSeason = 1;
    uint256 public seasonStartTime;
    uint256 public seasonEndTime;
    
    // XP rewards for different actions
    uint256 public constant XP_PER_BATTLE_WIN = 10;
    uint256 public constant XP_PER_CHECKIN = 5;
    uint256 public constant XP_PER_GPM_CLAIM = 1;
    uint256 public constant XP_PER_UPGRADE = 3;
    
    // Events
    event PassCreated(address indexed player, bool isPremium, uint256 season);
    event PassUpgradedToPremium(address indexed player, uint256 season);
    event ExperienceGained(address indexed player, uint256 xp, string action);
    event LevelUp(address indexed player, uint256 newLevel);
    event RewardClaimed(address indexed player, uint256 level, uint256 goldReward, uint256 diamondReward, uint256 armadaReward);
    event SeasonEnded(uint256 season);
    event SeasonStarted(uint256 season, uint256 startTime, uint256 endTime);
    
    constructor(address _armadaTokenAddress) Ownable(msg.sender) {
        require(_armadaTokenAddress != address(0), "Invalid token address");
        armadaToken = IArmadaToken(_armadaTokenAddress);
        
        seasonStartTime = block.timestamp;
        seasonEndTime = block.timestamp + SEASON_DURATION;
        
        _initializePassLevels();
        
        emit SeasonStarted(currentSeason, seasonStartTime, seasonEndTime);
    }
    
    /**
     * @dev Set game contract address (only owner)
     */
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid game contract");
        gameContract = _gameContract;
    }
    
    /**
     * @dev Initialize pass level rewards
     * Called in constructor and when starting new season
     */
    function _initializePassLevels() internal {
        // Levels 1-20: Small gold rewards
        for (uint i = 1; i <= 20; i++) {
            passLevels[i] = PassLevel({
                experienceRequired: i * 100,
                goldReward: 10 * i,
                diamondReward: 0,
                armadaReward: 1 * 10**18, // 1 ARMADA
                cosmeticReward: "",
                hasPremiumReward: false
            });
        }
        
        // Levels 21-50: Medium rewards with some cosmetics
        for (uint i = 21; i <= 50; i++) {
            bool hasPremium = (i % 10 == 0); // Every 10 levels
            passLevels[i] = PassLevel({
                experienceRequired: i * 100,
                goldReward: 20 * i,
                diamondReward: (i % 10 == 0) ? 1 : 0,
                armadaReward: 2 * 10**18, // 2 ARMADA
                cosmeticReward: hasPremium ? string(abi.encodePacked("cosmetic_", i)) : "",
                hasPremiumReward: hasPremium
            });
        }
        
        // Levels 51-100: Large rewards
        for (uint i = 51; i <= MAX_LEVEL; i++) {
            bool hasPremium = (i % 5 == 0); // Every 5 levels
            passLevels[i] = PassLevel({
                experienceRequired: i * 100,
                goldReward: 50 * i,
                diamondReward: (i % 10 == 0) ? 2 : 0,
                armadaReward: 5 * 10**18, // 5 ARMADA
                cosmeticReward: hasPremium ? string(abi.encodePacked("cosmetic_", i)) : "",
                hasPremiumReward: hasPremium
            });
        }
    }
    
    /**
     * @dev Create a battle pass (free version)
     */
    function createPass() external nonReentrant {
        require(playerPasses[msg.sender].season != currentSeason, "Already have pass this season");
        require(block.timestamp < seasonEndTime, "Season ended");
        
        playerPasses[msg.sender] = PlayerPass({
            season: currentSeason,
            level: 0,
            experience: 0,
            isPremium: false,
            lastRewardClaimed: 0,
            createdAt: block.timestamp
        });
        
        emit PassCreated(msg.sender, false, currentSeason);
    }
    
    /**
     * @dev Upgrade to premium pass (costs 100 ARMADA tokens)
     */
    function upgradeToPremium() external nonReentrant {
        PlayerPass storage pass = playerPasses[msg.sender];
        require(pass.season == currentSeason, "No active pass");
        require(!pass.isPremium, "Already premium");
        
        // Burn 100 ARMADA tokens from player
        armadaToken.burnFrom(msg.sender, PREMIUM_COST, "battle_pass_premium");
        
        pass.isPremium = true;
        
        emit PassUpgradedToPremium(msg.sender, currentSeason);
    }
    
    /**
     * @dev Gain experience (called by game contract)
     * @param _player Address of the player
     * @param _xp Amount of XP to award
     * @param _action Action that triggered XP gain
     */
    function gainExperience(
        address _player, 
        uint256 _xp, 
        string calldata _action
    ) external nonReentrant {
        require(msg.sender == gameContract, "Only game contract can award XP");
        require(_player != address(0), "Invalid player");
        
        PlayerPass storage pass = playerPasses[_player];
        
        // Auto-create pass if player doesn't have one
        if (pass.season != currentSeason) {
            playerPasses[_player] = PlayerPass({
                season: currentSeason,
                level: 0,
                experience: 0,
                isPremium: false,
                lastRewardClaimed: 0,
                createdAt: block.timestamp
            });
            pass = playerPasses[_player];
            emit PassCreated(_player, false, currentSeason);
        }
        
        uint256 oldLevel = pass.level;
        pass.experience += _xp;
        
        // Auto-level up if player reached next level threshold
        while (pass.level < MAX_LEVEL && 
               pass.experience >= passLevels[pass.level + 1].experienceRequired) {
            pass.level++;
            emit LevelUp(_player, pass.level);
        }
        
        emit ExperienceGained(_player, _xp, _action);
    }
    
    /**
     * @dev Claim rewards for a specific level
     * @param _level Level to claim rewards for
     */
    function claimLevelReward(uint256 _level) external nonReentrant {
        PlayerPass storage pass = playerPasses[msg.sender];
        require(pass.season == currentSeason, "No active pass");
        require(pass.level >= _level, "Level not reached");
        require(_level > pass.lastRewardClaimed, "Already claimed");
        require(_level <= MAX_LEVEL, "Invalid level");
        
        PassLevel storage levelData = passLevels[_level];
        pass.lastRewardClaimed = _level;
        
        uint256 goldReward = levelData.goldReward;
        uint256 diamondReward = levelData.diamondReward;
        uint256 armadaReward = levelData.armadaReward;
        
        // Premium pass gets 50% more rewards
        if (pass.isPremium) {
            goldReward = (goldReward * 150) / 100;
            armadaReward = (armadaReward * 150) / 100;
        }
        
        // Mint ARMADA tokens to player
        if (armadaReward > 0) {
            armadaToken.mintFromGameplay(msg.sender, armadaReward, "battle_pass_reward");
        }
        
        // Note: Gold and diamond rewards are handled in game contract
        // This contract just emits the event for tracking
        
        emit RewardClaimed(msg.sender, _level, goldReward, diamondReward, armadaReward);
    }
    
    /**
     * @dev Claim multiple level rewards at once
     * @param _levels Array of levels to claim
     */
    function claimMultipleLevelRewards(uint256[] calldata _levels) external nonReentrant {
        PlayerPass storage pass = playerPasses[msg.sender];
        require(pass.season == currentSeason, "No active pass");
        
        for (uint i = 0; i < _levels.length; i++) {
            uint256 level = _levels[i];
            
            if (pass.level < level) continue;
            if (level <= pass.lastRewardClaimed) continue;
            if (level > MAX_LEVEL) continue;
            
            PassLevel storage levelData = passLevels[level];
            pass.lastRewardClaimed = level;
            
            uint256 goldReward = levelData.goldReward;
            uint256 diamondReward = levelData.diamondReward;
            uint256 armadaReward = levelData.armadaReward;
            
            // Premium pass gets 50% more rewards
            if (pass.isPremium) {
                goldReward = (goldReward * 150) / 100;
                armadaReward = (armadaReward * 150) / 100;
            }
            
            // Mint ARMADA tokens to player
            if (armadaReward > 0) {
                armadaToken.mintFromGameplay(msg.sender, armadaReward, "battle_pass_reward");
            }
            
            emit RewardClaimed(msg.sender, level, goldReward, diamondReward, armadaReward);
        }
    }
    
    /**
     * @dev End current season and start new one (only owner)
     */
    function endSeasonAndStartNew() external onlyOwner {
        require(block.timestamp >= seasonEndTime, "Season not ended yet");
        
        emit SeasonEnded(currentSeason);
        
        currentSeason++;
        seasonStartTime = block.timestamp;
        seasonEndTime = block.timestamp + SEASON_DURATION;
        
        // Reinitialize pass levels for new season
        _initializePassLevels();
        
        emit SeasonStarted(currentSeason, seasonStartTime, seasonEndTime);
    }
    
    // VIEW FUNCTIONS
    
    /**
     * @dev Get player's battle pass info
     */
    function getPlayerPass(address _player) external view returns (PlayerPass memory) {
        return playerPasses[_player];
    }
    
    /**
     * @dev Get level reward info
     */
    function getPassLevel(uint256 _level) external view returns (PassLevel memory) {
        return passLevels[_level];
    }
    
    /**
     * @dev Get current season info
     */
    function getSeasonInfo() external view returns (
        uint256 season,
        uint256 startTime,
        uint256 endTime,
        uint256 timeRemaining
    ) {
        uint256 remaining = block.timestamp >= seasonEndTime ? 0 : seasonEndTime - block.timestamp;
        return (currentSeason, seasonStartTime, seasonEndTime, remaining);
    }
    
    /**
     * @dev Get unclaimed rewards for a player
     */
    function getUnclaimedRewards(address _player) external view returns (
        uint256[] memory levels,
        uint256 totalGold,
        uint256 totalDiamonds,
        uint256 totalArmada
    ) {
        PlayerPass storage pass = playerPasses[_player];
        if (pass.season != currentSeason) {
            return (new uint256[](0), 0, 0, 0);
        }
        
        uint256 count = pass.level - pass.lastRewardClaimed;
        if (count == 0) {
            return (new uint256[](0), 0, 0, 0);
        }
        
        levels = new uint256[](count);
        uint256 idx = 0;
        
        for (uint256 i = pass.lastRewardClaimed + 1; i <= pass.level; i++) {
            levels[idx] = i;
            
            PassLevel storage levelData = passLevels[i];
            uint256 goldReward = levelData.goldReward;
            uint256 armadaReward = levelData.armadaReward;
            
            if (pass.isPremium) {
                goldReward = (goldReward * 150) / 100;
                armadaReward = (armadaReward * 150) / 100;
            }
            
            totalGold += goldReward;
            totalDiamonds += levelData.diamondReward;
            totalArmada += armadaReward;
            
            idx++;
        }
        
        return (levels, totalGold, totalDiamonds, totalArmada);
    }
    
    /**
     * @dev Check if player has active pass
     */
    function hasActivePass(address _player) external view returns (bool) {
        return playerPasses[_player].season == currentSeason;
    }
    
    /**
     * @dev Get XP needed for next level
     */
    function getXPForNextLevel(address _player) external view returns (uint256) {
        PlayerPass storage pass = playerPasses[_player];
        if (pass.season != currentSeason || pass.level >= MAX_LEVEL) {
            return 0;
        }
        
        uint256 nextLevel = pass.level + 1;
        uint256 xpNeeded = passLevels[nextLevel].experienceRequired;
        
        if (pass.experience >= xpNeeded) {
            return 0;
        }
        
        return xpNeeded - pass.experience;
    }
}

