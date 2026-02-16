// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interfaces for new contracts
interface IArmadaToken {
    function mintFromGameplay(address to, uint256 amount, string calldata reason) external;
}

interface IArmadaGuild {
    function addTreasuryReward(address member, uint256 goldAmount) external;
}

interface IBattlePass {
    function gainExperience(address player, uint256 xp, string calldata action) external;
}

interface IShipNFT {
    function updateShipPower(uint256 tokenId, uint256 newBattlePower) external;
}

/**
 * @title MantleArmada
 * @dev Main game contract for Mantle Armada (upgraded from SeasOfLinkardia)
 * 
 * NEW FEATURES FOR MANTLE HACKATHON:
 * - Integrated with ArmadaToken (ERC-20) for game economy
 * - Integrated with ArmadaGuild for social gameplay
 * - Integrated with BattlePass for progression
 * - Integrated with ShipNFT for yield-bearing assets
 * - Optimized for Mantle: 10-second GPM cycles (was 60 seconds on AVAX)
 * - Batch operations for gas efficiency
 * - MNT native currency (not AVAX)
 */
contract MantleArmada is Ownable, ReentrancyGuard {
    
    // NEW: References to ecosystem contracts
    IArmadaToken public armadaToken;
    IArmadaGuild public guildContract;
    IBattlePass public battlePassContract;
    IShipNFT public shipNFTContract;
    
    constructor() Ownable(msg.sender) {}
    
    struct Account {
        string boatName;
        bool isPirate; // true = piracy, false = navy
        uint256 gold;
        uint256 diamonds;
        uint256 hp;
        uint256 maxHp;
        uint256 speed;
        uint256 attack;
        uint256 defense;
        uint256 crew;
        uint256 maxCrew;
        uint256 location;
        uint256 gpm;
        uint256 lastCheckIn;
        uint256 checkInStreak;
        uint256 lastWrecked;
        uint256 travelEnd;
        uint256 lastGPMClaim;
        uint256 repairEnd;
    }

    // NEW: Referral System Structures
    struct ReferralData {
        address referrer;           // Who referred this player
        uint256 totalReferrals;     // How many people this player has referred
        uint256 referralRewards;    // Total rewards earned from referrals
    }

    struct Upgrade {
        string name;
        uint256 cost;
        uint256 gpmBonus;
        uint256 maxHpBonus;
        uint256 speedBonus;
        uint256 attackBonus;
        uint256 defenseBonus;
        uint256 maxCrewBonus;
    }

    mapping(address => Account) public accounts;
    mapping(uint256 => Upgrade) public upgrades;
    mapping(address => mapping(uint256 => uint256)) public purchaseCounts;
    uint256 public nextUpgradeId;

    address[] public players;

    // NEW: Referral System Mappings
    mapping(address => ReferralData) public referralData;
    mapping(string => address) public referralCodes;      // "REF_A3F2B1" => player address
    mapping(address => string) public playerReferralCode; // player address => "REF_A3F2B1"

    // Monad: ~1s block time, 1-second GPM cycles
    uint256 constant GPM_CYCLE_SECONDS = 1; // 1 second on Monad
    uint256 constant BASE_REPAIR_TIME = 5 hours;
    uint256 constant PORT_REPAIR_TIME = 1 hours;

    uint256 constant PORT25 = 25;
    uint256 constant PORT55 = 55;
    uint256 constant PORT89 = 89;

    // NEW: Rewards for ecosystem integration
    uint256 constant ARMADA_PER_BATTLE_WIN = 1 * 10**18; // 1 ARMADA per win
    uint256 constant ARMADA_PER_CHECKIN = 1 * 10**18; // 1 ARMADA per check-in

    // NEW: Referral Rewards
    uint256 constant REFERRER_ARMADA_REWARD = 50 * 10**18;  // 50 ARMADA for referrer
    uint256 constant REFERRER_DIAMOND_REWARD = 1;           // 1 Diamond for referrer
    uint256 constant REFEREE_ARMADA_REWARD = 100 * 10**18;  // 100 ARMADA for new player
    uint256 constant REFEREE_GOLD_REWARD = 200;             // 200 Gold for new player
    uint256 constant REFEREE_DIAMOND_REWARD = 1;            // 1 Diamond for new player

    event AccountCreated(address indexed user, string boatName, bool isPirate);
    event UpgradeAdded(uint256 indexed id, string name);
    event UpgradePurchased(address indexed user, uint256 indexed id);
    event CheckIn(address indexed user, uint256 streak, uint256 reward);
    event ShipAttacked(address indexed attacker, address indexed defender, bool destroyed);
    event TravelStarted(address indexed user, uint256 toLocation, uint256 arriveAt, bool fast);
    event GPMClaimed(address indexed user, uint256 amount, uint256 timeElapsed);
    event CrewHired(address indexed user, uint256 crewHired, uint256 cost);
    event ShipRepaired(address indexed user, uint256 repairType, uint256 cost, uint256 waitTime);
    // NEW EVENTS
    event ArmadaTokenMinted(address indexed user, uint256 amount, string reason);
    event BattlePassXPGained(address indexed user, uint256 xp, string action);
    event GuildTreasuryUpdated(address indexed member, uint256 amount);
    event ReferralCodeGenerated(address indexed player, string referralCode);
    event ReferralUsed(address indexed referrer, address indexed referee, string referralCode);
    
    enum RepairType { FREE, GOLD, DIAMOND }

    /**
     * @dev Set ecosystem contract addresses (only owner, once)
     */
    function setEcosystemContracts(
        address _armadaToken,
        address _guildContract,
        address _battlePassContract,
        address _shipNFTContract
    ) external onlyOwner {
        require(_armadaToken != address(0), "Invalid token address");
        
        armadaToken = IArmadaToken(_armadaToken);
        
        if (_guildContract != address(0)) {
            guildContract = IArmadaGuild(_guildContract);
        }
        if (_battlePassContract != address(0)) {
            battlePassContract = IBattlePass(_battlePassContract);
        }
        if (_shipNFTContract != address(0)) {
            shipNFTContract = IShipNFT(_shipNFTContract);
        }
    }

    function isPort(uint256 location) public pure returns (bool) {
        return location == PORT25 || location == PORT55 || location == PORT89;
    }

    function _getNearestPort(uint256 currentLocation) internal pure returns (uint256) {
        uint256 distanceToPort25 = currentLocation > PORT25 ? currentLocation - PORT25 : PORT25 - currentLocation;
        uint256 distanceToPort55 = currentLocation > PORT55 ? currentLocation - PORT55 : PORT55 - currentLocation;
        uint256 distanceToPort89 = currentLocation > PORT89 ? currentLocation - PORT89 : PORT89 - currentLocation;
        
        if (distanceToPort25 <= distanceToPort55 && distanceToPort25 <= distanceToPort89) {
            return PORT25;
        } else if (distanceToPort55 <= distanceToPort89) {
            return PORT55;
        } else {
            return PORT89;
        }
    }

    /**
     * @dev Generate a unique referral code from player address
     * Format: "REF_" + first 6 chars of address
     */
    function _generateReferralCode(address player) internal pure returns (string memory) {
        bytes memory addressBytes = abi.encodePacked(player);
        bytes memory result = new bytes(10); // "REF_" + 6 chars

        result[0] = 'R';
        result[1] = 'E';
        result[2] = 'F';
        result[3] = '_';

        bytes memory hexChars = "0123456789ABCDEF";
        for (uint i = 0; i < 6; i++) {
            uint8 value = uint8(addressBytes[i]);
            result[4 + i] = hexChars[value >> 4];
        }

        return string(result);
    }

    /**
     * @dev Create account without referral (legacy function)
     */
    function createAccount(string calldata _boatName, bool _isPirate, uint256 _startLocation) external {
        _createAccountInternal(msg.sender, _boatName, _isPirate, _startLocation, "");
    }

    /**
     * @dev NEW: Create account with optional referral code
     */
    function createAccountWithReferral(
        string calldata _boatName,
        bool _isPirate,
        uint256 _startLocation,
        string calldata _referralCode
    ) external {
        _createAccountInternal(msg.sender, _boatName, _isPirate, _startLocation, _referralCode);
    }

    /**
     * @dev Internal function to create account with optional referral
     */
    function _createAccountInternal(
        address player,
        string calldata _boatName,
        bool _isPirate,
        uint256 _startLocation,
        string memory _referralCode
    ) internal {
        require(bytes(_boatName).length > 0 && bytes(_boatName).length <= 12, "Boat name invalid length");
        require(_startLocation <= 100, "Location must be 0-100");
        require(accounts[player].hp == 0 && accounts[player].crew == 0, "Already has account");

        // Process referral if code provided
        address referrer = address(0);
        if (bytes(_referralCode).length > 0) {
            referrer = referralCodes[_referralCode];
            require(referrer != address(0), "Invalid referral code");
            require(referrer != player, "Cannot refer yourself");
            require(accounts[referrer].hp > 0, "Referrer must have account");

            // Track referral
            referralData[player].referrer = referrer;
            referralData[referrer].totalReferrals += 1;
        }

        // Create account with base stats
        uint256 startingGold = 100;
        uint256 startingDiamonds = 0;

        // Add referee bonuses if referred
        if (referrer != address(0)) {
            startingGold += REFEREE_GOLD_REWARD;      // +200 gold
            startingDiamonds += REFEREE_DIAMOND_REWARD; // +1 diamond
        }

        accounts[player] = Account({
            boatName: _boatName,
            isPirate: _isPirate,
            gold: startingGold,
            diamonds: startingDiamonds,
            hp: 100,
            maxHp: 100,
            speed: 1,
            attack: 1,
            defense: 1,
            crew: 1,
            maxCrew: 10,
            location: _startLocation,
            gpm: 0,
            lastCheckIn: 0,
            checkInStreak: 0,
            lastWrecked: 0,
            travelEnd: 0,
            lastGPMClaim: block.timestamp,
            repairEnd: 0
        });

        players.push(player);

        // Auto-generate and register referral code for new player
        string memory newPlayerCode = _generateReferralCode(player);
        referralCodes[newPlayerCode] = player;
        playerReferralCode[player] = newPlayerCode;
        emit ReferralCodeGenerated(player, newPlayerCode);

        emit AccountCreated(player, _boatName, _isPirate);

        // Distribute referral rewards
        if (referrer != address(0)) {
            // Reward referee (new player) with ARMADA
            if (address(armadaToken) != address(0)) {
                try armadaToken.mintFromGameplay(player, REFEREE_ARMADA_REWARD, "referral_signup") {
                    emit ArmadaTokenMinted(player, REFEREE_ARMADA_REWARD, "referral_signup");
                } catch {}
            }

            // Reward referrer with ARMADA and Diamond
            accounts[referrer].diamonds += REFERRER_DIAMOND_REWARD;
            referralData[referrer].referralRewards += REFERRER_ARMADA_REWARD;

            if (address(armadaToken) != address(0)) {
                try armadaToken.mintFromGameplay(referrer, REFERRER_ARMADA_REWARD, "referral_bonus") {
                    emit ArmadaTokenMinted(referrer, REFERRER_ARMADA_REWARD, "referral_bonus");
                } catch {}
            }

            emit ReferralUsed(referrer, player, _referralCode);
        }

        // Give starting XP in battle pass
        if (address(battlePassContract) != address(0)) {
            try battlePassContract.gainExperience(player, 5, "account_created") {} catch {}
            emit BattlePassXPGained(player, 5, "account_created");
        }
    }

    function addUpgrade(
        string calldata name,
        uint256 cost,
        uint256 gpmBonus,
        uint256 maxHpBonus,
        uint256 speedBonus,
        uint256 attackBonus,
        uint256 defenseBonus,
        uint256 maxCrewBonus
    ) external onlyOwner {
        upgrades[nextUpgradeId] = Upgrade(name, cost, gpmBonus, maxHpBonus, speedBonus, attackBonus, defenseBonus, maxCrewBonus);
        emit UpgradeAdded(nextUpgradeId, name);
        nextUpgradeId++;
    }

    function buyUpgrade(uint256 id) external nonReentrant {
        Upgrade storage u = upgrades[id];
        Account storage a = accounts[msg.sender];
        require(u.cost > 0, "Upgrade not exist");
        
        _autoClaimGPM(msg.sender);
        
        uint256 purchaseCount = purchaseCounts[msg.sender][id];
        uint256 actualCost = _calculateUpgradeCost(u.cost, purchaseCount);
        
        require(a.gold >= actualCost, "Not enough gold");
        a.gold -= actualCost;

        purchaseCounts[msg.sender][id]++;

        a.gpm += u.gpmBonus;
        a.maxHp += u.maxHpBonus;
        a.hp += u.maxHpBonus;
        a.speed += u.speedBonus;
        a.attack += u.attackBonus;
        a.defense += u.defenseBonus;
        a.maxCrew += u.maxCrewBonus;
        if (a.crew > a.maxCrew) {
            a.crew = a.maxCrew;
        }
        
        emit UpgradePurchased(msg.sender, id);
        
        // NEW: Award XP for upgrades
        if (address(battlePassContract) != address(0)) {
            try battlePassContract.gainExperience(msg.sender, 3, "upgrade_purchased") {} catch {}
            emit BattlePassXPGained(msg.sender, 3, "upgrade_purchased");
        }
    }

    function hireCrew() external nonReentrant {
        Account storage a = accounts[msg.sender];
        require(a.hp > 0, "Ship wrecked");
        require(isPort(a.location), "Must be at a port");
        require(a.crew < a.maxCrew, "Crew already at maximum");
        
        _autoClaimGPM(msg.sender);
        
        uint256 crewNeeded = a.maxCrew - a.crew;
        uint256 costPerCrew = 10;
        uint256 totalCost = crewNeeded * costPerCrew;
        
        require(a.gold >= totalCost, "Not enough gold");
        
        a.gold -= totalCost;
        a.crew = a.maxCrew;
        
        emit CrewHired(msg.sender, crewNeeded, totalCost);
    }

    function checkIn() external {
        Account storage a = accounts[msg.sender];
        require(a.hp > 0, "Ship wrecked");
        
        uint256 today = block.timestamp / 1 days;
        require(a.lastCheckIn / 1 days < today, "Already checked in today");

        if (a.lastCheckIn / 1 days == today - 1) {
            a.checkInStreak += 1;
        } else {
            a.checkInStreak = 1;
        }
        
        a.lastCheckIn = block.timestamp;
        uint256 reward = a.crew * 25 + 5 * a.checkInStreak;
        a.gold += reward;
        
        emit CheckIn(msg.sender, a.checkInStreak, reward);
        
        // NEW: Award ARMADA tokens and XP
        if (address(armadaToken) != address(0)) {
            try armadaToken.mintFromGameplay(msg.sender, ARMADA_PER_CHECKIN, "daily_checkin") {
                emit ArmadaTokenMinted(msg.sender, ARMADA_PER_CHECKIN, "daily_checkin");
            } catch {}
        }
        
        if (address(battlePassContract) != address(0)) {
            try battlePassContract.gainExperience(msg.sender, 5, "daily_checkin") {} catch {}
            emit BattlePassXPGained(msg.sender, 5, "daily_checkin");
        }
    }

    /**
     * @dev UPDATED: 10-second cycles for Mantle (was 60 seconds)
     */
    function claimGPM() external nonReentrant {
        Account storage a = accounts[msg.sender];
        require(a.hp > 0, "Ship wrecked");
        require(a.gpm > 0, "No GPM to claim");
        
        uint256 timeElapsed = block.timestamp - a.lastGPMClaim;
        require(timeElapsed > 0, "No time elapsed");
        
        // UPDATED: Calculate based on 10-second cycles (Mantle optimization)
        uint256 cyclesElapsed = timeElapsed / GPM_CYCLE_SECONDS;
        uint256 claimableGold = a.gpm * cyclesElapsed;
        
        require(claimableGold > 0, "No gold to claim");
        
        a.lastGPMClaim = block.timestamp;
        a.gold += claimableGold;
        
        emit GPMClaimed(msg.sender, claimableGold, timeElapsed);
        
        // NEW: Award XP for claiming
        if (address(battlePassContract) != address(0)) {
            try battlePassContract.gainExperience(msg.sender, 1, "gpm_claimed") {} catch {}
            emit BattlePassXPGained(msg.sender, 1, "gpm_claimed");
        }
    }

    function getClaimableGold(address player) external view returns (uint256) {
        Account storage a = accounts[player];
        
        if (a.hp == 0 || a.gpm == 0) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - a.lastGPMClaim;
        uint256 cyclesElapsed = timeElapsed / GPM_CYCLE_SECONDS;
        
        return a.gpm * cyclesElapsed;
    }

    function getTimeUntilNextGPM(address player) external view returns (uint256) {
        Account storage a = accounts[player];
        
        if (a.hp == 0 || a.gpm == 0) {
            return 0;
        }
        
        uint256 timeElapsed = block.timestamp - a.lastGPMClaim;
        uint256 secondsUntilNextCycle = GPM_CYCLE_SECONDS - (timeElapsed % GPM_CYCLE_SECONDS);
        
        return secondsUntilNextCycle;
    }

    function getHireCrewCost(address player) external view returns (uint256) {
        Account storage a = accounts[player];
        
        if (a.hp == 0 || a.crew >= a.maxCrew) {
            return 0;
        }
        
        uint256 crewNeeded = a.maxCrew - a.crew;
        return crewNeeded * 10;
    }

    /**
     * @dev UPDATED: Attack now rewards ARMADA tokens, XP, and guild treasury
     */
    function attack(address defender) external nonReentrant {
        Account storage atk = accounts[msg.sender];
        Account storage def = accounts[defender];

        require(atk.hp > 0 && def.hp > 0, "One ship is wrecked");
        require(atk.isPirate || def.isPirate, "Navy cannot attack Navy");
        require(atk.location == def.location, "Must be same location");
        require(block.timestamp >= atk.travelEnd && block.timestamp >= def.travelEnd, "In travel");
        require(!isPort(atk.location), "Cannot attack at ports - safe area");

        uint256 damageToDef = atk.attack > def.defense ? atk.attack - def.defense : 0;
        uint256 damageToAtk = def.attack > atk.defense ? def.attack - atk.defense : 0;

        if (damageToDef >= def.hp) {
            def.hp = 0;
        } else {
            def.hp -= damageToDef;
        }
        
        if (damageToAtk >= atk.hp) {
            atk.hp = 0;
        } else {
            atk.hp -= damageToAtk;
        }

        bool destroyed = false;
        if (def.hp == 0) {
            def.crew = 1;
            def.lastWrecked = block.timestamp;
            def.location = _getNearestPort(def.location);
            
            uint256 steal = atk.crew * 50;
            if (steal > def.gold) steal = def.gold;
            def.gold -= steal;
            atk.gold += steal;
            destroyed = true;
            
            // NEW: Reward attacker with ARMADA tokens
            if (address(armadaToken) != address(0)) {
                try armadaToken.mintFromGameplay(msg.sender, ARMADA_PER_BATTLE_WIN, "battle_win") {
                    emit ArmadaTokenMinted(msg.sender, ARMADA_PER_BATTLE_WIN, "battle_win");
                } catch {}
            }
            
            // NEW: Award XP to winner
            if (address(battlePassContract) != address(0)) {
                try battlePassContract.gainExperience(msg.sender, 10, "battle_win") {} catch {}
                emit BattlePassXPGained(msg.sender, 10, "battle_win");
            }
            
            // NEW: Add to guild treasury
            if (address(guildContract) != address(0)) {
                try guildContract.addTreasuryReward(msg.sender, steal) {
                    emit GuildTreasuryUpdated(msg.sender, steal);
                } catch {}
            }
        }
        
        if (atk.hp == 0) {
            atk.crew = 1;
            atk.lastWrecked = block.timestamp;
            atk.location = _getNearestPort(atk.location);
        }

        emit ShipAttacked(msg.sender, defender, destroyed);
    }

    /**
     * @dev NEW: Batch attack function (Mantle optimization)
     * Attack multiple ships in one transaction
     */
    function batchAttack(address[] calldata defenders) external nonReentrant {
        require(defenders.length > 0 && defenders.length <= 5, "1-5 defenders only");
        
        for (uint i = 0; i < defenders.length; i++) {
            // Check if attacker's ship is still alive
            if (accounts[msg.sender].hp == 0) break;
            
            // Skip if defender is already wrecked
            if (accounts[defenders[i]].hp == 0) continue;
            
            // Perform attack (internal call to avoid reentrancy issues)
            _performAttack(msg.sender, defenders[i]);
        }
    }

    /**
     * @dev Internal attack function for batch operations
     */
    function _performAttack(address attacker, address defender) internal {
        Account storage atk = accounts[attacker];
        Account storage def = accounts[defender];

        if (atk.hp == 0 || def.hp == 0) return;
        if (!atk.isPirate && !def.isPirate) return; // Navy cannot attack Navy
        if (atk.location != def.location) return;
        if (block.timestamp < atk.travelEnd || block.timestamp < def.travelEnd) return;
        if (isPort(atk.location)) return;

        uint256 damageToDef = atk.attack > def.defense ? atk.attack - def.defense : 0;
        uint256 damageToAtk = def.attack > atk.defense ? def.attack - atk.defense : 0;

        if (damageToDef >= def.hp) {
            def.hp = 0;
        } else {
            def.hp -= damageToDef;
        }
        
        if (damageToAtk >= atk.hp) {
            atk.hp = 0;
        } else {
            atk.hp -= damageToAtk;
        }

        bool destroyed = false;
        if (def.hp == 0) {
            def.crew = 1;
            def.lastWrecked = block.timestamp;
            def.location = _getNearestPort(def.location);
            
            uint256 steal = atk.crew * 50;
            if (steal > def.gold) steal = def.gold;
            def.gold -= steal;
            atk.gold += steal;
            destroyed = true;
            
            // Rewards for batch attack
            if (address(armadaToken) != address(0)) {
                try armadaToken.mintFromGameplay(attacker, ARMADA_PER_BATTLE_WIN, "battle_win") {} catch {}
            }
            
            if (address(battlePassContract) != address(0)) {
                try battlePassContract.gainExperience(attacker, 10, "battle_win") {} catch {}
            }
            
            if (address(guildContract) != address(0)) {
                try guildContract.addTreasuryReward(attacker, steal) {} catch {}
            }
        }
        
        if (atk.hp == 0) {
            atk.crew = 1;
            atk.lastWrecked = block.timestamp;
            atk.location = _getNearestPort(atk.location);
        }

        emit ShipAttacked(attacker, defender, destroyed);
    }

    function travel(uint256 toLocation, bool fast) external payable nonReentrant {
        Account storage a = accounts[msg.sender];
        require(a.hp > 0, "Ship wrecked");
        require(block.timestamp >= a.travelEnd, "Already traveling");
        require(toLocation <= 100, "Location invalid");
        require(toLocation != a.location, "Same location");

        uint256 distance = toLocation > a.location ? toLocation - a.location : a.location - toLocation;
        uint256 time = distance * 1 hours;
        uint256 discount = a.speed * 5 minutes * distance;
        if (discount >= time) {
            time = 0;
        } else {
            time -= discount;
        }

        uint256 expectedDiamonds = 0;
        if (fast) {
            expectedDiamonds = time / 1 hours;
            if (expectedDiamonds == 0) {
                expectedDiamonds = 1;
            }
            require(msg.value == 0, "Pay via diamond");
            require(a.diamonds >= expectedDiamonds, "Not enough diamonds");
            a.diamonds -= expectedDiamonds;
            time = 0;
        } else {
            require(msg.value == 0, "Don't send MNT");
        }

        a.travelEnd = block.timestamp + time;
        a.location = toLocation;
        emit TravelStarted(msg.sender, toLocation, a.travelEnd, fast);
    }

    function getShipsAt(uint256 loc) external view returns (address[] memory, string[] memory, uint256[] memory) {
        uint256 count;
        for (uint i = 0; i < players.length; i++) {
            if (accounts[players[i]].location == loc && block.timestamp >= accounts[players[i]].travelEnd) {
                count++;
            }
        }
        
        address[] memory addrs = new address[](count);
        string[] memory names = new string[](count);
        uint256[] memory levels = new uint256[](count);
        uint idx;
        
        for (uint i = 0; i < players.length; i++) {
            if (accounts[players[i]].location == loc && block.timestamp >= accounts[players[i]].travelEnd) {
                addrs[idx] = players[i];
                names[idx] = accounts[players[i]].boatName;
                levels[idx] = accounts[players[i]].speed + accounts[players[i]].attack + accounts[players[i]].defense;
                idx++;
            }
        }
        
        return (addrs, names, levels);
    }

    function getRepairOptions(address player) external view returns (uint256[3] memory costs, uint256[3] memory waitTimes) {
        Account storage a = accounts[player];
        
        if (a.hp > 0) {
            return ([uint256(0), uint256(0), uint256(0)], [uint256(0), uint256(0), uint256(0)]);
        }
        
        uint256 baseTimeUnits = (a.maxHp + 24) / 25;
        
        waitTimes[0] = baseTimeUnits * 30 minutes;
        waitTimes[1] = baseTimeUnits * 5 minutes;
        waitTimes[2] = 0;
        
        costs[0] = 0;
        costs[1] = a.maxHp * 20;
        costs[2] = 1;
        
        return (costs, waitTimes);
    }

    function repairShip(RepairType repairType) external nonReentrant {
        Account storage a = accounts[msg.sender];
        require(a.hp == 0, "Ship not wrecked");
        require(block.timestamp >= a.repairEnd, "Repair in progress");
        require(isPort(a.location), "Must be at port");

        uint256 cost = 0;
        uint256 waitTime = 0;
        
        (uint256[3] memory costs, uint256[3] memory waitTimes) = this.getRepairOptions(msg.sender);
        
        if (repairType == RepairType.FREE) {
            waitTime = waitTimes[0];
            a.repairEnd = block.timestamp + waitTime;
        } else if (repairType == RepairType.GOLD) {
            cost = costs[1];
            waitTime = waitTimes[1];
            
            _autoClaimGPM(msg.sender);
            require(a.gold >= cost, "Not enough gold");
            a.gold -= cost;
            a.repairEnd = block.timestamp + waitTime;
        } else if (repairType == RepairType.DIAMOND) {
            cost = costs[2];
            require(a.diamonds >= cost, "Not enough diamonds");
            a.diamonds -= cost;
            a.repairEnd = block.timestamp;
        }

        emit ShipRepaired(msg.sender, uint256(repairType), cost, waitTime);
    }

    function completeRepair() external nonReentrant {
        Account storage a = accounts[msg.sender];
        require(a.hp == 0, "Ship not wrecked");
        require(block.timestamp >= a.repairEnd, "Repair not ready");
        require(a.repairEnd > 0, "No repair in progress");

        a.hp = a.maxHp;
        a.lastWrecked = 0;
        
        uint256 timeTaken = a.repairEnd - a.lastWrecked;
        
        if (timeTaken == 0) {
            a.crew = a.maxCrew;
        } else {
            uint256 baseTimeUnits = (a.maxHp + 24) / 25;
            uint256 freeRepairTime = baseTimeUnits * 30 minutes;
            
            if (timeTaken >= freeRepairTime - 1 minutes) {
                a.crew = (a.maxCrew + 1) / 2;
                if (a.crew < 1) a.crew = 1;
            } else {
                a.crew = a.maxCrew;
            }
        }
        
        a.repairEnd = 0;
    }

    function isRepairReady(address player) external view returns (bool) {
        Account storage a = accounts[player];
        return a.hp == 0 && a.repairEnd > 0 && block.timestamp >= a.repairEnd;
    }

    /**
     * @dev UPDATED: Receive MNT (not AVAX) for diamond purchases
     */
    receive() external payable nonReentrant {
        uint256 count;
        if (msg.value == 10 ether) count = 1;
        else if (msg.value == 45 ether) count = 5;
        else if (msg.value == 90 ether) count = 10;
        else revert("Invalid diamond package");

        accounts[msg.sender].diamonds += count;

        address top1 = _getTop(0);
        address top2 = _getTop(1);
        address top3 = _getTop(2);

        payable(top1).transfer(4 ether);
        payable(top2).transfer(2 ether);
        payable(top3).transfer(1 ether);
    }

    function getRanking(uint256 n) public view returns (address[] memory, uint256[] memory) {
        uint256 len = players.length < n ? players.length : n;
        address[] memory leaders = new address[](len);
        uint256[] memory scores = new uint256[](len);
        
        for (uint i; i < players.length; ++i) {
            uint256 lvl = accounts[players[i]].speed + accounts[players[i]].attack + accounts[players[i]].defense;
            for (uint j; j < len; ++j) {
                if (lvl > scores[j]) {
                    for (uint k = len - 1; k > j; --k) {
                        leaders[k] = leaders[k-1];
                        scores[k] = scores[k-1];
                    }
                    leaders[j] = players[i];
                    scores[j] = lvl;
                    break;
                }
            }
        }
        
        return (leaders, scores);
    }

    /**
     * @dev UPDATED: Rescue MNT (not AVAX)
     */
    function rescueMNT() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev Admin function to add gold to an account (for testing)
     */
    function adminAddGold(address player, uint256 amount) external onlyOwner {
        require(accounts[player].hp > 0 || accounts[player].maxHp > 0, "Account does not exist");
        accounts[player].gold += amount;
    }

    /**
     * @dev Admin function to add diamonds to an account (for testing)
     */
    function adminAddDiamonds(address player, uint256 amount) external onlyOwner {
        require(accounts[player].hp > 0 || accounts[player].maxHp > 0, "Account does not exist");
        accounts[player].diamonds += amount;
    }

    function getUpgradeCost(uint256 id, address player) public view returns (uint256) {
        Upgrade storage u = upgrades[id];
        require(u.cost > 0, "Upgrade not exist");
        uint256 purchaseCount = purchaseCounts[player][id];
        return _calculateUpgradeCost(u.cost, purchaseCount);
    }

    function _autoClaimGPM(address player) internal {
        Account storage a = accounts[player];
        
        if (a.hp == 0 || a.gpm == 0) {
            return;
        }
        
        uint256 timeElapsed = block.timestamp - a.lastGPMClaim;
        if (timeElapsed == 0) {
            return;
        }
        
        uint256 cyclesElapsed = timeElapsed / GPM_CYCLE_SECONDS;
        uint256 claimableGold = a.gpm * cyclesElapsed;
        
        if (claimableGold > 0) {
            a.lastGPMClaim = block.timestamp;
            a.gold += claimableGold;
            emit GPMClaimed(player, claimableGold, timeElapsed);
        }
    }

    function _calculateUpgradeCost(uint256 baseCost, uint256 purchaseCount) internal pure returns (uint256) {
        if (purchaseCount == 0) {
            return baseCost;
        }
        
        uint256 numerator = baseCost;
        uint256 denominator = 1;
        
        for (uint256 i = 0; i < purchaseCount; i++) {
            numerator *= 15;
            denominator *= 10;
        }
        
        return numerator / denominator;
    }

    function _getTop(uint idx) internal view returns (address) {
        (address[] memory l, ) = getRanking(idx+1);
        if (l.length > idx) return l[idx];
        return owner();
    }
    
    /**
     * @dev NEW: Get player's battle power (for Ship NFT minting)
     */
    function getPlayerBattlePower(address player) external view returns (uint256) {
        Account storage a = accounts[player];
        return a.attack + a.defense + a.speed;
    }

    /**
     * @dev NEW: Get player's referral code
     */
    function getPlayerReferralCode(address player) external view returns (string memory) {
        return playerReferralCode[player];
    }

    /**
     * @dev NEW: Get referral statistics for a player
     */
    function getReferralStats(address player) external view returns (
        string memory referralCode,
        address referrer,
        uint256 totalReferrals,
        uint256 referralRewards
    ) {
        return (
            playerReferralCode[player],
            referralData[player].referrer,
            referralData[player].totalReferrals,
            referralData[player].referralRewards
        );
    }

    /**
     * @dev NEW: Validate if a referral code exists
     */
    function isValidReferralCode(string calldata code) external view returns (bool) {
        return referralCodes[code] != address(0);
    }

    // ============================================================
    // AGENT ARENA — added for Moltiverse Hackathon (Monad)
    // ============================================================

    address public arenaContract;

    event ArenaContractSet(address indexed arena);
    event DuelExecuted(address indexed agent1, address indexed agent2, address indexed winner, uint256 rounds);

    modifier onlyArena() {
        require(msg.sender == arenaContract, "Only arena contract");
        _;
    }

    /**
     * @dev Set the WagerArena contract address. Only owner, set once after deploy.
     */
    function setArenaContract(address _arena) external onlyOwner {
        require(_arena != address(0), "Invalid arena address");
        arenaContract = _arena;
        emit ArenaContractSet(_arena);
    }

    /**
     * @dev Read-only snapshot of a player's battle stats.
     * Used by AgentController decision engine and WagerArena.
     */
    function getShipStats(address player) external view returns (
        uint256 atkStat,
        uint256 defStat,
        uint256 hp,
        uint256 maxHp,
        uint256 gold,
        uint256 crew,
        uint256 location,
        bool isPirate
    ) {
        Account storage a = accounts[player];
        return (a.attack, a.defense, a.hp, a.maxHp, a.gold, a.crew, a.location, a.isPirate);
    }

    /**
     * @dev Execute an arena duel between two agents.
     * Called exclusively by WagerArena contract.
     *
     * Rules:
     *  - Both ships restored to maxHp for fair fight (does NOT affect open-ocean HP)
     *  - Simultaneous damage each round (min 1 damage each side)
     *  - Loop until one HP hits 0, max 200 rounds safety cap
     *  - Winner receives XP + ARMADA reward
     *  - Both ships restored to their pre-duel HP snapshot afterward
     */
    function executeDuel(address agent1, address agent2) external onlyArena returns (address winner, uint256 rounds) {
        Account storage a1 = accounts[agent1];
        Account storage a2 = accounts[agent2];

        require(a1.maxHp > 0, "Agent1 has no account");
        require(a2.maxHp > 0, "Agent2 has no account");

        // Snapshot current HP so we can restore after duel
        uint256 snapshot1 = a1.hp;
        uint256 snapshot2 = a2.hp;

        // Restore to maxHp for a fair arena fight
        uint256 hp1 = a1.maxHp;
        uint256 hp2 = a2.maxHp;

        // Damage per round — minimum 1 each side
        uint256 dmg1to2 = a1.attack > a2.defense ? a1.attack - a2.defense : 1;
        uint256 dmg2to1 = a2.attack > a1.defense ? a2.attack - a1.defense : 1;

        // Run combat rounds
        rounds = 0;
        while (hp1 > 0 && hp2 > 0 && rounds < 200) {
            // Simultaneous damage
            if (dmg1to2 >= hp2) {
                hp2 = 0;
            } else {
                hp2 -= dmg1to2;
            }

            if (dmg2to1 >= hp1) {
                hp1 = 0;
            } else {
                hp1 -= dmg2to1;
            }

            rounds++;
        }

        // Determine winner
        if (hp1 > 0 && hp2 == 0) {
            winner = agent1;
        } else if (hp2 > 0 && hp1 == 0) {
            winner = agent2;
        } else {
            // Both still alive (200-round cap) — higher remaining HP wins
            winner = hp1 >= hp2 ? agent1 : agent2;
        }

        // Reward winner
        if (address(armadaToken) != address(0)) {
            try armadaToken.mintFromGameplay(winner, ARMADA_PER_BATTLE_WIN, "arena_win") {} catch {}
        }
        if (address(battlePassContract) != address(0)) {
            try battlePassContract.gainExperience(winner, 10, "arena_win") {} catch {}
        }

        // Restore both ships to pre-duel HP (arena fights don't affect open-ocean state)
        a1.hp = snapshot1;
        a2.hp = snapshot2;

        emit DuelExecuted(agent1, agent2, winner, rounds);
        return (winner, rounds);
    }
}

