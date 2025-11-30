'use client'

import Link from 'next/link'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
            WritArcade
          </div>
        </Link>

        <nav className="flex items-center space-x-6">
          <Link href="/games" className="text-gray-300 hover:text-white transition-colors">
            Games
          </Link>
          <Link 
            href="/generate" 
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50 transition-all text-sm text-purple-300 hover:text-purple-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create</span>
          </Link>
          <BalanceDisplay />
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}