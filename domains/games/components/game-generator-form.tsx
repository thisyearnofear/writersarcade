'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Loader2, Sparkles, Info, Lightbulb } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { ErrorCard } from '@/components/error/ErrorCard'
import { SuccessModal } from '@/components/success/SuccessModal'
import { getWriterCoinById } from '@/lib/writerCoins'
import { retryWithBackoff } from '@/lib/error-handler'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
}

export function GameGeneratorForm({ onGameGenerated }: GameGeneratorFormProps) {
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'story' | 'wordle'>('story')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [showCustomization, setShowCustomization] = useState(true)
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
  const isStoryMode = mode === 'story'
  if (!writerCoin) {
    return <div className="text-red-500">Error: Writer coin not configured</div>
  }

  const handlePaymentSuccess = async (_transactionHash: string) => {
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
      if (!url.trim()) {
        throw new Error('Please provide a Paragraph.xyz article URL')
      }
      setStepStatuses((prev) => ({ ...prev, validate: 'completed' }))

      setLoadingStep('extract')
      // Note: content extraction happens on the server during the fetch call
      setStepStatuses((prev) => ({ ...prev, extract: 'completed' }))

      setLoadingStep('generate')
       
       let lastError: Error | null = null
       let attempt = 0
       const maxAttempts = 3
       
       const result = await retryWithBackoff(
         async () => {
           attempt++
           
           const response = await fetch('/api/games/generate', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
            },
             body: JSON.stringify({
               url: url.trim(),
               mode,
               ...(isStoryMode && showCustomization && paymentApproved && {
                 customization: {
                   genre,
                   difficulty,
                 },
               }),
               ...(isStoryMode && paymentApproved && {
                 payment: {
                   writerCoinId: writerCoin.id,
                 },
               }),
               // Add attempt metadata for server-side agentic retry
               _attempt: attempt,
               _maxAttempts: maxAttempts,
             }),
           })

           // Handle network errors
           if (!response.ok) {
             const errorData = await response.json().catch(() => ({}))
             const errorMsg = 
               errorData.error || 
               `Generation failed (${response.status}): ${response.statusText}`
             
             lastError = new Error(errorMsg)
             
             // On validation or schema errors, log for retry insight
             if (response.status === 400) {
               console.warn(`Attempt ${attempt}/${maxAttempts} failed with validation error:`, errorMsg)
             }
             
             throw lastError
           }

           const result = await response.json()

           if (!result.success) {
             lastError = new Error(result.error || 'Failed to generate game')
             throw lastError
           }

           return result
         },
         2, // Max 2 retries for generation (plus initial attempt = 3 total)
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

    if (!url.trim()) {
      setError('Please provide a Paragraph.xyz article URL')
      return
    }

    // If customization requested in story mode, require payment
    if (isStoryMode && showCustomization && !isConnected) {
      setError('Please connect your wallet to use customization')
      setShowPayment(true)
      return
    }

    // If customization but not approved payment yet, show payment (story mode only)
    if (isStoryMode && showCustomization && !paymentApproved) {
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
          {/* Game Type Toggle with Arcade Styling */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Game Type</Label>
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Choose between Story (narrative adventure) or Wordle (word puzzle) game types
                </motion.div>
              </motion.div>
            </div>
            <div className="game-type-selector">
              <motion.button
                type="button"
                onClick={() => setMode('story')}
                className={`game-type-option ${mode === 'story' ? 'active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Story (5-panel)
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setMode('wordle')
                  // Wordle is free and does not use genre/difficulty customization yet
                  setShowCustomization(false)
                  setShowPayment(false)
                  setPaymentApproved(false)
                }}
                className={`game-type-option ${mode === 'wordle' ? 'active' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="text-black font-semibold">Wordle (beta)</span>
              </motion.button>
            </div>
            <p className="text-xs text-gray-400">
              Story creates a 5-panel narrative game. Wordle creates a free article-derived word puzzle.
            </p>
          </div>

          {/* URL Input with Typewriter Styling */}
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="url" className="text-sm font-medium">
                Paragraph.xyz Article URL
              </Label>
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <motion.div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Only Paragraph.xyz articles from supported authors are accepted. Check FAQ for full list.
                </motion.div>
              </motion.div>
            </div>
            <Input
              id="url"
              type="url"
              placeholder="https://paragraph.xyz/@author/article-title"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 typewriter-input"
              typewriter
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

          {/* Enhanced Customization Toggle with Progressive Disclosure */}
          {!isGenerating && isStoryMode && (
            <motion.div
              className="pt-4 border-t border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.button
                type="button"
                onClick={() => setShowCustomization(!showCustomization)}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2"
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: showCustomization ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {showCustomization ? '▼' : '▶'}
                </motion.span>
                Customize Game Style (Genre & Difficulty)
                <motion.div
                  className="relative group ml-2"
                  whileHover={{ scale: 1.1 }}
                >
                  <Info className="w-3 h-3 text-purple-300 cursor-help" />
                  <motion.div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 z-50 pointer-events-none"
                    initial={{ opacity: 0, y: 5 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Customize genre and difficulty for a unique experience (uses Writer Coins)
                  </motion.div>
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showCustomization && (
                  <motion.div
                    className="mt-4 space-y-4 p-4 bg-purple-900/30 rounded-lg border border-purple-600"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: 'hidden' }}
                  >
                    <motion.div
                      className="space-y-4"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span className="text-sm font-semibold text-purple-100">Enhanced Customization</span>
                      </div>

                      {/* Center the genre selector */}
                      <div className="flex justify-center">
                        <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                      </div>

                      <div className="flex justify-center">
                        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
                      </div>

                      <motion.div
                        className="p-3 rounded-lg bg-purple-800/50 border border-purple-500 text-sm text-purple-100 flex items-start gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-300" />
                        <span>Higher difficulty creates more complex narratives. Genre affects story tone and visual style.</span>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {error && (
          <ErrorCard
            error={error}
            context="game generation"
            onRetry={() => generateGame()}
            onDismiss={() => setError(null)}
            suggestions={[
              'Check that your Paragraph.xyz URL is valid and publicly accessible',
              'Ensure the URL is from a supported author',
              'Make sure your internet connection is stable',
            ]}
          />
        )}

        {/* Payment Section (shown when customization requested in story mode) */}
        {isStoryMode && showPayment && (
          <div className="space-y-4 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
            <h3 className="font-semibold text-purple-200">Enable Customization</h3>
            <p className="text-sm text-purple-100">
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
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 relative overflow-hidden"
              size="lg"
              arcade
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Game...
                  {/* Loading glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-lg opacity-0"
                    style={{
                      background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%)',
                      filter: 'blur(10px)',
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      opacity: { duration: 2, repeat: Infinity },
                      scale: { duration: 2, repeat: Infinity },
                    }}
                  />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isStoryMode
                    ? paymentApproved
                      ? 'Generate Custom Story Game'
                      : 'Create Story Game'
                    : 'Create Wordle Game'}
                </>
              )}
            </Button>
          </motion.div>
        )}
        </form>

      {/* Tips with Comic Book Styling */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-2">💡 Tips for better games:</h3>
        <ul className="comic-bubble text-sm text-gray-100 space-y-1">
          <li>• Paste URLs from Paragraph.xyz articles by supported authors</li>
          <li>• Choose genre and difficulty settings that match the article's tone</li>
          <li>• The AI will create unique game interpretations based on the article content</li>
          <li>• Different genres will influence how the story is gamified</li>
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
