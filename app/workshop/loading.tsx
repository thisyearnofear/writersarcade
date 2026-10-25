import { CardSkeleton } from '@/components/effects'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'

export default function WorkshopLoading() {
  return (
    <ThemeWrapper theme="arcade">
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </main>
    </div>
    </ThemeWrapper>
  )
}
