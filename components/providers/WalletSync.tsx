'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3Auth } from '@/components/providers/Web3Provider'

/**
 * Wallet Sync Provider
 * 
 * Syncs auth state changes to Next.js router
 * Triggered when RainbowKit completes SIWE flow or Disconnects
 */
export function WalletSync() {
  const { status } = useWeb3Auth()
  const router = useRouter()
  const prevStatus = useRef(status)

  useEffect(() => {
    // If status changed from loading/unauthenticated -> authenticated (Login)
    // Or from authenticated -> unauthenticated (Logout)
    if (prevStatus.current !== status) {
      if (status === 'authenticated') {
        console.log('[WalletSync] SIWE Login detected')
        router.refresh()
      } else if (status === 'unauthenticated' && prevStatus.current === 'authenticated') {
        console.log('[WalletSync] Logout detected')
        router.refresh()
      }
      prevStatus.current = status
    }
  }, [status, router])

  return null
}
