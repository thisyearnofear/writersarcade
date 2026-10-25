'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/error/ErrorCard'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Profile page error:', error)
  }, [error])

  return (
    <ThemeWrapper theme="arcade">
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <ErrorCard
          error={error}
          context="Couldn't load profile"
          onRetry={reset}
          suggestions={['Refresh the page to try again.', 'Check your internet connection.']}
        />
      </main>
    </div>
    </ThemeWrapper>
  )
}
