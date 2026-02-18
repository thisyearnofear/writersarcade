'use client'

import { useState } from 'react'
import { GameGrid } from '@/domains/games/components/game-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Search, Filter, Gamepad2, Compass, Zap, Brain, Sword, Store, ChevronLeft, ChevronRight, X } from 'lucide-react'

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
  /** Mobile filter drawer open state */
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // Total count is supplied by GameGrid's onLoad callback — no need for
  // a separate DB call here (which would require Prisma on the client).

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

          {/* ── Mobile: search bar + Filter button row ── (hidden on lg+) */}
          <div className="lg:hidden px-4 pt-4 pb-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
              />
            </div>
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:border-purple-500 transition-colors"
              aria-label="Open genre filters"
            >
              <Filter className="w-4 h-4" />
              {selectedGenre ?? 'Genres'}
            </button>
          </div>

          {/* ── Mobile filter drawer ── */}
          {filterDrawerOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                onClick={() => setFilterDrawerOpen(false)}
                aria-hidden="true"
              />
              {/* Slide-up panel */}
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950 border-t border-gray-800 rounded-t-2xl p-6 lg:hidden animate-slide-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Genres
                  </h3>
                  <button
                    onClick={() => setFilterDrawerOpen(false)}
                    className="p-1 text-gray-400 hover:text-white"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => {
                        setSelectedGenre(genre.id === 'all' ? undefined : genre.id)
                        setCurrentPage(1)
                        setFilterDrawerOpen(false)
                      }}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        (selectedGenre === genre.id) || (!selectedGenre && genre.id === 'all')
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                          : 'text-gray-400 bg-gray-900 border border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <genre.icon className="w-4 h-4" />
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Desktop sidebar — hidden on mobile */}
              <aside className="hidden lg:block lg:w-64 flex-shrink-0 space-y-8">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-600"
                  />
                </div>
                {/* Genre Filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Genres
                  </h3>
                  <div className="space-y-1">
                    {genres.map((genre) => (
                      <button
                        key={genre.id}
                        onClick={() => { setSelectedGenre(genre.id === 'all' ? undefined : genre.id); setCurrentPage(1) }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                          (selectedGenre === genre.id) || (!selectedGenre && genre.id === 'all')
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
                  key={`${selectedGenre}-${searchQuery}-${currentPage}`}
                  limit={itemsPerPage}
                  page={currentPage}
                  genre={selectedGenre}
                  search={searchQuery}
                  onLoad={handleStatsLoad}
                />

                {/* Pagination */}
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
                      Page <span className="text-white font-medium">{currentPage}</span>
                      {' '}of{' '}
                      <span className="text-white font-medium">{Math.ceil(totalGames / itemsPerPage) || 1}</span>
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
