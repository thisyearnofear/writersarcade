'use client'

import { useState } from 'react'

export type GameGenre = 'horror' | 'comedy' | 'mystery'

const GENRES = ['horror', 'comedy', 'mystery'] as const

interface GenreSelectorProps {
  value?: GameGenre
  onChange?: (genre: GameGenre) => void
  disabled?: boolean
}

export function GenreSelector({ value = 'horror', onChange, disabled = false }: GenreSelectorProps) {
  const [selected, setSelected] = useState<GameGenre>(value)

  const handleSelect = (genre: GameGenre) => {
    if (disabled) return
    setSelected(genre)
    onChange?.(genre)
  }

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-purple-200">Genre</label>
      <div className="grid grid-cols-3 gap-3">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => handleSelect(genre)}
            disabled={disabled}
            className={`rounded-lg border-2 px-4 py-3 font-medium capitalize transition-all disabled:cursor-not-allowed ${
              selected === genre
                ? 'border-purple-400 bg-purple-600/50 text-white'
                : 'border-purple-500/30 bg-white/5 text-purple-300 hover:border-purple-400 hover:bg-white/10 disabled:hover:border-purple-500/30 disabled:hover:bg-white/5'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
    </div>
  )
}
