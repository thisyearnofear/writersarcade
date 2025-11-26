'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Loader2, Sparkles } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { ErrorCard } from '@/components/error/ErrorCard'
import { SuccessModal } from '@/components/success/SuccessModal'
import { getWriterCoinById } from '@/lib/writerCoins'
import { retryWithBackoff } from '@/lib/error-handler'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: any) => void
}

export function GameGeneratorForm({ onGameGenerated }: GameGeneratorFormProps) {
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [url, setUrl] = useState('')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [showCustomization, setShowCustomization] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    gameSlug: string
    title: string
  } | null>(null)

  // Loading step states
  type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
  type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'
  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null)
  const [stepStatuses, setStepStatuses] = useState<Record<LoadingStep, StepStatus>>({
    validate: 'pending',
    extract: 'pending',
    generate: 'pending',
    save: 'pending',
  })

  const writerCoin = getWriterCoinById('avc') // Default to AVC for web app
  if (!writerCoin) {
    return <div className="text-red-500">Error: Writer coin not configured</div>
  }

  const handlePaymentSuccess = async (transactionHash: string) => {
    setPaymentApproved(true)
    setError(null)
    await generateGame()
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      setLoadingStep('validate')
      
      // Validate input
      if (!promptText.trim() && !url.trim()) {
        throw new Error('Please provide either text or a URL')
      }
      setStepStatuses((prev) => ({ ...prev, validate: 'completed' }))

      setLoadingStep('extract')
      // Note: content extraction happens on the server during the fetch call
      setStepStatuses((prev) => ({ ...prev, extract: 'completed' }))

      setLoadingStep('generate')
      const result = await retryWithBackoff(
        async () => {
          const response = await fetch('/api/games/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              promptText: promptText.trim() || undefined,
              url: url.trim() || undefined,
              ...(showCustomization && paymentApproved && {
                customization: {
                  genre,
                  difficulty,
                },
              }),
              ...(paymentApproved && {
                payment: {
                  writerCoinId: writerCoin.id,
                },
              }),
            }),
          })

          // Handle network errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              errorData.error || 
              `Generation failed (${response.status}): ${response.statusText}`
            )
          }

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Failed to generate game')
          }

          return result
        },
        2, // Max 2 retries for generation
        2000 // 2 second base delay
      )
      setStepStatuses((prev) => ({ ...prev, generate: 'completed' }))

      setLoadingStep('save')
      // Game is already saved on server, just mark as complete
      setStepStatuses((prev) => ({ ...prev, save: 'completed' }))

      // Show success modal
      setSuccessData({
        gameSlug: result.data.slug,
        title: result.data.title || 'Your Game',
      })

      onGameGenerated?.(result.data)

      // Reset form
      setPromptText('')
      setUrl('')
      setPaymentApproved(false)
      setShowPayment(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setPaymentApproved(false)
      
      // Mark current step as failed
      if (loadingStep) {
        setStepStatuses((prev) => ({ ...prev, [loadingStep]: 'error' }))
      }
      
      console.error('Error generating game:', err)
    } finally {
      setIsGenerating(false)
      setLoadingStep(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!promptText.trim() && !url.trim()) {
      setError('Please provide either text or a URL')
      return
    }

    // If customization requested, require payment
    if (showCustomization && !isConnected) {
      setError('Please connect your wallet to use customization')
      setShowPayment(true)
      return
    }

    // If customization but not approved payment yet, show payment
    if (showCustomization && !paymentApproved) {
      setShowPayment(true)
      return
    }

    // Otherwise generate normally
    await generateGame()
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <Label htmlFor="url" className="text-sm font-medium">
              Article URL (Newsletter, Blog, etc.)
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://substack.com/... or https://medium.com/... or https://blog.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="text-sm text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Text Input */}
          <div>
            <Label htmlFor="promptText" className="text-sm font-medium">
              Describe your game idea
            </Label>
            <Textarea
              id="promptText"
              placeholder="E.g., 'A space detective solving a murder mystery' or 'Medieval kingdom building adventure'..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="mt-1 min-h-[120px] resize-none"
            />
          </div>

          {/* Loading Progress */}
          {isGenerating && (
            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-600/30 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <h3 className="text-lg font-semibold text-white">Creating your game</h3>
                </div>
                <p className="text-sm text-gray-400 ml-8">This may take 30-60 seconds</p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {(['validate', 'extract', 'generate', 'save'] as const).map((step, index) => {
                  const status = stepStatuses[step]
                  const stepLabel = {
                    validate: 'Validating input...',
                    extract: 'Extracting article content...',
                    generate: 'Generating game with AI...',
                    save: 'Saving game...',
                  }[step]

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          status === 'error'
                            ? 'bg-red-900/50 border border-red-500'
                            : status === 'completed'
                            ? 'bg-purple-900/50 border border-purple-500'
                            : status === 'in-progress'
                            ? 'bg-purple-600 border border-purple-400'
                            : 'bg-gray-700 border border-gray-600'
                        }`}
                      >
                        {status === 'error' ? (
                          <span className="text-xs text-red-400">✕</span>
                        ) : status === 'completed' ? (
                          <span className="text-xs text-purple-300">✓</span>
                        ) : status === 'in-progress' ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <span className="text-xs text-gray-500">{index + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm transition-colors ${
                          status === 'in-progress'
                            ? 'text-purple-300 font-medium'
                            : status === 'completed'
                            ? 'text-gray-300'
                            : status === 'error'
                            ? 'text-red-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {stepLabel}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Progress Bar */}
              <ProgressBar
                value={
                  ((['validate', 'extract', 'generate', 'save'] as const).findIndex(
                    (s) => s === loadingStep
                  ) +
                    1) /
                  4 *
                  100
                }
                label="Progress"
                percent
              />
            </div>
          )}

          {/* Customization Toggle */}
          {!isGenerating && (
            <div className="pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowCustomization(!showCustomization)}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2"
              >
                <span>{showCustomization ? '▼' : '▶'}</span>
                Customize Game Style (Optional - Genre & Difficulty)
              </button>

              {showCustomization && (
                <div className="mt-4 space-y-4 p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
                  <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                  <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <ErrorCard
            error={error}
            context="game generation"
            onRetry={() => generateGame()}
            onDismiss={() => setError(null)}
            suggestions={[
              'Check that your URL is valid and publicly accessible',
              'Try pasting article text directly instead of a URL',
              'Make sure your internet connection is stable',
            ]}
          />
        )}

        {/* Payment Section (shown when customization requested) */}
        {showPayment && (
          <div className="space-y-4 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
            <h3 className="font-semibold text-purple-200">Enable Customization</h3>
            <p className="text-sm text-purple-300">
              Connect your wallet and approve payment to unlock genre/difficulty customization. You can generate games for free without payment.
            </p>
            <PaymentOption
              writerCoin={writerCoin}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating}
              optional={true}
              onSkip={() => {
                setShowPayment(false)
                setShowCustomization(false)
                generateGame()
              }}
            />
          </div>
        )}

        {!showPayment && (
          <Button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Game...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {paymentApproved ? 'Generate Custom Game' : 'Create Game'}
              </>
            )}
          </Button>
        )}
        </form>

      {/* Tips */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-2">💡 Tips for better games:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Paste URLs from Substack, Medium, blogs, or news articles</li>
          <li>• Describe specific themes, genres, or characters you want</li>
          <li>• Try: "A cyberpunk detective story" or "Medieval fantasy adventure"</li>
          <li>• The AI will create unique interpretations of your content</li>
          <li>• Customize genre and difficulty for more control over game generation</li>
        </ul>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={!!successData}
        onClose={() => setSuccessData(null)}
        title="Game Created Successfully! 🎉"
        description="Your AI-generated game is ready to play. Share it with your community and mint it as an NFT."
        gameSlug={successData?.gameSlug}
        action="generate"
      />
    </div>
  )
}