/**
 * Wallet Provider Factory & Detection
 * 
 * Exports unified wallet interface and auto-detection logic
 * Single entry point for all wallet interactions across web + mini app
 */

import type { WalletProvider, WalletDetectionResult } from './types'
import { farcasterProvider } from './farcaster'
import { browserProvider } from './browser'

export type { WalletProvider, TransactionRequest, TransactionResult, WalletType } from './types'
export { farcasterProvider, browserProvider }

/**
 * Detect available wallet provider in current environment
 * 
 * Tries Farcaster first (mini app context), then browser wallets (web app)
 */
export async function detectWalletProvider(): Promise<WalletDetectionResult> {
  // Try Farcaster first (mini app environment)
  if (await farcasterProvider.isAvailable()) {
    return {
      provider: farcasterProvider,
      type: 'farcaster',
      available: true,
    }
  }

  // Fall back to browser wallet (web app environment)
  if (await browserProvider.isAvailable()) {
    return {
      provider: browserProvider,
      type: 'metamask',
      available: true,
    }
  }

  // No wallet available
  return {
    provider: null,
    type: null,
    available: false,
  }
}

/**
 * Get a specific wallet provider by type
 */
export function getWalletProvider(type: 'farcaster' | 'metamask'): WalletProvider | null {
  switch (type) {
    case 'farcaster':
      return farcasterProvider
    case 'metamask':
      return browserProvider
    default:
      return null
  }
}
