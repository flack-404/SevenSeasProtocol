// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArmadaToken
 * @dev ERC-20 token for the Mantle Armada game ecosystem
 * 
 * Key Features:
 * - Minted through gameplay (battle wins, daily check-ins, battle pass)
 * - Used for premium features (battle pass, cosmetics, staking)
 * - Governance token for game updates
 * - No direct purchase - earn through playing
 * 
 * Tokenomics:
 * - Initial supply: 1,000,000 ARMADA
 * - Minted dynamically from gameplay
 * - Burnable for premium features
 * - Stakeable for multipliers (future)
 */
contract ArmadaToken is ERC20, Ownable, ReentrancyGuard {
    
    // Authorized minters (game contracts)
    mapping(address => bool) public isMinter;
    
    // Total minted from gameplay (excluding initial supply)
    uint256 public totalMintedFromGameplay;
    
    // Minting limits per action (anti-inflation)
    uint256 public constant MAX_MINT_PER_BATTLE = 5 * 10**18; // 5 ARMADA max per battle
    uint256 public constant MAX_MINT_PER_CHECKIN = 10 * 10**18; // 10 ARMADA max per check-in
    uint256 public constant MAX_MINT_PER_PASS_REWARD = 100 * 10**18; // 100 ARMADA max per pass reward
    
    // Events
    event MinterAdded(address indexed minter, string contractName);
    event MinterRemoved(address indexed minter);
    event TokensMintedFromGameplay(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    
    /**
     * @dev Constructor - mint initial supply to contract owner
     * Initial supply is for liquidity pools and initial distribution
     */
    constructor() ERC20("Armada Token", "ARMADA") Ownable(msg.sender) {
        // Mint initial supply to owner for liquidity and distribution
        uint256 initialSupply = 1_000_000 * 10**18; // 1 million tokens
        _mint(msg.sender, initialSupply);
    }
    
    /**
     * @dev Add a new minter (only owner)
     * @param _minter Address of the contract that can mint tokens
     * @param _contractName Name of the contract for tracking
     */
    function addMinter(address _minter, string calldata _contractName) external onlyOwner {
        require(_minter != address(0), "Cannot add zero address as minter");
        require(!isMinter[_minter], "Address is already a minter");
        
        isMinter[_minter] = true;
        emit MinterAdded(_minter, _contractName);
    }
    
    /**
     * @dev Remove a minter (only owner)
     * @param _minter Address to remove from minters
     */
    function removeMinter(address _minter) external onlyOwner {
        require(isMinter[_minter], "Address is not a minter");
        
        isMinter[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev Mint tokens from gameplay (only authorized minters)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting (for tracking)
     */
    function mintFromGameplay(
        address to, 
        uint256 amount, 
        string calldata reason
    ) external nonReentrant {
        require(isMinter[msg.sender], "Only authorized minters can mint");
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Validate minting limits based on reason
        _validateMintAmount(amount, reason);
        
        _mint(to, amount);
        totalMintedFromGameplay += amount;
        
        emit TokensMintedFromGameplay(to, amount, reason);
    }
    
    /**
     * @dev Burn tokens (for premium features, staking, etc.)
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burn(uint256 amount, string calldata reason) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }
    
    /**
     * @dev Burn tokens from another address (for contract usage)
     * Requires approval
     * @param from Address to burn from
     * @param amount Amount to burn
     * @param reason Reason for burning
     */
    function burnFrom(
        address from, 
        uint256 amount, 
        string calldata reason
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        // This will check allowance and revert if insufficient
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        
        emit TokensBurned(from, amount, reason);
    }
    
    /**
     * @dev Internal function to validate mint amounts
     * @param amount Amount being minted
     * @param reason Reason for minting
     */
    function _validateMintAmount(uint256 amount, string calldata reason) internal pure {
        bytes32 reasonHash = keccak256(bytes(reason));
        
        // Check against max limits based on reason
        if (reasonHash == keccak256(bytes("battle_win"))) {
            require(amount <= MAX_MINT_PER_BATTLE, "Exceeds max mint per battle");
        } else if (reasonHash == keccak256(bytes("daily_checkin"))) {
            require(amount <= MAX_MINT_PER_CHECKIN, "Exceeds max mint per check-in");
        } else if (reasonHash == keccak256(bytes("battle_pass_reward"))) {
            require(amount <= MAX_MINT_PER_PASS_REWARD, "Exceeds max mint per pass reward");
        }
        // Other reasons don't have specific limits
    }
    
    /**
     * @dev Get token information
     * @return tokenName Token name
     * @return tokenSymbol Token symbol
     * @return tokenDecimals Token decimals
     * @return supply Total supply
     * @return gameplayMinted Amount minted from gameplay
     */
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 supply,
        uint256 gameplayMinted
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            totalMintedFromGameplay
        );
    }
    
    /**
     * @dev Check if an address is an authorized minter
     * @param account Address to check
     * @return bool True if authorized minter
     */
    function checkMinter(address account) external view returns (bool) {
        return isMinter[account];
    }
}

