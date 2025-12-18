// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Enable optimizer with viaIR for stack too deep issues
// solc: optimizer: true
// solc: viaIR: true

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
    
    function ownerOf(uint256 tokenId) external view returns (address);
    function exists(uint256 tokenId) external view returns (bool);
}

/**
 * @title WriterCoinPayment
 * @dev Handles payments and revenue distribution for game generation and NFT minting
 * 
 * Users pay in writer coins (e.g., $AVC) to:
 * 1. Generate games from articles (100 tokens)
 * 2. Mint generated games as NFTs (50 tokens)
 * 3. Play games (variable amount)
 * 
 * Revenue is split:
 * - Game generation: 60% writer, 20% platform, 20% creator pool
 * - NFT minting: 50% creator, 15% writer, 5% platform (30% kept by minter)
 * - Gameplay: 80% game creator, 10% writer, 10% platform
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

    // Minting distribution (basis points)
    // Note: Total may be less than 10000 - remainder stays with minter
    struct MintDistribution {
        uint256 creatorShare;        // Share for the game creator (e.g., 5000 = 50%)
        uint256 writerShare;         // Share for the writer (e.g., 1500 = 15%)
        uint256 platformShare;       // Share for the platform (e.g., 500 = 5%)
        // Remaining (3000 = 30%) stays with minter as incentive
    }

    // Gameplay distribution (basis points)
    struct GameplayDistribution {
        uint256 creatorShare;        // Share for the game creator (e.g., 8000 = 80%)
        uint256 writerShare;         // Share for the writer (e.g., 1000 = 10%)
        uint256 platformShare;       // Share for the platform (e.g., 1000 = 10%)
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
        uint256 creatorPoolShare
    );
    
    event GameMinted(
        address indexed minter,
        address indexed writerCoin,
        uint256 tokenId,
        uint256 totalCost,
        uint256 creatorShare,
        uint256 writerShare,
        uint256 platformShare,
        uint256 minterRefund
    );

    event GameplayPaid(
        address indexed player,
        address indexed gameCreator,
        address indexed writerCoin,
        uint256 gameId,
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
    
    event RevenueSplitsUpdated(
        address indexed coinAddress,
        string distributionType
    );
    
    constructor(
        address initialOwner,
        address _platformTreasury,
        address _creatorPool
    ) Ownable(initialOwner) {
        require(_platformTreasury != address(0), "WriterCoinPayment: zero platform treasury");
        require(_creatorPool != address(0), "WriterCoinPayment: zero creator pool");
        
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
     * @param mintCreatorShare Basis points for game creator on mint (e.g., 5000 = 50%)
     * @param mintWriterShare Basis points for writer on mint (e.g., 1500 = 15%)
     * @param mintPlatformShare Basis points for platform on mint (e.g., 500 = 5%)
     * @param playCreatorShare Basis points for game creator on gameplay (e.g., 8000 = 80%)
     * @param playWriterShare Basis points for writer on gameplay (e.g., 1000 = 10%)
     * @param playPlatformShare Basis points for platform on gameplay (e.g., 1000 = 10%)
     */
    function whitelistCoin(
        address coinAddress,
        uint256 gameGenerationCost,
        uint256 mintCost,
        address treasury,
        uint256 writerShare,
        uint256 platformShare,
        uint256 creatorPoolShare,
        uint256 mintCreatorShare,
        uint256 mintWriterShare,
        uint256 mintPlatformShare,
        uint256 playCreatorShare,
        uint256 playWriterShare,
        uint256 playPlatformShare
    ) external onlyOwner {
        require(coinAddress != address(0), "WriterCoinPayment: zero coin address");
        require(treasury != address(0), "WriterCoinPayment: zero treasury");
        require(gameGenerationCost > 0, "WriterCoinPayment: zero generation cost");
        require(mintCost > 0, "WriterCoinPayment: zero mint cost");
        require(
            writerShare + platformShare + creatorPoolShare == 10000,
            "WriterCoinPayment: generation shares must total 100%"
        );
        require(
            mintCreatorShare + mintWriterShare + mintPlatformShare <= 10000,
            "WriterCoinPayment: mint shares exceed 100%"
        );
        require(
            playCreatorShare + playWriterShare + playPlatformShare <= 10000,
            "WriterCoinPayment: gameplay shares exceed 100%"
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
            creatorShare: mintCreatorShare,
            writerShare: mintWriterShare,
            platformShare: mintPlatformShare
        });
        
        gameplayDistributions[coinAddress] = GameplayDistribution({
            creatorShare: playCreatorShare,
            writerShare: playWriterShare,
            platformShare: playPlatformShare
        });
        
        writerTreasuries[coinAddress] = treasury;
        
        emit CoinWhitelisted(coinAddress, gameGenerationCost, mintCost);
    }
    
    /**
     * @dev Set the GameNFT contract address
     * @param _gameNFT Address of the GameNFT contract
     */
    function setGameNFT(address _gameNFT) external onlyOwner {
        require(_gameNFT != address(0), "WriterCoinPayment: zero GameNFT address");
        gameNFT = IGameNFT(_gameNFT);
        emit GameNFTUpdated(_gameNFT);
    }
    
    /**
     * @dev Remove a writer coin from whitelist
     * @param coinAddress The coin to remove
     */
    function removeCoin(address coinAddress) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        whitelistedCoins[coinAddress].enabled = false;
        emit CoinRemoved(coinAddress);
    }
    
    /**
     * @dev Update a writer's treasury address
     * @param coinAddress The writer coin address
     * @param newTreasury The new treasury address
     */
    function updateWriterTreasury(address coinAddress, address newTreasury) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        require(newTreasury != address(0), "WriterCoinPayment: zero treasury");
        writerTreasuries[coinAddress] = newTreasury;
        emit TreasuryUpdated(coinAddress, newTreasury);
    }
    
    /**
     * @dev Update platform treasury address
     * @param newTreasury The new treasury address
     */
    function updatePlatformTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "WriterCoinPayment: zero treasury");
        platformTreasury = newTreasury;
        emit PlatformTreasuryUpdated(newTreasury);
    }
    
    /**
     * @dev Update creator pool address
     * @param newPool The new pool address
     */
    function updateCreatorPool(address newPool) external onlyOwner {
        require(newPool != address(0), "WriterCoinPayment: zero pool");
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
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        require(newGenerationCost > 0, "WriterCoinPayment: zero generation cost");
        require(newMintCost > 0, "WriterCoinPayment: zero mint cost");
        
        whitelistedCoins[coinAddress].gameGenerationCost = newGenerationCost;
        whitelistedCoins[coinAddress].mintCost = newMintCost;
        
        emit CoinConfigUpdated(coinAddress, newGenerationCost, newMintCost);
    }

    /**
     * @dev Update revenue splits for a coin (Dynamic Configuration)
     * @param coinAddress The writer coin address
     * @param genWriter Basis points for writer (generation)
     * @param genPlatform Basis points for platform (generation)
     * @param genPool Basis points for creator pool (generation)
     * @param mintCreator Basis points for game creator (mint)
     * @param mintWriter Basis points for writer (mint)
     * @param mintPlatform Basis points for platform (mint)
     * @param playCreator Basis points for game creator (gameplay)
     * @param playWriter Basis points for writer (gameplay)
     * @param playPlatform Basis points for platform (gameplay)
     */
    function updateRevenueSplits(
        address coinAddress,
        uint256 genWriter,
        uint256 genPlatform,
        uint256 genPool,
        uint256 mintCreator,
        uint256 mintWriter,
        uint256 mintPlatform,
        uint256 playCreator,
        uint256 playWriter,
        uint256 playPlatform
    ) external onlyOwner {
        require(whitelistedCoins[coinAddress].enabled, "WriterCoinPayment: coin not whitelisted");
        require(genWriter + genPlatform + genPool == 10000, "WriterCoinPayment: generation shares != 100%");
        require(mintCreator + mintWriter + mintPlatform <= 10000, "WriterCoinPayment: mint shares > 100%");
        require(playCreator + playWriter + playPlatform <= 10000, "WriterCoinPayment: gameplay shares > 100%");

        revenueDistributions[coinAddress] = RevenueDistribution(genWriter, genPlatform, genPool);
        mintDistributions[coinAddress] = MintDistribution(mintCreator, mintWriter, mintPlatform);
        gameplayDistributions[coinAddress] = GameplayDistribution(playCreator, playWriter, playPlatform);
        
        emit RevenueSplitsUpdated(coinAddress, "all");
    }
    
    /**
     * @dev Process payment for game generation
     * @param writerCoin The writer coin token address
     */
    function payForGameGeneration(address writerCoin) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "WriterCoinPayment: coin not whitelisted");
        
        uint256 amount = whitelistedCoins[writerCoin].gameGenerationCost;
        IERC20 token = IERC20(writerCoin);
        
        // Transfer tokens from user to this contract
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "WriterCoinPayment: token transfer failed"
        );
        
        // Calculate shares - last one gets remainder to prevent dust
        RevenueDistribution memory distribution = revenueDistributions[writerCoin];
        
        uint256 writerShare = (amount * distribution.writerShare) / 10000;
        uint256 platformShare = (amount * distribution.platformShare) / 10000;
        
        // Distribute tokens - all external calls at end
        require(
            token.transfer(writerTreasuries[writerCoin], writerShare),
            "WriterCoinPayment: writer transfer failed"
        );
        require(
            token.transfer(platformTreasury, platformShare),
            "WriterCoinPayment: platform transfer failed"
        );
        require(
            token.transfer(creatorPool, amount - writerShare - platformShare),
            "WriterCoinPayment: creator pool transfer failed"
        );
        
        emit GameGenerated(msg.sender, writerCoin, amount, writerShare, platformShare, amount - writerShare - platformShare);
    }
    
    /**
     * @dev Process payment AND mint the NFT in one transaction
     * @param writerCoin The writer coin token address
     * @param tokenURI The IPFS URI for the token
     * @param metadata The game metadata struct
     * @return tokenId The ID of the minted NFT
     */
    function payAndMintGame(
        address writerCoin,
        string memory tokenURI,
        IGameNFT.GameMetadata memory metadata
    ) external nonReentrant returns (uint256) {
        require(address(gameNFT) != address(0), "WriterCoinPayment: GameNFT not set");
        require(whitelistedCoins[writerCoin].enabled, "WriterCoinPayment: coin not whitelisted");
        require(metadata.creator != address(0), "WriterCoinPayment: zero creator");
        require(bytes(tokenURI).length > 0, "WriterCoinPayment: empty tokenURI");
        require(metadata.writerCoin == writerCoin, "WriterCoinPayment: writerCoin mismatch");
        
        uint256 mintCost = whitelistedCoins[writerCoin].mintCost;
        IERC20 token = IERC20(writerCoin);
        
        // Calculate shares using fewer local variables
        MintDistribution memory dist = mintDistributions[writerCoin];
        
        // Calculate and distribute in one pass to reduce stack usage
        uint256 creatorShare = (mintCost * dist.creatorShare) / 10000;
        uint256 writerShare = (mintCost * dist.writerShare) / 10000;
        uint256 platformShare = (mintCost * dist.platformShare) / 10000;
        
        // Calculate net payment (what we actually need from minter)
        uint256 netPayment = mintCost - (creatorShare + writerShare + platformShare);
        
        // Transfer only net payment from minter
        require(
            token.transferFrom(msg.sender, address(this), netPayment),
            "WriterCoinPayment: token transfer failed"
        );
        
        // Distribute shares - all external calls before minting
        if (creatorShare > 0) {
            require(
                token.transfer(metadata.creator, creatorShare),
                "WriterCoinPayment: creator transfer failed"
            );
        }
        if (writerShare > 0) {
            require(
                token.transfer(writerTreasuries[writerCoin], writerShare),
                "WriterCoinPayment: writer transfer failed"
            );
        }
        if (platformShare > 0) {
            require(
                token.transfer(platformTreasury, platformShare),
                "WriterCoinPayment: platform transfer failed"
            );
        }
        
        // Mint the NFT (external call last)
        uint256 tokenId = gameNFT.mintGame(metadata.creator, tokenURI, metadata);
        
        emit GameMinted(msg.sender, writerCoin, tokenId, mintCost, creatorShare, writerShare, platformShare, mintCost - netPayment);
        
        return tokenId;
    }

    /**
     * @dev Process payment for Gameplay (Pay-to-Play)
     * Distributes revenue to Game Creator, Original Writer (IP), and Platform.
     * @param writerCoin The writer coin used for payment
     * @param gameId The ID of the game being played
     * @param amount The amount of tokens to pay
     */
    function payForGameplay(
        address writerCoin,
        uint256 gameId,
        uint256 amount
    ) external nonReentrant {
        require(whitelistedCoins[writerCoin].enabled, "WriterCoinPayment: coin not whitelisted");
        require(amount > 0, "WriterCoinPayment: zero amount");
        require(address(gameNFT) != address(0), "WriterCoinPayment: GameNFT not set");
        
        // Validate game exists and get creator
        address gameCreator = gameNFT.ownerOf(gameId);
        require(gameCreator != address(0), "WriterCoinPayment: invalid game");
        
        IERC20 token = IERC20(writerCoin);

        // Transfer payment from player
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "WriterCoinPayment: token transfer failed"
        );

        // Calculate shares
        GameplayDistribution memory dist = gameplayDistributions[writerCoin];
        
        uint256 creatorShare = (amount * dist.creatorShare) / 10000;
        uint256 writerShare = (amount * dist.writerShare) / 10000;
        
        // Distribute revenue - all external calls at end
        if (creatorShare > 0) {
            require(
                token.transfer(gameCreator, creatorShare),
                "WriterCoinPayment: creator transfer failed"
            );
        }
        if (writerShare > 0) {
            require(
                token.transfer(writerTreasuries[writerCoin], writerShare),
                "WriterCoinPayment: writer transfer failed"
            );
        }
        if (amount - creatorShare - writerShare > 0) {
            require(
                token.transfer(platformTreasury, amount - creatorShare - writerShare),
                "WriterCoinPayment: platform transfer failed"
            );
        }

        emit GameplayPaid(msg.sender, gameCreator, writerCoin, gameId, amount, creatorShare, writerShare, amount - creatorShare - writerShare);
    }
    
    /**
     * @dev Check if a coin is whitelisted
     * @param coinAddress The coin to check
     * @return bool Whether the coin is whitelisted
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
    
    /**
     * @dev Get mint distribution for a coin
     * @param coinAddress The coin to check
     * @return MintDistribution struct
     */
    function getMintDistribution(address coinAddress) external view returns (MintDistribution memory) {
        return mintDistributions[coinAddress];
    }
    
    /**
     * @dev Get gameplay distribution for a coin
     * @param coinAddress The coin to check
     * @return GameplayDistribution struct
     */
    function getGameplayDistribution(address coinAddress) external view returns (GameplayDistribution memory) {
        return gameplayDistributions[coinAddress];
    }
    
    /**
     * @dev Emergency function to recover accidentally sent ERC20 tokens
     * @param tokenAddress The token contract address
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(0), "WriterCoinPayment: zero token address");
        require(amount > 0, "WriterCoinPayment: zero amount");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "WriterCoinPayment: insufficient balance");
        
        require(
            token.transfer(owner(), amount),
            "WriterCoinPayment: withdrawal failed"
        );
    }
    
    /**
     * @dev Emergency function to recover accidentally sent native tokens
     */
    function emergencyWithdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "WriterCoinPayment: zero native balance");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "WriterCoinPayment: native withdrawal failed");
    }
}