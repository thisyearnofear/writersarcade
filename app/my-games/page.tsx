'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GameCardEnhanced } from '@/domains/games/components/game-card-enhanced'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { Game } from '@/domains/games/types'
import { Loader2, Plus } from 'lucide-react'
import Link from 'next/link'

export default function MyGamesPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Require connection
  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }
  }, [isConnected, router])

  // Load user's games
  useEffect(() => {
    if (!address) return

    const loadGames = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await GameDatabaseService.getUserGames(address as string, 100)
        setGames((result.games || []) as Game[])
      } catch (err) {
        console.error('Failed to load games:', err)
        setError('Failed to load your games. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [address])

  const handleMintClick = async (gameId: string) => {
    setActionInProgress(gameId)
    try {
      // TODO: Implement NFT minting flow
      console.log('Mint game:', gameId)
      // Show success modal or redirect to minting page
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRegisterClick = async (gameId: string) => {
    setActionInProgress(gameId)
    try {
      // TODO: Implement Story Protocol registration flow
      console.log('Register game as IP:', gameId)
      // Show registration modal
    } finally {
      setActionInProgress(null)
    }
  }

  const handleToggleVisibility = async (gameId: string, isPrivate: boolean) => {
    setActionInProgress(gameId)
    try {
      // TODO: Implement visibility toggle via API
      console.log('Toggle visibility for game:', gameId, 'private:', isPrivate)
      setGames(games.map(g => g.id === gameId ? { ...g, private: isPrivate } : g))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteClick = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return
    }

    setActionInProgress(gameId)
    try {
      // TODO: Implement game deletion via API
      console.log('Delete game:', gameId)
      setGames(games.filter(g => g.id !== gameId))
    } finally {
      setActionInProgress(null)
    }
  }

  if (!isConnected) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 px-4 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold">My Games</h1>
              <Link
                href="/generate"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New Game
              </Link>
            </div>
            <p className="text-gray-400">
              Manage your created games, mint them as NFTs, and register them as IP assets.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading your games...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-300 mb-3">No games yet</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create your first game by pasting a Paragraph.xyz article URL. You can then mint it as an NFT or register it as an IP asset.
                </p>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Game
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-400 mb-6">
                  You have <span className="font-semibold text-white">{games.length}</span> game{games.length !== 1 ? 's' : ''}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.map((game) => (
                    <GameCardEnhanced
                      key={game.id}
                      game={game}
                      isUserGame={true}
                      onMintClick={() => handleMintClick(game.id)}
                      onRegisterClick={() => handleRegisterClick(game.id)}
                      onToggleVisibility={() => handleToggleVisibility(game.id, !game.private)}
                      onDeleteClick={() => handleDeleteClick(game.id)}
                      isLoading={actionInProgress === game.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
