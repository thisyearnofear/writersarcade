import { WalletProviders } from '@/components/providers/WalletProviders'
import { BasePaintCollectionView } from '@/components/basepaint/basepaint-collection-view'

export const metadata = {
  title: 'Your BasePaint collection — Daily Challenge',
  description:
    'Canvases you own on BasePaint — and the writersarcade stories they inspired.',
}

export default function BasePaintCollectionPage() {
  return (
    <WalletProviders fallback={<div className="min-h-screen bg-black" />}>
      <BasePaintCollectionView />
    </WalletProviders>
  )
}
