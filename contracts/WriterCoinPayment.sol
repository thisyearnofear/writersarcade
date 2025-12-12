// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IGameNFT {
    struct GameMetadata {
        string articleUrl;
        address creator;
        address writerCoin;
        string genre;
        string difficulty;
        uint256 createdAt;
        string gameTitle;
    }
    
    function mintGame(
        address to,
        string memory tokenURI,
        GameMetadata memory metadata
    ) external returns (uint256);
}

/**
 * @title WriterCoinPayment
 * @dev Handles payments and revenue distribution for game generation and NFT minting
 * 
 * Users pay in writer coins (e.g., $AVC) to:
 * 1. Generate games from articles (100 tokens)
 * 2. Mint generated games as NFTs (50 tokens)
 * 
 * Revenue is split:
 * - Game generation: 60% writer, 20% platform, 20% creator pool
 * - NFT minting: 30% creator, 15% writer, 5% platform
 */
contract WriterCoinPayment is Ownable, ReentrancyGuard {
    
    // Payment configuration
    struct PaymentConfig {
        uint256 gameGenerationCost;  // Cost to generate a game (e.g., 100 tokens)
        uint256 mintCost;            // Cost to mint as NFT (e.g., 50 tokens)
        bool enabled;                // Whether payments are enabled for this coin
    }
    
    // Revenue distribution (in basis points, 100 = 1%)
    struct RevenueDistribution {
        uint256 writerShare;         // Share for the writer (e.g., 6000 = 60%)
        uint256 platformShare;       // Share for the platform (e.g., 2000 = 20%)
        uint256 creatorPoolShare;    // Share for creator pool (e.g., 2000 = 20%)
    }

    // Explicit splits for Minting (NFT) - often different from Game Gen
    struct MintDistribution {
        uint256 creatorShare;        // Share for the game creator (e.g., 3000 = 30%)
        uint256 writerShare;         // Share for the writer (e.g., 1500 = 15%)
        uint256 platformShare;       // Share for the platform (e.g., 500 = 5%)
        // Remaining balance stays with user/payer (effectively a discount) or creates the liquidity
    }

    // Explicit splits for Gameplay (Pay-to-Play)
    struct GameplayDistribution {
        uint256 creatorShare;        // Share for the game creator (Game Owner)
        uint256 writerShare;         // Share for the writer (Original IP)
        uint256 platformShare;       // Share for the platform
    }
    
    // Writer coin whitelist
    mapping(address => PaymentConfig) public whitelistedCoins;
    
    // Revenue distribution for each coin (Game Generation)
    mapping(address => RevenueDistribution) public revenueDistributions;

    // Revenue distribution for each coin (Minting)
    mapping(address => MintDistribution) public mintDistributions;

    // Revenue distribution for each coin (Gameplay)
    mapping(address => GameplayDistribution) public gameplayDistributions;
    
    // Mapping of coin address to writer's treasury address
    mapping(address => address) public writerTreasuries;
    
    // Platform treasury address
    address public platformTreasury;
    
    // Creator pool address
    address public creatorPool;
    
    // GameNFT contract
    IGameNFT public gameNFT;
    
    // Events
    event GameGenerated(
        address indexed user,
        address indexed writerCoin,
        uint256 amount,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorShare
    );
    
    event GameMinted(
        address indexed user,
        address indexed writerCoin,
        uint256 amount,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare
    );

    event GameplayPaid(
        address indexed user,
        address indexed gameCreator,
        address indexed writerCoin,
        uint256 amount,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare
    );
    
    event CoinWhitelisted(
        address indexed coinAddress,
        uint256 generationCost,
        uint256 mintCost
    );
    
    event CoinRemoved(address indexed coinAddress);
    
    event TreasuryUpdated(address indexed writerCoin, address indexed newTreasury);
    
    event PlatformTreasuryUpdated(address indexed newTreasury);
    
    event CreatorPoolUpdated(address indexed newPool);
    
    event CoinConfigUpdated(
        address indexed coinAddress,
        uint256 newGenerationCost,
        uint256 newMintCost
    );
    
    event GameNFTUpdated(address indexed newGameNFT);
    
    constructor(
        address initialOwner,
        address _platformTreasury,
        address _creatorPool
    ) Ownable(initialOwner) {
        require(_platformTreasury != address(0), "Platform treasury cannot be zero");
        require(_creatorPool != address(0), "Creator pool cannot be zero");
        
        platformTreasury = _platformTreasury;
        creatorPool = _creatorPool;
    }
    
    /**
     * @dev Whitelist a writer coin for use in the platform
     * @param coinAddress ERC20 token contract address
     * @param gameGenerationCost Cost in tokens to generate a game
     * @param mintCost Cost in tokens to mint as NFT
     * @param treasury Address to receive writer's share
     * @param writerShare Basis points for writer (e.g., 6000 = 60%)
     * @param platformShare Basis points for platform (e.g., 2000 = 20%)
     * @param creatorPoolShare Basis points for creator pool (e.g., 2000 = 20%)
     */
    function whitelistCoin(
        address coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost,
        address treasury,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorPoolShare,
        uint256 mintWriterShare,     // New: Explicit mint splits
        uint256 mintPlatformShare,
        uint256 mintCreatorShare
    ) external onlyOwner {
        require(coinAddress != address(0), "Coin address cannot be zero");
        require(treasury != address(0), "Treasury cannot be zero");
        require(gameGenerationCost > 0, "Generation cost must be greater than 0");
        require(mintCost > 0, "Mint cost must be greater than 0");
        require(
            writerShare + platformShare + creatorPoolShare == 10000,
            "Shares must total 10000 basis points"
        );
        
        whitelistedCoins[coinAddress] = PaymentConfig({
            gameGenerationCost: gameGenerationCost,
            mintCost: mintCost,
            enabled: true
        });
        
        revenueDistributions[coinAddress] = RevenueDistribution({
            writerShare: writerShare,
            platformShare: platformShare,
            creatorPoolShare: creatorPoolShare
        });

        mintDistributions[coinAddress] = MintDistribution({
            writerShare: mintWriterShare,
            platformShare: mintPlatformShare,
            creatorShare: mintCreatorShare
        });
        
        writerTreasuries[coinAddress] = treasury;
        
        emit CoinWhitelisted(coinAddress, gameGenerationCost, mintCost);
    }
    
    /**
     * @dev Set the GameNFT contract address
     * @param _gameNFT Address of the GameNFT contract
     */
    function setGameNFT(address _gameNFT) external onlyOwner {
        require(_gameNFT != address(0), "GameNFT cannot be zero");
        gameNFT = IGameNFT(_gameNFT);
        emit GameNFTUpdated(_gameNFT);
    }
    
    /**
     * @dev Remove a writer coin from whitelist
     * @param coinAddress The coin to remove
     */
    function removeCoin(address coinAddress) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        whitelistedCoins[coinAddress].enabled = false;
        emit CoinRemoved(coinAddress);
    }
    
    /**
     * @dev Update a writer's treasury address
     * @param coinAddress The writer coin address
     * @param newTreasury The new treasury address
     */
    function updateWriterTreasury(address coinAddress, address newTreasury) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        require(newTreasury != address(0), "Treasury cannot be zero");
        writerTreasuries[coinAddress] = newTreasury;
        emit TreasuryUpdated(coinAddress, newTreasury);
    }
    
    /**
     * @dev Update platform treasury address
     * @param newTreasury The new treasury address
     */
    function updatePlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero");
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(newTreasury);
    }
    
    /**
     * @dev Update creator pool address
     * @param newPool The new pool address
     */
    function updateCreatorPool(address newPool) external onlyOwner {
        require(newPool != address(0), "Pool cannot be zero");
        creatorPool = newPool;
        emit CreatorPoolUpdated(newPool);
    }
    
    /**
     * @dev Update game generation and mint costs for a whitelisted coin
     * @param coinAddress The writer coin address
     * @param newGenerationCost New cost in tokens to generate a game
     * @param newMintCost New cost in tokens to mint as NFT
     */
    function updateCoinConfig(
        address coinAddress,
        uint256 newGenerationCost,
        uint256 newMintCost
    ) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        require(newGenerationCost > 0, "Generation cost must be greater than 0");
        require(newMintCost > 0, "Mint cost must be greater than 0");
        
        whitelistedCoins[coinAddress].gameGenerationCost = newGenerationCost;
        whitelistedCoins[coinAddress].mintCost = newMintCost;
        
        emit CoinConfigUpdated(coinAddress, newGenerationCost, newMintCost);
    }

    /**
     * @dev Update revenue splits for a coin (Dynamic Configuration)
     * This empowers writers/platform to adjust business models without redeploying.
     */
    function updateRevenueSplits(
        address coinAddress,
        uint256 genWriter,
        uint256 genPlatform,
        uint256 genPool,
        uint256 mintWriter,
        uint256 mintPlatform,
        uint256 mintCreator,
        uint256 playWriter,
        uint256 playPlatform,
        uint256 playCreator
    ) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "Coin not whitelisted");
        require(genWriter + genPlatform + genPool == 10000, "Gen shares != 100%");
        require(mintWriter + mintPlatform + mintCreator <= 10000, "Mint shares > 100%");
        require(playWriter + playPlatform + playCreator <= 10000, "Play shares > 100%");

        revenueDistributions[coinAddress] = RevenueDistribution(genWriter, genPlatform, genPool);
        mintDistributions[coinAddress] = MintDistribution(mintCreator, mintWriter, mintPlatform);
        gameplayDistributions[coinAddress] = GameplayDistribution(playCreator, playWriter, playPlatform);
    }
    
    /**
     * @dev Process payment for game generation
     * @param writerCoin The writer coin token address
     * @param user The user generating the game
     */
    function payForGameGeneration(address writerCoin, address user) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(user != address(0), "User cannot be zero");
        
        uint256 amount = whitelistedCoins[writerCoin].gameGenerationCost;
        
        // Transfer tokens from user to this contract
        IERC20 token = IERC20(writerCoin);
        require(
            token.transferFrom(user, address(this), amount),
            "Token transfer failed"
        );
        
        // Calculate shares
        RevenueDistribution memory distribution = revenueDistributions[writerCoin];
        uint256 writerShare = (amount * distribution.writerShare) / 10000;
        uint256 platformShare = (amount * distribution.platformShare) / 10000;
        uint256 creatorShare = (amount * distribution.creatorPoolShare) / 10000;
        
        // Distribute tokens
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "Writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "Platform transfer failed"
        );
        require(
            token.transfer(creatorPool, creatorShare),
            "Creator pool transfer failed"
        );
        
        emit GameGenerated(user, writerCoin, amount, writerShare, platformShare, creatorShare);
    }
    
    /**
     * @dev Process payment for NFT minting
     * @param writerCoin The writer coin token address
     * @param user The user minting the NFT
     */
    function payForMinting(address writerCoin, address user) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(user != address(0), "User cannot be zero");
        
        uint256 amount = whitelistedCoins[writerCoin].mintCost;
        
        // Transfer tokens from user to this contract
        IERC20 token = IERC20(writerCoin);
        require(
            token.transferFrom(user, address(this), amount),
            "Token transfer failed"
        );
        
        // Calculate shares for minting (different distribution)
        // Calculate shares from DYNAMIC config
        MintDistribution memory dist = mintDistributions[writerCoin];
        uint256 creatorShare = (amount * dist.creatorShare) / 10000;
        uint256 writerShare = (amount * dist.writerShare) / 10000;
        uint256 platformShare = (amount * dist.platformShare) / 10000;
        // 50% goes to creator/user directly (not distributed here)
        
        // Distribute tokens
        require(
            token.transfer(user, amount - creatorShare - writerShare - platformShare),
            "Creator transfer failed"
        );
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "Writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "Platform transfer failed"
        );
        
        emit GameMinted(user, writerCoin, amount, creatorShare, writerShare, platformShare);
    }
    
    /**
     * @dev Process payment AND mint the NFT in one transaction
     * @param writerCoin The writer coin token address
     * @param tokenURI The IPFS URI for the token
     * @param metadata The game metadata struct
     */
    function payAndMintGame(
        address writerCoin,
        string memory tokenURI,
        IGameNFT.GameMetadata memory metadata
    ) external nonReentrant {
        require(address(gameNFT) != address(0), "GameNFT not set");
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(metadata.creator != address(0), "Creator cannot be zero");
        // User paying must be the caller, or the creator? 
        // Usually the caller pays.
        address payer = msg.sender;
        
        uint256 amount = whitelistedCoins[writerCoin].mintCost;
        
        // Transfer tokens from payer to this contract
        IERC20 token = IERC20(writerCoin);
        require(
            token.transferFrom(payer, address(this), amount),
            "Token transfer failed"
        );
        
        // Calculate shares
        // Calculate shares from DYNAMIC config
        MintDistribution memory dist = mintDistributions[writerCoin];
        uint256 creatorShare = (amount * dist.creatorShare) / 10000;
        uint256 writerShare = (amount * dist.writerShare) / 10000;
        uint256 platformShare = (amount * dist.platformShare) / 10000;
        
        // Distribute tokens
        // For minting, 50% stays with user/creator? 
        // "50% goes to creator/user directly (not distributed here)"
        // If payer IS creator, we just don't take it? 
        // Or we take 100% and send 50% back? The logic in payForMinting implies:
        // transferFrom(user, this, amount) -> then transfer(user, amount - shares).
        // This is inefficient but consistent.
        
        // Note: Logic copied from payForMinting
        require(
            token.transfer(payer, amount - creatorShare - writerShare - platformShare),
            "Creator transfer failed"
        );
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "Writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "Platform transfer failed"
        );
        
        // Mint the NFT
        gameNFT.mintGame(metadata.creator, tokenURI, metadata);
        
        emit GameMinted(payer, writerCoin, amount, creatorShare, writerShare, platformShare);
    }

    /**
     * @dev Process payment for Gameplay (Play-to-Pay)
     * Distributes revenue to Game Creator (User), Original Writer (IP), and Platform.
     * @param writerCoin The writer coin used for payment
     * @param gameCreator The address of the game creator to receive their share
     * @param amount The amount of tokens to pay
     */
    function payForGameplay(
        address writerCoin,
        address gameCreator,
        uint256 amount
    ) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "Writer coin not whitelisted");
        require(gameCreator != address(0), "Creator address needed");
        require(amount > 0, "Amount must be > 0");

        address payer = msg.sender;
        IERC20 token = IERC20(writerCoin);

        // 1. Collect Payment
        require(
            token.transferFrom(payer, address(this), amount),
            "Token transfer failed"
        );

        // 2. Calculate Splits
        GameplayDistribution memory dist = gameplayDistributions[writerCoin];
        
        // If no distribution set, default to: 80% Creator, 10% Writer, 10% Platform
        uint256 creatorSharePct = dist.creatorShare > 0 ? dist.creatorShare : 8000;
        uint256 writerSharePct = dist.writerShare > 0 ? dist.writerShare : 1000;
        uint256 platformSharePct = dist.platformShare > 0 ? dist.platformShare : 1000;

        uint256 creatorAmt = (amount * creatorSharePct) / 10000;
        uint256 writerAmt = (amount * writerSharePct) / 10000;
        uint256 platformAmt = (amount * platformSharePct) / 10000;

        // 3. Distribute Revenue
        
        // To Game Creator (Dynamic)
        require(
            token.transfer(gameCreator, creatorAmt),
            "Creator transfer failed"
        );

        // To Original Writer (Fixed per Coin)
        require(
            token.transfer(writerTreasuries[writerCoin], writerAmt),
            "Writer transfer failed"
        );

        // To Platform (Fixed)
        require(
            token.transfer(platformTreasury, platformAmt),
            "Platform transfer failed"
        );

        // Return remainder to payer if any (dust)
        uint256 remainder = amount - creatorAmt - writerAmt - platformAmt;
        if (remainder > 0) {
            token.transfer(payer, remainder);
        }

        emit GameplayPaid(payer, gameCreator, writerCoin, amount, creatorAmt, writerAmt, platformAmt);
    }
    
    /**
     * @dev Check if a coin is whitelisted
     * @param coinAddress The coin to check
     * @return bool
     */
    function isCoinWhitelisted(address coinAddress) external view returns (bool) {
        return whitelistedCoins[coinAddress].enabled;
    }
    
    /**
     * @dev Get payment config for a coin
     * @param coinAddress The coin to check
     * @return PaymentConfig struct
     */
    function getCoinConfig(address coinAddress) external view returns (PaymentConfig memory) {
        return whitelistedCoins[coinAddress];
    }
    
    /**
     * @dev Get revenue distribution for a coin
     * @param coinAddress The coin to check
     * @return RevenueDistribution struct
     */
    function getRevenueDistribution(address coinAddress) external view returns (RevenueDistribution memory) {
        return revenueDistributions[coinAddress];
    }
}
