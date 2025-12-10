import { WriterCoin } from '@/lib/writerCoins'
import { prisma } from '@/lib/database'

export interface CreatorStats {
    totalRevenue: string // formatted
    totalGames: number
    topArticles: Array<{
        title: string
        gamesCount: number
        revenue: string
    }>
    registeredIpAssets: number
    royaltyPercentage: number
}

/**
 * Service to fetch creator dashboard stats
 * In a real V2, this would filter by the logged-in writer's wallet.
 * For MVP/Hackathon, we fetch stats for a specific WriterCoin (e.g., Fred Wilson's AVC).
 */
export async function getCreatorStats(writerCoinId: string): Promise<CreatorStats> {
    // 1. Get total games generated using this coin
    const gamesCount = await prisma.game.count({
        where: { writerCoinId }
    })

    // 2. Calculate total revenue (simulated based on successful payments)
    // In production this would query the aggregator or graph
    const payments = await prisma.payment.aggregate({
        where: { writerCoinId, status: 'verified' },
        _sum: { amount: true }
    })

    const totalRaw = payments._sum.amount || BigInt(0)
    // Assuming 18 decimals, basic formatting
    const totalRevenue = (Number(totalRaw) / 1e18).toFixed(2)

    // 3. Get top performing articles (mock/simulated for now as we don't index articles deeply yet)
    // We'll return dummy top articles to show the UI capability
    const topArticles = [
        { title: "The AI Revolution", gamesCount: Math.floor(gamesCount * 0.4), revenue: (Number(totalRevenue) * 0.4).toFixed(2) },
        { title: "Web3 Gaming Future", gamesCount: Math.floor(gamesCount * 0.3), revenue: (Number(totalRevenue) * 0.3).toFixed(2) },
        { title: "Building in Public", gamesCount: Math.floor(gamesCount * 0.2), revenue: (Number(totalRevenue) * 0.2).toFixed(2) },
    ]

    return {
        totalRevenue,
        totalGames: gamesCount,
        topArticles,
        registeredIpAssets: Math.floor(gamesCount * 0.8), // Simulation: 80% opt-in
        royaltyPercentage: 10 // The protocol default we discussed
    }
}
