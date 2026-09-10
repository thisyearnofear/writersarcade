'use client'

import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { BuyCreditsWrapper } from '@/components/ui/buy-credits-wrapper'
import { WalletProviders } from '@/components/providers/WalletProviders'
import { useWalletInside } from '@/components/providers/wallet-inside-context'

function WalletHeaderContent() {
  return (
    <>
      <BuyCreditsWrapper />
      <BalanceDisplay />
      <UserMenu />
    </>
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
  const content = <WalletHeaderContent />
  if (inside) return content
  return (
    <WalletProviders fallback={<WalletHeaderSkeleton mobileLayout={mobileLayout} />}>
      {content}
    </WalletProviders>
  )
}
