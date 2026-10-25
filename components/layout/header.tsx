'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { PenLine, Sun, Moon } from 'lucide-react'

import { useIsActive } from '@/hooks/useIsActive'
import { useDarkMode } from '@/components/providers/DarkModeProvider'
import { config } from '@/lib/config'
import { Button } from '@/components/ui/button'

const WalletHeader = dynamic(() => import('./WalletHeader').then(m => m.WalletHeader), { ssr: false })

function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleDarkMode}
      className="text-muted-foreground hover:text-foreground"
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
}

// Nav link definitions — single source of truth for desktop + mobile
const NAV_LINKS = [
  { href: '/games',    label: 'Play',        title: 'Browse all generated games' },
  ...(config.features.dailyChallenge ? [{ href: '/basepaint', label: 'Daily', title: "Today's BasePaint canvas challenge" }] : []),
  { href: '/my-games', label: 'My Games',    title: 'Your game library' },
  { href: '/writers',  label: 'Writers',     title: 'Explore supported writers and their coins' },
]

function AnimatedNavLink({ href, label, title, isActive }: { href: string; label: string; title?: string; isActive: boolean }) {
  return (
    <div className="transition-transform hover:scale-105 active:scale-95 motion-reduce:transform-none">
      <Link
        href={href}
        title={title}
        className={`relative transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded pb-0.5 ${
          isActive
            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground/60 after:rounded-full'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </Link>
    </div>
  )
}

function AnimatedCreateButton({ isActive }: { isActive: boolean }) {
  return (
    <div className="transition-transform hover:scale-105 active:scale-95 motion-reduce:transform-none">
      <Link
        href="/generate"
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
          isActive
            ? 'bg-accent border-border text-foreground'
            : 'bg-transparent border-border hover:bg-accent hover:border-foreground/20 text-muted-foreground hover:text-foreground'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <PenLine className="w-4 h-4" />
        <span>Create</span>
      </Link>
    </div>
  )
}

export function Header() {
  const isActive = useIsActive()

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-md relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="/logo.png"
            alt="writersarcade"
            className="h-8 w-auto transition-transform hover:scale-105 motion-reduce:transform-none"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {NAV_LINKS.slice(0, 2).map(({ href, label, title }) => (
            <AnimatedNavLink key={href} href={href} label={label} title={title} isActive={isActive(href)} />
          ))}

          <AnimatedCreateButton isActive={isActive('/generate')} />

          {NAV_LINKS.slice(2).map(({ href, label, title }) => (
            <AnimatedNavLink key={href} href={href} label={label} title={title} isActive={isActive(href)} />
          ))}

          <WalletHeader />
        </nav>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center space-x-3">
          <ThemeToggle />
          <WalletHeader mobileLayout />
        </div>
      </div>

      {/* Keep the three product pillars visible on small screens too. */}
      <nav className="flex md:hidden items-center gap-1 border-t border-border px-4 py-2" aria-label="Primary navigation">
        {[
          { href: '/games', label: 'Play' },
          { href: '/generate', label: 'Create' },
          ...(config.features.dailyChallenge ? [{ href: '/basepaint', label: 'Daily' }] : []),
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-xs font-semibold transition-colors ${
              isActive(link.href)
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
