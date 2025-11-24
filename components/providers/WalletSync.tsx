'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

/**
 * Wallet Sync Provider
 * 
 * Syncs browser wallet connection to user session
 * Allows web app to track user's connected wallet address
 */
export function WalletSync() {
  const { address, isConnected, chainId } = useAccount()
  const router = useRouter()

  useEffect(() => {
    async function syncWallet() {
      if (isConnected && address) {
        try {
          // Only sync if on Base chain (chainId 8453)
          const onBase = chainId === 8453
          
          const response = await fetch('/api/auth/wallet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              address,
              chainId,
              isConnected: true,
            }),
          })

          if (response.ok) {
            console.log(`[WalletSync] Wallet synced: ${address} ${onBase ? '(on Base)' : '(not on Base)'}`)
            // Refresh the page data to reflect the new user state
            router.refresh()
          } else {
            console.error('[WalletSync] Failed to sync wallet')
          }
        } catch (error) {
          console.error('[WalletSync] Error syncing wallet:', error)
        }
      } else if (!isConnected) {
        // Wallet disconnected - could optionally clear session here
        console.log('[WalletSync] Wallet disconnected')
      }
    }

    syncWallet()
  }, [address, isConnected, chainId, router])

  return null
}
