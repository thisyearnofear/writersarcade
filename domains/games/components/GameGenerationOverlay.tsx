'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Loader2, Sparkles, Gamepad2, X, Lightbulb, BookOpen, Quote, CreditCard, Search, FileText, Save } from 'lucide-react'
import { ProgressBar } from '@/domains/games/components/ProgressBar'
import { useOverlay, OverlayPortal } from '@/components/ui/overlay'
import { TitleSequence, type TitleCard } from '@/components/generation/title-sequence'

type LoadingStep = 'payment' | 'validate' | 'extract' | 'generate' | 'save'
type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'

interface GameGenerationOverlayProps {
  isOpen: boolean
  currentStep: LoadingStep | null
  stepStatuses: Record<LoadingStep, StepStatus>
  genre?: string
  difficulty?: string
  onCancel?: () => void
  paymentExplorerUrl?: string | null
}

const SLOW_WARNING_MS = 45_000
const STALL_WARNING_MS = 90_000

const stepConfig: Record<LoadingStep, { label: string; icon: typeof CreditCard }> = {
  payment: { label: 'Payment Verified', icon: CreditCard },
  validate: { label: 'Validating Article', icon: Search },
  extract: { label: 'Extracting Content', icon: FileText },
  generate: { label: 'Crafting Your Game', icon: Sparkles },
  save: { label: 'Finalizing', icon: Save },
}

const CONTEXTUAL_TIPS = [
  {
    icon: <Lightbulb className="w-4 h-4 text-warning shrink-0" />,
    title: 'Did you know?',
    text: 'WritersArcade uses specialized AI models to maintain consistency across characters and styles in your story.',
  },
  {
    icon: <BookOpen className="w-4 h-4 text-info shrink-0" />,
    title: 'Author Trivia',
    text: 'Paragraph.xyz authors can earn rewards when users play games inspired by their articles.',
  },
  {
    icon: <Quote className="w-4 h-4 text-brand shrink-0" />,
    title: 'Writing Tip',
    text: 'Great interactive stories often give users 3 distinct choices: one safe, one risky, and one mysterious.',
  },
  {
    icon: <Sparkles className="w-4 h-4 text-brand shrink-0" />,
    title: 'Pro Tip',
    text: 'You can mint your finished comic as an NFT to preserve your unique playthrough forever.',
  },
]

const TIP_ROTATION_MS = 6_000

export function GameGenerationOverlay({
  isOpen,
  currentStep,
  stepStatuses,
  genre = 'story',
  difficulty = 'easy',
  onCancel,
  paymentExplorerUrl,
}: GameGenerationOverlayProps) {
  // Lock scroll while generating; Escape must NOT cancel — use the Cancel button.
  useOverlay(isOpen, () => {}, { closeOnEscape: false })

  const steps = ['payment', 'validate', 'extract', 'generate', 'save'] as const
  const currentStepIndex = currentStep ? steps.indexOf(currentStep) : -1
  const progress = currentStep ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  const [tipIndex, setTipIndex] = useState(0)
  const [showSlowWarning, setShowSlowWarning] = useState(false)
  const [showStallWarning, setShowStallWarning] = useState(false)
  const [titleCards, setTitleCards] = useState<TitleCard[]>([])
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Title cards for the loading reel — real artefact covers from the corpus.
  // Fetched once when the overlay opens; failures fall back to typographic
  // cards inside <TitleSequence>.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/title-cards')
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { cards?: TitleCard[] } }) => {
        if (!cancelled && body?.success && body.data?.cards?.length) {
          setTitleCards(body.data.cards)
        }
      })
      .catch(() => { /* reel falls back to typographic cards */ })
    return () => { cancelled = true }
  }, [isOpen])

  const backgroundParticles = useMemo(() => {
    let seed = 67890
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1920
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 1080
    return [...Array(12)].map((_, i) => ({
      id: i,
      initialX: seededRandom() * viewportW,
      initialY: seededRandom() * viewportH,
      animateY: seededRandom() * viewportH,
      duration: 3 + seededRandom() * 2,
    }))
  }, [])

  // The overlay stays mounted with isOpen=false — reset per-run state when
  // it opens (adjust-during-render keeps this lint-clean) and arm the timers
  // only while a generation is actually visible.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setTipIndex(0)
      setShowSlowWarning(false)
      setShowStallWarning(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % CONTEXTUAL_TIPS.length)
      }, TIP_ROTATION_MS)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    slowTimerRef.current = setTimeout(() => setShowSlowWarning(true), SLOW_WARNING_MS)
    stallTimerRef.current = setTimeout(() => setShowStallWarning(true), STALL_WARNING_MS)
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    }
  }, [isOpen])

  return (
    <OverlayPortal>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {backgroundParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-1 h-1 bg-brand/30 rounded-full"
                initial={{ x: particle.initialX, y: particle.initialY }}
                animate={{
                  y: [null, particle.animateY],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative z-10 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          >
            <div className="space-y-5 p-6">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand/15 border border-brand/30 mb-3">
                  <Gamepad2 className="w-7 h-7 text-brand" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Generating Your Game
                </h2>
                <p className="mt-1 text-sm text-muted-foreground capitalize">
                  {genre} · {difficulty}
                </p>
              </div>

              {/* Title sequence — real artefact covers flicking past while the
                  article is turned into a story. Gives the long wait a sense
                  of momentum and previews what the platform makes. */}
              <TitleSequence cards={titleCards} intervalMs={1800} />

              {/* Progress bar */}
              <div>
                <ProgressBar value={progress} label="Progress" percent />
                {paymentExplorerUrl && (
                  <p className="mt-2 text-center text-xs text-success">
                    Payment confirmed on-chain ·{' '}
                    <a
                      href={paymentExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2 hover:text-success"
                    >
                      View transaction ↗
                    </a>
                  </p>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const status = stepStatuses[step]
                  const config = stepConfig[step]
                  const isActive = currentStep === step
                  const Icon = config.icon
                  const isDone = status === 'completed'
                  const isError = status === 'error'

                  return (
                    <motion.div
                      key={step}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                        isDone
                          ? 'border-success/25 bg-success/10'
                          : isError
                          ? 'border-destructive/30 bg-destructive/10'
                          : isActive
                          ? 'border-brand/40 bg-brand/10'
                          : 'border-border/60'
                      }`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <span className="flex w-6 items-center justify-center">
                        {isDone ? (
                          <svg className="w-4 h-4 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                          </svg>
                        ) : isError ? (
                          <X className="w-4 h-4 text-destructive" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-brand animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className={`text-sm ${isActive || isDone ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {config.label}
                      </span>
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground/70">
                        {index + 1}/5
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Tips — rotating inline */}
              <div className="relative h-16 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    className="absolute inset-0 flex items-start gap-2.5 px-3.5 py-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                  >
                    <span className="mt-0.5">{CONTEXTUAL_TIPS[tipIndex].icon}</span>
                    <p className="text-xs leading-relaxed text-muted-foreground min-w-0">
                      <span className="font-semibold text-foreground">{CONTEXTUAL_TIPS[tipIndex].title}:</span>{' '}
                      {CONTEXTUAL_TIPS[tipIndex].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slow / stall warnings */}
              <AnimatePresence>
                {showStallWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-lg border border-warning/40 bg-warning/10 p-3.5"
                  >
                    <p className="text-sm text-warning mb-3">
                      This is taking longer than usual. The AI is still working, but you can stop it and try again.
                    </p>
                    {onCancel && (
                      <div className="flex justify-center">
                        <button
                          onClick={onCancel}
                          className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/25 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel generation
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
                {showSlowWarning && !showStallWarning && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Still crafting your game — this can take up to two minutes for longer articles.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Cancel link */}
              {!showStallWarning && onCancel && (
                <div className="flex justify-center">
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </OverlayPortal>
  )
}
