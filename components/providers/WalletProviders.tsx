'use client'

import dynamic from 'next/dynamic'
import { Suspense, ReactNode } from 'react'

const WalletProvidersImpl = dynamic(() => import('./WalletProvidersImpl'), {
  ssr: false,
})

interface WalletProvidersProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Lazy wallet provider wrapper.
 *
 * This bundle contains wagmi, viem, RainbowKit, Mezo Passport and related
 * wallet code; it should only be loaded when the user reaches a wallet
 * surface (header wallet UI, payment step, minting, etc.).
 */
export function WalletProviders({ children, fallback = null }: WalletProvidersProps) {
  return (
    <Suspense fallback={fallback}>
      <WalletProvidersImpl fallback={fallback}>{children}</WalletProvidersImpl>
    </Suspense>
  )
}
