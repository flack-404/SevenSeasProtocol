// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SEASToken
 * @dev $SEAS utility token for Seven Seas Protocol agent economy.
 *
 * TESTNET: This contract is used on Monad Testnet.
 * MAINNET: Replace this address with the real nad.fun bonding curve token address.
 *
 * Utility:
 *  - Agent wagers (10–1000 SEAS per match)
 *  - Tournament entry fees (100–500 SEAS)
 *  - Prediction market bets
 *  - Battle Pass premium upgrade (100 SEAS)
 *  - NFT minting (500 SEAS)
 */
contract SEASToken is ERC20, Ownable {

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    // Testnet faucet — 10,000 SEAS per claim, 1 claim per address
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10**18;
    mapping(address => bool) public hasClaimed;

    // Authorized minters (game contracts)
    mapping(address => bool) public minters;

    event FaucetClaimed(address indexed claimer, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }

    constructor() ERC20("Seven Seas Token", "SEAS") Ownable(msg.sender) {
        // Mint initial supply to deployer for distribution
        // 10% creator hold (100M) — signals conviction per nad.fun best practice
        uint256 creatorHold = 100_000_000 * 10**18;
        _mint(msg.sender, creatorHold);
    }

    /**
     * @dev Testnet faucet — any address can claim 10,000 SEAS once.
     * Remove or restrict this on mainnet.
     */
    function claimTestTokens() external {
        require(!hasClaimed[msg.sender], "Already claimed faucet");
        require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "Max supply reached");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Owner can add authorized minters (WagerArena, TournamentArena, etc.)
     */
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @dev Mint tokens — only authorized minters (for agent rewards)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    /**
     * @dev Owner batch distribution — fund agent wallets, treasury, etc.
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            transfer(recipients[i], amounts[i]);
        }
    }
}
