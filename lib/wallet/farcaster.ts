/**
 * Farcaster Wallet Provider
 * 
 * Implements WalletProvider interface for Farcaster Mini App SDK
 * Used in /app/mini-app environment
 */

import type { WalletProvider, TransactionRequest, TransactionResult } from './types'

let sdk: any = null

// Lazy-load SDK only in browser and Farcaster context
try {
  if (typeof window !== 'undefined') {
    const farcasterModule = require('@farcaster/miniapp-sdk')
    if (farcasterModule && farcasterModule.sdk) {
      sdk = farcasterModule.sdk
    }
  }
} catch {
  // SDK not available
}

export class FarcasterWalletProvider implements WalletProvider {
  type = 'farcaster' as const

  async isAvailable(): Promise<boolean> {
    try {
      if (!sdk) return false
      const available = sdk && sdk.actions && typeof sdk.actions.sendTransaction === 'function'
      return available
    } catch {
      return false
    }
  }

  async getAddress(): Promise<`0x${string}` | null> {
    try {
      if (!sdk) return null
      const context = await sdk.context
      if (context?.user?.walletAddress) {
        return context.user.walletAddress as `0x${string}`
      }
      return null
    } catch (error) {
      console.error('[FarcasterWallet] Failed to get address:', error)
      return null
    }
  }

  async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      if (!sdk) {
        return {
          transactionHash: '0x',
          success: false,
          error: 'Farcaster Wallet SDK not available',
        }
      }

      // Validate request
      if (!request.to || !request.data) {
        throw new Error('Invalid transaction request: missing to or data')
      }

      // Ensure proper hex formatting
      if (!request.to.startsWith('0x') || request.to.length !== 42) {
        throw new Error('Invalid to address format')
      }

      if (!request.data.startsWith('0x')) {
        throw new Error('Invalid data format - must start with 0x')
      }

      const txRequest = {
        to: request.to,
        data: request.data,
        value: request.value || '0',
        chainId: request.chainId || 8453, // Base mainnet
      }

      console.log('[FarcasterWallet] Sending transaction:', txRequest)

      const result = await sdk.actions.sendTransaction(txRequest)

      if (!result || !result.transactionHash) {
        throw new Error('Transaction failed - no hash returned')
      }

      return {
        transactionHash: result.transactionHash as `0x${string}`,
        success: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[FarcasterWallet] Transaction error:', errorMessage)

      return {
        transactionHash: '0x',
        success: false,
        error: errorMessage,
      }
    }
  }

  async getChainId(): Promise<number> {
    // Farcaster Wallet is always on Base
    return 8453
  }
}

export const farcasterProvider = new FarcasterWalletProvider()
