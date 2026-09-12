'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ChevronDown, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import { ComicPanelCard } from '../comic-panel-card'
import { ResonancePulse } from '@/components/daily-challenge/daily-gameplay-hud'
import { EpilogueGoalStrip } from '@/components/game/epilogue-goal-strip'
import { FinaleUnlocksStrip } from '@/components/game/finale-unlocks-strip'
import { PlayStatusBar } from '../play-status-bar'
import { PlayDetailsSheet } from '../play-details-sheet'
import { getModifierCategoryForPanel } from '@/lib/daily-challenge/daily-challenge-ui'
import {
  parseArticleUrlFromDualSource,
  parseBasePaintDayFromSource,
} from '@/lib/basepaint/source-url'
import type { Game, GameplayOption } from '../../types'
import type { ChatEntry, ChoiceFeedback } from '../../hooks/use-game-session'
import type { PanelVerdict } from '@/lib/daily-challenge/daily-challenge-client'
import { trackEvent } from '@/services/analytics'
import { RelatedPlayStrip } from '../related-play-strip'

 
const MAX_COMIC_PANELS = 5

interface GameplayScreenProps {
  game: Game
  messages: ChatEntry[]
  worldMood: { tension: number; chaos: number; hope: number }
  lastChoiceFeedback: ChoiceFeedback | null
  isWaitingForResponse: boolean
  pendingOptionId: number | null
  assistantMessageCount: number
  canAddMorePanels: boolean
  isGeneratingEpilogue: boolean
  userInput: string
  onUserInputChange: (value: string) => void
  onOptionClick: (option: GameplayOption) => void
  onImagesReady: () => void
  onImageRegenerate: (messageId: string, narrativeText: string, customPrompt?: string, theme?: string) => Promise<void>
  onImageRating: (messageId: string, rating: number) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  responseReady: { text: boolean; images: boolean }
  isRegenerating: string | null
  setShowComicFinale: (show: boolean) => void
  epilogueReflection: string | null
  epilogueGenerationFailed: boolean
  // UI Enhancements
  availableThemes: Array<{ name: string; value: string; label: string; description: string }>
  generateAIPromptSuggestions: (content: string) => string[]
  handleAIPromptSelect: (prompt: string) => void
  embedded?: boolean
  isDailyActive?: boolean
  /** Encrypted modifier handles from the on-chain session (for confidentiality indicator) */
  dailyModifierHandles?: string[]
  /** Encrypted score handle from the on-chain session */
  dailyScoreHandle?: string | null
  /**
   * Per-panel FHE verdicts (10 | 6 | 3 | 1) decrypted after each recorded
   * choice. Index matches the panel. Null entries fall back to the keyword
   * resonance pulse (older vault, ACL miss, or decrypt still in flight).
   */
  dailyPanelVerdicts?: (PanelVerdict | null)[]
  /** Leaderboard stats for competitive framing */
  dailyPlayerCount?: number
  dailyAverageScore?: number | null
  dailyTopScore?: number | null
  hasSecretEpilogue?: boolean
  hasMintedNft?: boolean
}

export function ChoiceFeedbackBanner({
  feedback,
  primaryColor = '#8b5cf6',
  isDailyActive = false,
}: {
  feedback: ChoiceFeedback
  primaryColor?: string
  isDailyActive?: boolean
}) {
  const labels = [
    { key: 'tension' as const, label: 'Tension', color: '#f87171' },
    { key: 'chaos' as const, label: 'Chaos', color: '#c084fc' },
    { key: 'hope' as const, label: 'Hope', color: '#34d399' },
  ]

  return (
    <div
      className="w-full max-w-5xl mb-4 rounded-lg border px-4 py-3"
      style={{ borderColor: `${primaryColor}35`, backgroundColor: `${primaryColor}08` }}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-white/80">Story signal from your choice</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {labels.map(({ key, label, color }) => {
          const value = feedback.delta[key]
          const positive = value > 0
          return (
            <span key={key} className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
              {positive ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>Likely direction: {positive ? 'more' : 'less'} {label.toLowerCase()} ({positive ? '+' : ''}{value})</span>
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        The direction is a story signal, not a score or penalty{isDailyActive ? '; your choices also contribute to the encrypted challenge result revealed at the finale.' : '.'}
      </p>
    </div>
  )
}

export function GameplayScreen({
  game,
  messages,
  worldMood,
  lastChoiceFeedback,
  isWaitingForResponse,
  pendingOptionId,
  assistantMessageCount,
  canAddMorePanels,
  isGeneratingEpilogue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUserInputChange,
  onOptionClick: onOptionClickRaw,
  onImagesReady,
  onImageRegenerate,
  onImageRating,
  messagesEndRef,
  responseReady,
  isRegenerating,
  setShowComicFinale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  epilogueReflection,
  epilogueGenerationFailed,
   
  availableThemes,
   
  generateAIPromptSuggestions,
   
  handleAIPromptSelect,
  embedded = false,
  isDailyActive = false,
  dailyModifierHandles,
  dailyScoreHandle,
  dailyPanelVerdicts = [],
  dailyPlayerCount = 0,
  dailyAverageScore = null,
  dailyTopScore = null,
  hasSecretEpilogue = false,
  hasMintedNft = false,
}: GameplayScreenProps) {

  const basePaintDay = parseBasePaintDayFromSource(game.articleUrl)

  // ── Daily challenge play pace timing ──────────────────────────────────────
  const [sessionStartTime] = useState(() => isDailyActive ? Date.now() : null)
  const [panelStartTime, setPanelStartTime] = useState<number | null>(() => isDailyActive ? Date.now() : null)
  const lastPanelCountRef = useRef(assistantMessageCount)

  // Reset panel timer when a new panel arrives
  useEffect(() => {
    if (isDailyActive && assistantMessageCount > lastPanelCountRef.current) {
      setPanelStartTime(Date.now()) // eslint-disable-line react-hooks/set-state-in-effect -- sync to external event
      lastPanelCountRef.current = assistantMessageCount
    }
  }, [assistantMessageCount, isDailyActive])

  // Track the most recent choice text for the resonance pulse
  const [lastChoiceTextState, setLastChoiceTextState] = useState('')
  const [showResonance, setShowResonance] = useState(false)

  // Show resonance pulse briefly after each choice feedback arrives
  useEffect(() => {
    if (!isDailyActive || !lastChoiceFeedback) return
    setShowResonance(true) // eslint-disable-line react-hooks/set-state-in-effect -- response to prop change
    const timeout = setTimeout(() => setShowResonance(false), 4000)
    return () => clearTimeout(timeout)
  }, [lastChoiceFeedback, isDailyActive])

  // Wrap onOptionClick to capture the choice text for the resonance pulse
  const onOptionClick = useCallback((option: GameplayOption) => {
    setLastChoiceTextState(option.text)
    onOptionClickRaw(option)
  }, [onOptionClickRaw])

  const dualArticleUrl = parseArticleUrlFromDualSource(game.articleUrl)
  const dualArticleTitle = dualArticleUrl
    ? (() => {
        try {
          const slug = new URL(dualArticleUrl).pathname.split('/').filter(Boolean).pop()
          return slug ? decodeURIComponent(slug).replace(/[-_]/g, ' ') : 'Featured article'
        } catch {
          return 'Featured article'
        }
      })()
    : null

  const handleViewComic = useCallback(() => {
    trackEvent('view_comic_clicked', {
      gameSlug: game.slug,
      panelCount: assistantMessageCount,
    })
    setShowComicFinale(true)
  }, [game.slug, assistantMessageCount, setShowComicFinale])

  const router = useRouter()

  // Keyboard shortcuts: 1-4 for choices and V for the complete comic
  useEffect(() => {
    const activeAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.options?.length)
    const options = activeAssistant?.options ?? []

    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLAnchorElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable) ||
        document.querySelector('[role="dialog"]')
      ) return
      const key = parseInt(e.key)
      if (!isWaitingForResponse && canAddMorePanels && key >= 1 && key <= 4 && options[key - 1]) {
        onOptionClick(options[key - 1])
        return
      }
      if (e.key === 'v' || e.key === 'V') {
        if (!isWaitingForResponse && !isGeneratingEpilogue && !canAddMorePanels) {
          handleViewComic()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [messages, onOptionClick, handleViewComic, isWaitingForResponse, isGeneratingEpilogue, canAddMorePanels])

  // Auto-scroll to bottom
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [messages, messagesEndRef])

  const showChoiceFeedback = Boolean(
    lastChoiceFeedback &&
    !isWaitingForResponse &&
    lastChoiceFeedback.panelIndex === assistantMessageCount - 1
  )
  const isTerminal = !canAddMorePanels
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div
      className="min-h-screen w-full flex flex-col animate-fade-in mobile-optimized relative"
      style={{
        background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}05, black)`,
      }}
    >
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className="space-y-4 text-center">
              <div className="loading-spinner mx-auto" />
              <p className="animate-pulse text-muted-foreground">Drawing the first panel…</p>
            </div>
            <RelatedPlayStrip game={game} density="wait" />
          </div>
        ) : (
          <div className="w-full min-h-full p-4 md:p-8 py-6 md:py-8 animate-slide-in">
            <main className="mx-auto flex w-full max-w-3xl flex-col items-center">
            <PlayStatusBar
              current={assistantMessageCount}
              accent={game.primaryColor || '#8b5cf6'}
              isDailyActive={isDailyActive}
              dailyPanelIndex={Math.max(0, assistantMessageCount - 1)}
              panelStartTime={panelStartTime}
              sessionStartTime={sessionStartTime}
              hiddenHandPanelsDone={assistantMessageCount}
              onOpenDetails={() => setDetailsOpen(true)}
            />
            {/* One-line unlock teaser — the motivational pull without the rails. */}
            {!isTerminal && hasSecretEpilogue && (
              <p className="mb-4 w-full max-w-5xl text-[11px] text-muted-foreground/70">
                Finish all {MAX_COMIC_PANELS} panels
                {hasMintedNft ? ' to unlock the secret epilogue.' : ' → secret epilogue, mint, and IP unlock.'}
              </p>
            )}
            {showChoiceFeedback && lastChoiceFeedback && (
              <ChoiceFeedbackBanner
                feedback={lastChoiceFeedback}
                primaryColor={game.primaryColor}
                isDailyActive={isDailyActive}
              />
            )}
            {isDailyActive && lastChoiceFeedback && (
              <ResonancePulse
                verdict={dailyPanelVerdicts[lastChoiceFeedback.panelIndex] ?? null}
                choiceText={lastChoiceTextState}
                panelIndex={lastChoiceFeedback.panelIndex}
                visible={showResonance}
              />
            )}
            {/* Ownership surfaces only appear once they're actionable. */}
            {isTerminal && hasSecretEpilogue && (
              <EpilogueGoalStrip
                panelsDone={assistantMessageCount}
                hasSecretEpilogue={hasSecretEpilogue}
                hasMintedNft={hasMintedNft}
                primaryColor={game.primaryColor}
              />
            )}
            {isTerminal && (
              <FinaleUnlocksStrip
                panelsDone={assistantMessageCount}
                primaryColor={game.primaryColor}
              />
            )}

            {/* Current Comic Panel */}
              <div className="w-full space-y-8">
                {messages.map((message, idx) => {
                  if (message.role !== 'assistant') return null

                  const isEpilogue = message.id.startsWith('epilogue-')

                  if (!isEpilogue) {
                    if (!message.options || message.options.length === 0) return null
                    const remainingMessages = messages.slice(idx + 1)
                    const hasLaterCompletedPanel = remainingMessages.some(m => m.role === 'assistant' && m.options && m.options.length > 0)
                    if (hasLaterCompletedPanel) return null
                  }

                  const imageReady = message.imageStatus === 'ready' || message.narrativeImage !== undefined
                  const panelIndex = messages
                    .slice(0, idx + 1)
                    .filter(m => m.role === 'assistant' && !m.id.startsWith('epilogue-')).length - 1

                  return (
                    <div key={message.id} className="animate-in fade-in duration-700 ease-out">
                      <ComicPanelCard
                        messageId={message.id}
                        narrativeText={isEpilogue ? `Epilogue: ${message.content}` : message.content}
                        genre={game.genre}
                        primaryColor={game.primaryColor || '#8b5cf6'}
                        options={isTerminal ? [] : (message.options || [])}
                        onOptionSelect={onOptionClick}
                        isWaiting={isWaitingForResponse}
                        onImageRating={(rating) => onImageRating(message.id, rating)}
                        onImagesReady={onImagesReady}
                        onImageRegenerate={(narrativeText, customPrompt, theme) =>
                          onImageRegenerate(message.id, narrativeText, customPrompt, theme)
                        }
                        isRegenerating={isRegenerating === message.id}
                        pendingOptionId={pendingOptionId}
                        responseReady={responseReady}
                        narrativeImage={message.narrativeImage || undefined}
                        imageStatus={message.imageStatus}
                        imageModel={message.imageModel}
                        shouldRevealContent={true}
                        showLoadingState={!imageReady && message.imageStatus === 'pending'}
                        availableThemes={availableThemes}
                        currentTheme={game.primaryColor || 'default'}
                        aiPromptSuggestions={generateAIPromptSuggestions(message.content)}
                        onAIPromptSelect={handleAIPromptSelect}
                        storyComplete={isTerminal}
                        isEpilogue={isEpilogue}
                        dailyModifierCategory={
                          isDailyActive && !isEpilogue && panelIndex >= 0
                            ? getModifierCategoryForPanel(panelIndex)
                            : undefined
                        }
                        basePaintDay={basePaintDay}
                        dualArticleTitle={dualArticleTitle}
                      />
                    </div>
                  )
                })}
              </div>

            {isWaitingForResponse ? (
              <RelatedPlayStrip game={game} density="wait" />
            ) : null}

            <div ref={messagesEndRef} className="h-8" />
          </main>
          <PlayDetailsSheet
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            messages={messages}
            worldMood={worldMood}
            isDailyActive={isDailyActive}
            panelsDone={assistantMessageCount}
            dailyModifierHandles={dailyModifierHandles}
            dailyScoreHandle={dailyScoreHandle}
            dailyPlayerCount={dailyPlayerCount}
            dailyAverageScore={dailyAverageScore}
            dailyTopScore={dailyTopScore}
          />
        </div>
        )}
      </div>

      {/* Input/CTA Area */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${game.primaryColor || '#8b5cf6'}10`,
        }}
      >
        <div className="w-full max-w-5xl mx-auto">
            {!canAddMorePanels && !isGeneratingEpilogue && (
              <div className="p-4 rounded-xl border text-sm sm:text-base" style={{ backgroundColor: `${game.primaryColor || '#8b5cf6'}10`, borderColor: game.primaryColor || '#8b5cf6' }}>
                <p className="font-semibold text-white">Story Complete</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Your story has concluded. View your comic and its reflection.
                </p>
              </div>
            )}

          {isGeneratingEpilogue && (
            <>
              <div className="p-5 rounded-xl border-2 text-sm text-center" style={{ backgroundColor: `${game.primaryColor || '#8b5cf6'}10`, borderColor: game.primaryColor || '#8b5cf6' }}>
                <div className="loading-spinner mx-auto mb-3 w-6 h-6" />
                <p className="font-semibold text-white">Weaving your story&apos;s reflection...</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Generating epilogue and connecting your choices to the source article.</p>
              </div>
              <RelatedPlayStrip game={game} density="wait" />
            </>
          )}

          {epilogueGenerationFailed && (
            <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.3)' }}>
              <p className="font-semibold text-red-300">Reflection unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">
                Couldn't generate an epilogue this time. Your comic is still ready to view.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              {embedded ? (
                !canAddMorePanels ? (
                  <a
                    href={`/generate?utm_source=embed&utm_campaign=${encodeURIComponent(game.slug)}&ref=embed_end`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    Turn any article into a game
                  </a>
                ) : (
                  <a
                    href={`/games/${game.slug}?utm_source=embed&utm_campaign=${game.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Open on WritersArcade
                  </a>
                )
              ) : (
                <button onClick={() => router.push('/games')} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                  Back to Games
                </button>
              )}
              {!canAddMorePanels && !isGeneratingEpilogue ? (
                <>
                    <button onClick={handleViewComic} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors" style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}>
                    <BookOpen className="w-4 h-4" />
                    View Comic
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

