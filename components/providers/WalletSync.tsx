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
    async function handleWalletState() {
      if (isConnected && address) {
        // LOGIN / SYNC
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
            router.refresh()
          } else {
            console.error('[WalletSync] Failed to sync wallet')
          }
        } catch (error) {
          console.error('[WalletSync] Error syncing wallet:', error)
        }
      } else {
        // LOGOUT / CLEAR SESSION
        // If not connected, we ensure the backend session is cleared
        try {
          // We can check if we have a cookie first to avoid spamming, but 
          // the logout endpoint is cheap and idempotent.
          await fetch('/api/auth/logout', { method: 'POST' })
          console.log('[WalletSync] Wallet disconnected - Session cleared')
          // Only refresh if we actually cleared something? 
          // Router refresh is safe though.
          router.refresh()
        } catch (error) {
          console.error('[WalletSync] Error clearing session:', error)
        }
      }
    }

    handleWalletState()
  }, [address, isConnected, chainId, router])

  return null
}
