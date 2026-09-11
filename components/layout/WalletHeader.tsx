'use client'

import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { WalletProviders } from '@/components/providers/WalletProviders'
import { useWalletInside } from '@/components/providers/wallet-inside-context'

function WalletHeaderContent({ mobileLayout = false }: { mobileLayout?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={mobileLayout ? 'hidden' : 'hidden md:block'}>
        <BalanceDisplay />
      </div>
      <UserMenu />
    </div>
  )
}

function WalletHeaderSkeleton({ mobileLayout = false }: { mobileLayout?: boolean }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/10 ${mobileLayout ? 'h-12 w-24' : 'h-10 w-40'}`} />
  )
}

interface WalletHeaderProps {
  mobileLayout?: boolean
}

export function WalletHeader({ mobileLayout = false }: WalletHeaderProps) {
  const inside = useWalletInside()
  const content = <WalletHeaderContent mobileLayout={mobileLayout} />
  if (inside) return content
  return (
    <WalletProviders fallback={<WalletHeaderSkeleton mobileLayout={mobileLayout} />}>
      {content}
    </WalletProviders>
  )
}
