'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Search, Filter, Gamepad2, Compass, Zap, Brain, Sword, Store, ChevronLeft, ChevronRight } from 'lucide-react'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

const genres = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'Simulation', label: 'Simulation', icon: Store },
  { id: 'Adventure', label: 'Adventure', icon: Compass },
  { id: 'Action', label: 'Action', icon: Sword },
  { id: 'Strategy', label: 'Strategy', icon: Zap },
  { id: 'Puzzle', label: 'Puzzle', icon: Brain },
]

export default function GamesPage() {
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const [itemsPerPage] = useState(12)
  const [gameStats, setGameStats] = useState<{ publicGames: number, totalGames: number } | null>(null)

  // Fetch rudimentary stats for the header
  useEffect(() => {
    // We can't use GameDatabaseService directly in client component for data fetching 
    // strictly speaking if it accesses DB, but the previous code did it?
    // Wait, GameDatabaseService imports 'prisma' which is server-side only. 
    // The previous code in app/games/page.tsx likely caused a build error or was using a client-side wrapper?
    // Checking previous file content... it imported GameDatabaseService. 
    // If that file was running on client ('use client'), it would fail at runtime or build time unless GameDatabaseService is isomorphic 
    // (which it isn't, it imports prisma).
    // So the previous file was effectively broken if it was 'use client'.
    // I will NOT use GameDatabaseService here. I will just rely on GameGrid's onLoad or a separate API call if needed.
    // For now, I'll skip the stats header fetching to be safe and clean.

    // Actually, let's just use the onLoad from GameGrid to get the total count.
  }, [])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStatsLoad = (data: { total: number, count: number }) => {
    setTotalGames(data.total)
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen bg-black">
        <Header />

        <main className="flex-1">
          {/* Arcade Header */}
          <div className="relative py-12 px-4 border-b border-purple-900/30 bg-purple-950/10">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                The Arcade
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl">
                Discover unique games generated from your favorite articles.
                Play, compete, and own the experience.
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar Filters */}
              <aside className="lg:w-64 flex-shrink-0 space-y-8">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1) // Reset to page 1 on search
                    }}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
                  />
                </div>

                {/* Genre Filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Genres
                  </h3>
                  <div className="space-y-1">
                    {genres.map((genre) => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          setSelectedGenre(genre.id === 'all' ? undefined : genre.id)
                          setCurrentPage(1) // Reset to page 1 on filter
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${(selectedGenre === genre.id) || (!selectedGenre && genre.id === 'all')
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                          }`}
                      >
                        <genre.icon className="w-4 h-4" />
                        <span>{genre.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Game Grid Area */}
              <div className="flex-1">
                <GameGrid
                  key={`${selectedGenre}-${searchQuery}-${currentPage}`} // Force remount to show loading state properly
                  limit={itemsPerPage}
                  page={currentPage}
                  genre={selectedGenre}
                  search={searchQuery}
                  onLoad={handleStatsLoad}
                />

                {/* Pagination Controls */}
                {totalGames > 0 && (
                  <div className="mt-8 flex justify-center items-center gap-4 border-t border-gray-800 pt-8">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="text-gray-400 text-sm">
                      Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{Math.ceil(totalGames / itemsPerPage) || 1}</span>
                    </span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalGames / itemsPerPage)}
                      className="p-2 rounded-lg border border-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
