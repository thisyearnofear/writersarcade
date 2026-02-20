'use client'

import { redirect } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getDisplayName, getAvatarUrl } from '@/lib/farcaster'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { UserPreferencesForm } from '@/domains/users/components/user-profile-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { AISettingsWrapper } from '@/components/settings/AISettingsWrapper'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userGames, setUserGames] = useState<any>({ games: [] })
  const [displayName, setDisplayName] = useState<string>('User')
  const [avatarUrl, setAvatarUrl] = useState<string>('/default-avatar.png')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        redirect('/')
        return
      }
      setUser(currentUser)
      
      // Fetch Farcaster profile
      const name = await getDisplayName(currentUser.walletAddress)
      const avatar = await getAvatarUrl(currentUser.walletAddress)
      setDisplayName(name || 'User')
      setAvatarUrl(avatar || '/default-avatar.png')
      
      // Get user's game statistics
      const games = await GameDatabaseService.getUserGames(currentUser.id, 100)
      setUserGames(games)
      
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full border-2 border-purple-500"
              />
              <div>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="text-gray-400">
                  Manage your account, preferences, and game creation settings
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Preferences Settings */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Game Preferences</h2>
                <UserPreferencesForm user={user} />
              </div>

              {/* The AISettingsWrapper will handle getting preferences client-side */}
              <AISettingsWrapper />

              {/* Stats */}
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet</span>
                    <span className="font-medium text-xs font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Games Created</span>
                    <span className="font-medium">{userGames.games.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Model</span>
                    <span className="font-medium">{user.preferredModel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User's Games */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Your Games</h2>
                <p className="text-gray-400">
                  {userGames.games.length === 0
                    ? "You haven't created any games yet. Start creating!"
                    : `You've created ${userGames.games.length} game${userGames.games.length === 1 ? '' : 's'}`
                  }
                </p>
              </div>

              {userGames.games.length > 0 ? (
                <div className="space-y-6">
                  {userGames.games.map((game: any) => (
                    <div
                      key={game.id}
                      className="bg-gray-800/50 rounded-lg border border-gray-700 p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
                          <p className="text-gray-400 mb-3">{game.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{game.genre} • {game.subgenre}</span>
                            <span>•</span>
                            <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{game.private ? 'Private' : 'Public'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`/games/${game.slug}`}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                          >
                            Play
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg border border-gray-700">
                  <p className="text-gray-400 mb-4">No games created yet</p>
                  <a
                    href="/generate"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                  >
                    Create Your First Game
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}