'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/error/ErrorCard'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'

export default function BasePaintError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('BasePaint daily challenge error:', error)
  }, [error])

  return (
    <ThemeWrapper theme="arcade">
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <ErrorCard
          error={error}
          context="Couldn't load today's daily challenge"
          onRetry={reset}
          suggestions={[
            'Refresh the page to try again.',
            'The daily deck may still be shuffling — check back in a moment.',
          ]}
        />
      </main>
    </div>
    </ThemeWrapper>
  )
}
