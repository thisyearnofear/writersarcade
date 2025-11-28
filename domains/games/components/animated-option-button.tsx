'use client'

import { Loader2 } from 'lucide-react'

interface AnimatedOptionButtonProps {
  option: string
  optionId: number
  isSelected: boolean
  isWaiting: boolean
  primaryColor: string
  disabled: boolean
  onClick: () => void
}

export function AnimatedOptionButton({
  option,
  optionId,
  isSelected,
  isWaiting,
  primaryColor,
  disabled,
  onClick,
}: AnimatedOptionButtonProps) {
  const isLoading = isSelected && isWaiting

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-lg hover:shadow-current disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        borderColor: isSelected ? primaryColor : `${primaryColor}50`,
        backgroundColor: isSelected ? `${primaryColor}20` : `${primaryColor}08`,
        color: 'white',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = `${primaryColor}80`
          e.currentTarget.style.backgroundColor = `${primaryColor}15`
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = `${primaryColor}50`
          e.currentTarget.style.backgroundColor = `${primaryColor}08`
        }
      }}
    >
      {/* Top animated bar indicator */}
      <div
        className={`absolute top-0 left-0 right-0 transition-all duration-300 ${
          isSelected ? 'h-1' : 'h-0 group-hover:h-1'
        }`}
        style={{ backgroundColor: primaryColor }}
      />

      {/* Loading glow effect when waiting */}
      {isLoading && (
        <div
          className="absolute inset-0 rounded-lg opacity-50 animate-pulse"
          style={{
            backgroundColor: `${primaryColor}20`,
            boxShadow: `0 0 20px ${primaryColor}40`,
          }}
        />
      )}

      <div className="flex gap-3 items-center relative z-10">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200"
          style={{
            backgroundColor: isLoading ? primaryColor : `${primaryColor}70`,
            boxShadow: isLoading ? `0 0 12px ${primaryColor}60` : 'none',
          }}
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : optionId}
        </span>
        <span className="leading-snug font-medium text-sm flex-1">{option}</span>
      </div>
    </button>
  )
}
