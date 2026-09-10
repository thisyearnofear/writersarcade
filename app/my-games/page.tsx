import { WalletProviders } from '@/components/providers/WalletProviders'
import { WalletLoadingFallback } from '@/components/providers/WalletLoadingFallback'
import { MyGamesClient } from './my-games-client'

export const metadata = {
  title: 'My Games',
  description: 'Your personal game library on writersarcade. Play, mint, register IP, and manage your created games.',
  robots: { index: false, follow: false },
}

export default function MyGamesPage() {
  return (
    <WalletProviders fallback={<WalletLoadingFallback />}>
      <MyGamesClient />
    </WalletProviders>
  )
}
