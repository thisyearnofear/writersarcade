'use client'

import { useState, useMemo } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { CostPreview } from '@/components/game/CostPreview'
import { PaymentFlow } from '@/components/game/PaymentFlow'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'

interface GameCustomizerProps {
  writerCoin: WriterCoin
  articleUrl: string
  onBack: () => void
  onGameGenerated?: (game: unknown) => void
}

export function GameCustomizer({ writerCoin, articleUrl, onBack, onGameGenerated }: GameCustomizerProps) {
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [mode, setMode] = useState<'story' | 'wordle'>('story')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentApproved, setPaymentApproved] = useState(false)

  const isStoryMode = mode === 'story'

  const cost = useMemo(() => {
    return PaymentCostService.calculateCost(writerCoin.id, 'generate-game')
  }, [writerCoin.id])

  const handlePaymentSuccess = async (_transactionHash: string) => {
    setPaymentApproved(true)
    setError(null)

    // After payment succeeds, generate the game
    await generateGame()
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const body =
        mode === 'wordle'
          ? {
              url: articleUrl,
              mode: 'wordle' as const,
            }
          : {
              url: articleUrl,
              customization: {
                genre,
                difficulty,
              },
              payment: {
                writerCoinId: writerCoin.id,
              },
            }

      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate game')
      }

      const game = await response.json()
      onGameGenerated?.(game.data || game)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setPaymentApproved(false)
      console.error('[GameCustomizer] Error generating game:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center space-x-2 text-purple-300 hover:text-purple-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      <h2 className="mb-2 text-2xl font-bold text-white">Customize Your Game</h2>
      <p className="mb-6 text-purple-200">Choose game type, then (optionally) genre and difficulty.</p>

      <div className="space-y-6">
        {/* Game Type Toggle */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex rounded-md bg-purple-950/60 border border-purple-700 p-1 w-fit">
            <button
              type="button"
              onClick={() => setMode('story')}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                mode === 'story' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
              }`}
            >
              Story (5-panel)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('wordle')
                setPaymentApproved(false)
              }}
              className={`ml-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                mode === 'wordle' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
              }`}
            >
              <span className="font-semibold">Wordle (beta, free)</span>
            </button>
          </div>
          <p className="text-xs text-purple-200">
            Story uses writer coins for customization. Wordle is a free article-derived word puzzle during beta.
          </p>
        </div>

        {/* Genre & Difficulty Selection (story mode only) */}
        {isStoryMode && (
          <>
            <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />

            {/* Difficulty Selection */}
            <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />

            {/* Cost Preview */}
            <CostPreview writerCoin={writerCoin} action="generate-game" showBreakdown />
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Payment & Generation (story mode) */}
        {isStoryMode && (
          !paymentApproved ? (
            <PaymentFlow
              writerCoin={writerCoin}
              action="generate-game"
              costFormatted={cost.amountFormatted}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating}
            />
          ) : (
            <div className="rounded-lg border border-green-500/50 bg-green-500/20 p-4">
              <p className="text-sm text-green-200">✅ Payment confirmed! Generating your game...</p>
            </div>
          )
        )}

        {/* Wordle generation (free) */}
        {!isStoryMode && (
          <button
            type="button"
            onClick={generateGame}
            disabled={isGenerating}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            {isGenerating ? 'Creating Wordle…' : 'Create Wordle Game'}
          </button>
        )}

        {/* Info */}
        <div className="rounded-lg bg-purple-900/30 p-4">
          <p className="text-xs text-purple-300">
            💡 <span className="font-semibold">What happens next:</span> We'll analyze the article and
            generate an interactive game using AI. You can then mint it as an NFT on Base.
          </p>
        </div>
      </div>
    </div>
  )
}
