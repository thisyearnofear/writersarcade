'use client'

import { useState } from 'react'

export type GameDifficulty = 'easy' | 'hard'

const DIFFICULTIES = ['easy', 'hard'] as const

interface DifficultySelectorProps {
  value?: GameDifficulty
  onChange?: (difficulty: GameDifficulty) => void
  disabled?: boolean
}

export function DifficultySelector({
  value = 'easy',
  onChange,
  disabled = false,
}: DifficultySelectorProps) {
  const [selected, setSelected] = useState<GameDifficulty>(value)

  const handleSelect = (difficulty: GameDifficulty) => {
    if (disabled) return
    setSelected(difficulty)
    onChange?.(difficulty)
  }

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-purple-200">Difficulty</label>
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => handleSelect(difficulty)}
            disabled={disabled}
            className={`rounded-lg border-2 px-4 py-3 font-medium capitalize transition-all disabled:cursor-not-allowed ${
              selected === difficulty
                ? 'border-purple-400 bg-purple-600/50 text-white'
                : 'border-purple-500/30 bg-white/5 text-purple-100 hover:border-purple-400 hover:bg-white/10 disabled:hover:border-purple-500/30 disabled:hover:bg-white/5'
            }`}
          >
            {difficulty}
          </button>
        ))}
      </div>
    </div>
  )
}
