/**
 * Writer Coin Configuration
 * 
 * Defines the whitelisted writer coins that can be used
 * to generate games from articles. Each writer coin is associated with
 * a specific Paragraph author/publication.
 */

export interface WriterCoin {
    id: string
    name: string
    symbol: string
    address: `0x${string}` // ERC-20 contract address on Base
    writer: string
    paragraphAuthor: string // Used to validate article URLs
    paragraphUrl: string
    gameGenerationCost: bigint // Cost in tokens to generate a game
    mintCost: bigint // Cost in tokens to mint game as NFT
    decimals: number
    gameNftAddress: `0x${string}` // GameNFT contract address
    paymentContractAddress: `0x${string}` // WriterCoinPayment contract address

    // Revenue distribution (percentages, should sum to 100)
    revenueDistribution: {
        writer: number // % to writer's treasury
        creator: number // % to game creator
        platform: number // % to WritArcade
        burn: number // % token burn (deflationary)
    }
}

/**
 * Whitelisted writer coins for MVP
 * 
 * Launch partners:
 * 1. AVC by Fred Wilson ($AVC)
 * 2. TBD - Writer Coin #2
 * 3. TBD - Writer Coin #3
 */
export const WRITER_COINS: WriterCoin[] = [
    {
        id: "avc",
        name: "AVC",
        symbol: "$AVC",
        address: "0x06FC3D5D2369561e28F261148576520F5e49D6ea", // Base mainnet
        writer: "Fred Wilson",
        paragraphAuthor: "fredwilson",
        paragraphUrl: "https://avc.xyz/",
        gameGenerationCost: BigInt(100 * 10 ** 18), // 100 $AVC
        mintCost: BigInt(50 * 10 ** 18), // 50 $AVC
        decimals: 18,
        gameNftAddress: "0x778C87dAA2b284982765688AE22832AADae7dccC", // Base mainnet - GameNFT
        paymentContractAddress: "0xf4d556E6E739B4Aa065Fae41f353a9f296371a35", // Base mainnet - WriterCoinPayment
        revenueDistribution: {
            writer: 60, // 60% to writer treasury (on-chain configurable)
            creator: 20, // 20% to creator pool (on-chain configurable)
            burn: 0, // 0% burn (no on-chain burn in WriterCoinPayment)
            platform: 20, // 20% to WritArcade (on-chain configurable)
        },
    },
]

/**
 * Get writer coin by contract address
 */
export function getWriterCoinByAddress(address: string): WriterCoin | undefined {
    return WRITER_COINS.find(
        (coin) => coin.address.toLowerCase() === address.toLowerCase()
    )
}

/**
 * Get writer coin by ID
 */
export function getWriterCoinById(id: string): WriterCoin | undefined {
    return WRITER_COINS.find((coin) => coin.id === id)
}

/**
 * Get writer coin by Paragraph author
 */
export function getWriterCoinByAuthor(author: string): WriterCoin | undefined {
    return WRITER_COINS.find(
        (coin) => coin.paragraphAuthor.toLowerCase() === author.toLowerCase()
    )
}

/**
 * Validate if an article URL matches a writer coin's Paragraph
 */
export function validateArticleUrl(url: string, writerCoinId: string): boolean {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) return false

    try {
        const articleUrl = new URL(url)
        const coinUrl = new URL(coin.paragraphUrl)
        return articleUrl.hostname === coinUrl.hostname
    } catch {
        return false
    }
}

/**
 * Check if a writer coin address is whitelisted
 */
export function isWhitelistedWriterCoin(address: string): boolean {
    return WRITER_COINS.some(
        (coin) => coin.address.toLowerCase() === address.toLowerCase()
    )
}
