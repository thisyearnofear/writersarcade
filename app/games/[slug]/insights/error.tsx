'use client'

import Link from 'next/link'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'

export default function InsightsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ThemeWrapper theme="arcade">
    <div className="flex min-h-screen flex-col bg-black">
      <Header />
      <div className="flex flex-1 items-center justify-center px-6">
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-white">Insights couldn't load.</p>
        <p className="text-xs text-muted-foreground">
          {error.digest ? `Ref: ${error.digest}` : 'Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:border-white/40"
          >
            Try again
          </button>
          <Link
            href="/my-games"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            My games
          </Link>
        </div>
      </div>
      </div>
    </div>
    </ThemeWrapper>
  )
}
