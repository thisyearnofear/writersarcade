/**
 * Payment Cost Calculation Service
 * 
 * Single source of truth for calculating costs and revenue distribution
 * Used by both web app + mini app payment flows
 */

import { getWriterCoinById } from '@/lib/writerCoins'
import type { PaymentAction, PaymentCost, RevenueDistribution } from '../types'

export class PaymentCostService {
  /**
   * Calculate cost for a payment action
   */
  static calculateCost(writerCoinId: string, action: PaymentAction): PaymentCost {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    const amount =
      action === 'generate-game' || action === 'play-wordle'
        ? coin.gameGenerationCost
        : coin.mintCost

    return {
      action,
      amount,
      amountFormatted: (Number(amount) / 10 ** coin.decimals).toFixed(2),
      writerCoinId: coin.id,
      writerCoinSymbol: coin.symbol,
      decimals: coin.decimals,
    }
  }

  /**
   * Calculate revenue distribution for a payment
   */
  static async calculateDistribution(
    writerCoinId: string,
    action: PaymentAction
  ): Promise<RevenueDistribution> {
    const coin = getWriterCoinById(writerCoinId)
    if (!coin) {
      throw new Error(`Writer coin "${writerCoinId}" not found`)
    }

    const amount =
      action === 'generate-game' || action === 'play-wordle'
        ? coin.gameGenerationCost
        : coin.mintCost

    if (action === 'generate-game' || action === 'play-wordle') {
      // Prefer on-chain configuration for generation splits
      try {
        const { fetchGenerationDistributionOnChain } = await import('@/lib/contracts')
        const { writerBP, platformBP, creatorBP } = await fetchGenerationDistributionOnChain(coin.address)
        return {
          writerShare: (amount * BigInt(writerBP)) / BigInt(10000),
          platformShare: (amount * BigInt(platformBP)) / BigInt(10000),
          creatorShare: (amount * BigInt(creatorBP)) / BigInt(10000),
        }
      } catch {
        // Fallback to local config if on-chain read fails
        return {
          writerShare: (amount * BigInt(coin.revenueDistribution.writer)) / BigInt(100),
          platformShare: (amount * BigInt(coin.revenueDistribution.platform)) / BigInt(100),
          creatorShare: (amount * BigInt(coin.revenueDistribution.creator)) / BigInt(100),
        }
      }
    } else {
      // Prefer on-chain configuration for mint splits
      try {
        const { fetchMintDistributionOnChain } = await import('@/lib/contracts')
        const { creatorBP, writerBP, platformBP } = await fetchMintDistributionOnChain(coin.address)
        return {
          writerShare: (amount * BigInt(writerBP)) / BigInt(10000),
          platformShare: (amount * BigInt(platformBP)) / BigInt(10000),
          creatorShare: (amount * BigInt(creatorBP)) / BigInt(10000),
        }
      } catch {
        // Fallback to 30/15/5 with remainder to user
        return {
          writerShare: (amount * BigInt(15)) / BigInt(100),
          platformShare: (amount * BigInt(5)) / BigInt(100),
          creatorShare: (amount * BigInt(30)) / BigInt(100),
        }
      }
    }
  }

  /**
   * Format cost in human-readable form
   */
  static formatCost(amount: bigint, decimals: number, symbol: string): string {
    const formatted = (Number(amount) / 10 ** decimals).toFixed(0)
    return `${formatted} ${symbol}`
  }

  /**
   * Format distribution summary
   */
  static formatDistribution(
    distribution: RevenueDistribution,
    decimals: number,
    symbol: string
  ): {
    writerShare: string
    platformShare: string
    creatorShare: string
  } {
    return {
      writerShare: this.formatCost(distribution.writerShare, decimals, symbol),
      platformShare: this.formatCost(distribution.platformShare, decimals, symbol),
      creatorShare: this.formatCost(distribution.creatorShare, decimals, symbol),
    }
  }
}
