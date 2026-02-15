'use client'

import { radioCardClass } from './radioCard'

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
  const selected = value

  const handleSelect = (difficulty: GameDifficulty) => {
    if (disabled) return
    onChange?.(difficulty)
  }

  return (
    <div role="radiogroup" aria-label="Difficulty">
      <label className="mb-3 block text-sm font-medium text-purple-200">Difficulty</label>
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            onClick={() => handleSelect(difficulty)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(difficulty) }
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const idx = DIFFICULTIES.indexOf(selected); const next = DIFFICULTIES[(idx + 1) % DIFFICULTIES.length]; handleSelect(next) }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const idx = DIFFICULTIES.indexOf(selected); const prev = DIFFICULTIES[(idx - 1 + DIFFICULTIES.length) % DIFFICULTIES.length]; handleSelect(prev) }
            }}
            role="radio"
            aria-checked={selected === difficulty}
            tabIndex={selected === difficulty ? 0 : -1}
            disabled={disabled}
            className={radioCardClass(selected === difficulty, disabled)}
>
            <span className="text-sm capitalize">{difficulty}</span>
            <span className="text-[11px] text-purple-300/80">{DIFFICULTY_COPY[difficulty]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
