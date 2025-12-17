'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { Sparkles, Menu, X, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useDarkMode } from '@/components/providers/DarkModeProvider'

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering the toggle on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder to avoid layout shift (approximate width/height of toggle)
    return <div className="w-[70px] h-[24px]" aria-hidden="true" />
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dark-mode-toggle"
        checked={isDarkMode}
        onCheckedChange={toggleDarkMode}
        className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-zinc-700"
      />
      <label htmlFor="dark-mode-toggle" className="text-sm text-gray-300">
        {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </label>
    </div>
  )
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  // Close mobile menu when navigating
  const handleNavigation = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2" onClick={handleNavigation}>
          <img src="/images/logo-white.png" alt="WritArcade Logo" className="h-8 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/games" className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black rounded">
            Games
          </Link>
          <Link href="/workshop" className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black rounded">
            Workshop
          </Link>
          <Link
            href="/generate"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all text-sm text-purple-300 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create</span>
          </Link>
          <BalanceDisplay />
          <DarkModeToggle />
          <UserMenu />
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-3 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden bg-black/90 backdrop-blur-lg border-t border-gray-800"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
        >
          <div className="px-4 py-4 space-y-2">
            <h3 id="mobile-menu-title" className="sr-only">Mobile Navigation</h3>
            <Link
              href="/games"
              className="block py-3 px-4 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              onClick={handleNavigation}
            >
              Games
            </Link>
            <Link
              href="/workshop"
              className="block py-3 px-4 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              onClick={handleNavigation}
            >
              Workshop
            </Link>
            <Link
              href="/generate"
              className="flex items-center space-x-2 py-3 px-4 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all text-purple-300 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
              onClick={handleNavigation}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create</span>
            </Link>
            <div className="pt-3 border-t border-gray-800">
              <BalanceDisplay mobileLayout={true} />
            </div>
            <div className="pt-3">
              <DarkModeToggle />
            </div>
            <div className="pt-3">
              <UserMenu mobileLayout={true} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
