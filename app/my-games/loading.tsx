import { GridSkeleton } from '@/components/effects'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'

export default function MyGamesLoading() {
  return (
    <ThemeWrapper theme="arcade">
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-8 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <GridSkeleton count={6} columns={3} />
        </div>
      </main>
    </div>
    </ThemeWrapper>
  )
}
