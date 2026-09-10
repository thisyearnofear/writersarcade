'use client'

import { ReactNode } from 'react'
import { WalletErrorBoundary } from '@/components/error/WalletErrorBoundary'
import { WalletInsideProvider } from './wallet-inside-context'
import { Web3Provider } from './Web3Provider'
import { WalletSync } from './WalletSync'

interface WalletProvidersImplProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function WalletProvidersImpl({ children }: WalletProvidersImplProps) {
  return (
    <WalletInsideProvider value={true}>
      <WalletErrorBoundary>
        <Web3Provider>
          <WalletSync />
          {children}
        </Web3Provider>
      </WalletErrorBoundary>
    </WalletInsideProvider>
  )
}
