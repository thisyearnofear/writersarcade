'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { Sparkles, Menu, X, Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useDarkMode } from '@/components/providers/DarkModeProvider'

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

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

  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/images/logo-white.png" alt="WritArcade Logo" className="h-8 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/games" className="text-gray-300 hover:text-white transition-colors">
            Games
          </Link>
          <Link href="/workshop" className="text-gray-300 hover:text-white transition-colors">
            Workshop
          </Link>
          <Link
            href="/generate"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all text-sm text-purple-300 hover:text-purple-200"
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
          className="md:hidden p-2 rounded-md hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
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
        <div className="md:hidden bg-black/90 backdrop-blur-lg border-t border-gray-800">
          <div className="px-4 py-4 space-y-4">
            <Link
              href="/games"
              className="block py-2 px-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Games
            </Link>
            <Link
              href="/generate"
              className="flex items-center space-x-2 py-2 px-3 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all text-purple-300 hover:text-purple-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create</span>
            </Link>
            <div className="pt-2 border-t border-gray-800">
              <BalanceDisplay mobileLayout={true} />
            </div>
            <div className="pt-2">
              <DarkModeToggle />
            </div>
            <div className="pt-2">
              <UserMenu mobileLayout={true} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
