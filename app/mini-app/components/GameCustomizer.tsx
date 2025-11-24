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
  onGameGenerated?: (game: any) => void
}

export function GameCustomizer({ writerCoin, articleUrl, onBack, onGameGenerated }: GameCustomizerProps) {
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentApproved, setPaymentApproved] = useState(false)

  const cost = useMemo(() => {
    return PaymentCostService.calculateCost(writerCoin.id, 'generate-game')
  }, [writerCoin.id])

  const handlePaymentSuccess = async (transactionHash: string) => {
    setPaymentApproved(true)
    setError(null)

    // After payment succeeds, generate the game
    await generateGame()
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: articleUrl,
          customization: {
            genre,
            difficulty,
          },
          payment: {
            writerCoinId: writerCoin.id,
          },
        }),
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
      <p className="mb-6 text-purple-200">Choose genre and difficulty for your game</p>

      <div className="space-y-6">
        {/* Genre Selection */}
        <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />

        {/* Difficulty Selection */}
        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />

        {/* Cost Preview */}
        <CostPreview writerCoin={writerCoin} action="generate-game" showBreakdown />

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Payment & Generation */}
        {!paymentApproved ? (
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
