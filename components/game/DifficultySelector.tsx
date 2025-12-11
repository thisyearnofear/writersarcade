'use client'

import { useState } from 'react'

export type GameDifficulty = 'easy' | 'hard'

const DIFFICULTIES = ['easy', 'hard'] as const
const DIFFICULTY_COPY: Record<GameDifficulty, string> = {
  easy: 'Faster progression',
  hard: 'Deeper branches',
}

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
            className={`rounded-xl border-2 px-4 py-4 sm:px-5 sm:py-5 font-medium capitalize transition-all disabled:cursor-not-allowed ${
              selected === difficulty
                ? 'border-purple-400 bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                : 'border-purple-700 bg-black/30 text-purple-200 hover:border-purple-400 hover:bg-purple-900/40 disabled:hover:border-purple-700 disabled:hover:bg-black/30'
            } hover:translate-y-[-1px] active:translate-y-[0px]`}
>
            <span className="text-sm capitalize">{difficulty}</span>
            <span className="text-[11px] text-purple-300/80">{DIFFICULTY_COPY[difficulty]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
