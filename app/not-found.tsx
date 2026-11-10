'use client'

import Link from 'next/link'
import { Gamepad2, Home, Sparkles, MapPinOff } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Button } from '@/components/ui/button'
import { IconChip } from '@/components/ui/icon-chip'

export default function NotFound() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-lg text-center space-y-6">
            <IconChip icon={MapPinOff} className="mx-auto" />

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">404</p>
              <h1 className="text-2xl font-bold text-foreground">This story isn&apos;t here</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The page or game may have moved, or the link might be mistyped. The arcade is full of
                playable stories — pick one and jump in.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="brand" className="h-auto w-full gap-2 rounded-lg px-6 py-3 font-semibold sm:w-auto">
                <Link href="/games">
                  <Gamepad2 className="h-5 w-5" />
                  Browse the arcade
                </Link>
              </Button>
              <Link
                href="/generate"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                <Sparkles className="h-5 w-5" />
                Create a game
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
