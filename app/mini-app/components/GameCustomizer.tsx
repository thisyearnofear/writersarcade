'use client'

import { useState } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'
import { PaymentButton } from './PaymentButton'

interface GameCustomizerProps {
    writerCoin: WriterCoin
    articleUrl: string
    onBack: () => void
    onGameGenerated?: (game: any) => void
}

type Genre = 'horror' | 'comedy' | 'mystery'
type Difficulty = 'easy' | 'hard'

export function GameCustomizer({ writerCoin, articleUrl, onBack, onGameGenerated }: GameCustomizerProps) {
    const [genre, setGenre] = useState<Genre>('horror')
    const [difficulty, setDifficulty] = useState<Difficulty>('easy')
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [paymentApproved, setPaymentApproved] = useState(false)

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
            const response = await fetch('/api/mini-app/games/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    writerCoinId: writerCoin.id,
                    articleUrl,
                    genre,
                    difficulty,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to generate game')
            }

            const game = await response.json()
            onGameGenerated?.(game)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred'
            setError(message)
            setPaymentApproved(false)
            console.error('Error generating game:', err)
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
                <div>
                    <label className="mb-3 block text-sm font-medium text-purple-200">Genre</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['horror', 'comedy', 'mystery'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGenre(g)}
                                className={`rounded-lg border-2 px-4 py-3 font-medium capitalize transition-all ${
                                    genre === g
                                        ? 'border-purple-400 bg-purple-600/50 text-white'
                                        : 'border-purple-500/30 bg-white/5 text-purple-300 hover:border-purple-400 hover:bg-white/10'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty Selection */}
                <div>
                    <label className="mb-3 block text-sm font-medium text-purple-200">Difficulty</label>
                    <div className="grid grid-cols-2 gap-3">
                        {(['easy', 'hard'] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`rounded-lg border-2 px-4 py-3 font-medium capitalize transition-all ${
                                    difficulty === d
                                        ? 'border-purple-400 bg-purple-600/50 text-white'
                                        : 'border-purple-500/30 bg-white/5 text-purple-300 hover:border-purple-400 hover:bg-white/10'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cost Preview */}
                <div className="rounded-lg bg-purple-900/30 p-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-purple-300">Generation Cost:</span>
                            <span className="font-semibold text-purple-200">
                                {(Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-purple-600 pt-2">
                            <span className="text-purple-300">Writer Revenue (60%):</span>
                            <span className="font-semibold text-green-400">
                                {(
                                    (Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals) * 0.6
                                ).toFixed(0)} {writerCoin.symbol}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-4">
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                {/* Payment & Generation */}
                {!paymentApproved ? (
                    <PaymentButton
                        writerCoin={writerCoin}
                        action="generate-game"
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={(err) => setError(err)}
                        disabled={isGenerating}
                    />
                ) : (
                    <div className="rounded-lg bg-green-500/20 border border-green-500/50 p-4">
                        <p className="text-sm text-green-200">
                            ✅ Payment confirmed! Generating your game...
                        </p>
                    </div>
                )}

                {/* Info */}
                <div className="rounded-lg bg-purple-900/30 p-4">
                    <p className="text-xs text-purple-300">
                        💡 <span className="font-semibold">What happens next:</span> We'll analyze the article and generate an interactive game using AI. You can then mint it as an NFT on Base.
                    </p>
                </div>
            </div>
        </div>
    )
}
