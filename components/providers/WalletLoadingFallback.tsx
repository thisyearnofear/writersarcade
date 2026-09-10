'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletLoadingFallbackProps {
  showHeader?: boolean
  className?: string
  message?: string
  children?: React.ReactNode
}

/**
 * Branded loading shell shown while the wallet bundle (wagmi/viem/RainbowKit/Mezo)
 * is being fetched/parsed. It keeps the app chrome visible instead of a blank page.
 */
export function WalletLoadingFallback({
  showHeader = true,
  className,
  message = 'Loading wallet…',
  children,
}: WalletLoadingFallbackProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-black', className)}>
      {showHeader && (
        <header className="border-b border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
            <nav className="hidden items-center gap-6 md:flex">
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
            </nav>
          </div>
        </header>
      )}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {children ?? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
