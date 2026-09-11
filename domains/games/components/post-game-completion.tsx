'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Gamepad2, Sparkles, Trophy, BarChart3, ExternalLink, FileText, Image as ImageIcon, Link2, Check, QrCode, Download, Loader2, CalendarDays, ArrowUpRight, ChevronDown } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Game } from '../types'
import type { ChatEntry } from '../hooks/use-game-session'
import type { ComicBookFinalePanelData } from './comic-book-finale'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { useToast } from '@/components/ui/use-toast'
import { SecretEpilogueFinaleCta } from '@/components/game/secret-epilogue-finale-cta'
import { useVideoStatus } from '../hooks/use-video-status'
import { resolveBasePaintDay } from '@/components/basepaint/basepaint-finale-attribution'
import { DualSourceCredits } from '@/components/basepaint/dual-source-credits'
import { loadDailyChallengeState } from '@/lib/daily-challenge/daily-challenge-client'
import { config, logger } from '@/lib/config'
import { RelatedPlayStrip } from './related-play-strip'

interface PostGameCompletionProps {
  game: Game
  messages: ChatEntry[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  showEpilogueCta?: boolean
  endingStats?: { totalRuns: number; samePathRuns: number; uniquePath: boolean } | null
  onClaimFilm?: (panelData?: ComicBookFinalePanelData[]) => void | Promise<void>
  isClaimingFilm?: boolean
}

export function PostGameCompletion({ game, messages, userChoices, showEpilogueCta = true, endingStats, onClaimFilm, isClaimingFilm }: PostGameCompletionProps) {
  const { toast } = useToast()
  const [playCount, setPlayCount] = useState<number | null>(null)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const { panels: videoPanels, montageVideoUrl, status: videoStatus } = useVideoStatus(game.slug)

  const copyWithFeedback = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      setTimeout(() => setCopiedFormat((prev) => (prev === format ? null : prev)), 2000)
    } catch {
      setCopiedFormat(null)
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true)

    try {
      const response = await fetch(`/api/games/${game.slug}/pdf`)
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${game.slug}-comic.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      logger.error('PDF export failed:', err)
      toast({
        title: 'PDF export failed',
        description: 'Could not generate the PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setPdfLoading(false)
    }
  }

  // Fetch play count for social proof
  useEffect(() => {
    fetch('/api/games/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPlayCount(d.data.publicGames)
      })
      .catch(() => {})
  }, [])

  const panelCount = messages.filter(m => m.role === 'assistant').length
  const totalChoices = userChoices.length

  const basePaintDay = useMemo(() => {
    const dailyDay =
      config.features.dailyChallenge && typeof window !== 'undefined'
        ? loadDailyChallengeState()?.day
        : undefined
    return resolveBasePaintDay(game.articleUrl, dailyDay)
  }, [game.articleUrl])

  const baseUrl =
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL) || `https://writersarcade.vercel.app`
  // When a panel clip exists, share lands on the watch surface (the run
  // replays as video, then hands off to play). Otherwise straight to play.
  const hasVideo = videoPanels.some((p) => Boolean(p.videoUrl))
  const gameUrl = `${baseUrl}/games/${game.slug}?${hasVideo ? 'watch=1' : 'play=1'}`

  const markdownStory = useMemo(() => {
    let md = `# ${game.title}\n\n_${game.description}_\n\n`
    messages.forEach((m) => {
      if (m.role === 'assistant') {
        md += `## ${m.id.startsWith('epilogue') ? 'Epilogue' : 'Scene'}\n${m.content}\n\n`
      }
    })
    if (userChoices.length > 0) {
      md += `## Your choices\n\n`
      userChoices.forEach((c, i) => {
        md += `${i + 1}. ${c.choice}\n`
      })
      md += '\n'
    }
    md += `Play at ${gameUrl}\n`
    return md
  }, [game.title, game.description, messages, userChoices, gameUrl])

  const lastChoice = userChoices[userChoices.length - 1]?.choice
  const truncatedChoice = lastChoice && lastChoice.length > 80 ? `${lastChoice.slice(0, 80)}…` : lastChoice
  const endingText = truncatedChoice
    ? `I made a choice that changed "${game.title}": ${truncatedChoice}`
    : `I just finished "${game.title}" on WritersArcade`

  // Honest rarity — only claimed when there's a real base of runs to compare.
  // Unique path needs ≥3 runs; a percentage claim needs ≥5.
  const rarityText = useMemo(() => {
    if (!endingStats) return null
    const { totalRuns, samePathRuns, uniquePath } = endingStats
    if (uniquePath && totalRuns >= 3) {
      return `You're the only player who's taken this exact path — 1 of ${totalRuns} runs.`
    }
    if (totalRuns >= 5) {
      const pct = Math.round((samePathRuns / totalRuns) * 100)
      if (pct <= 30) return `Only ${pct}% of players found this ending.`
    }
    return null
  }, [endingStats])

  const referralText = `Play "${game.title}" and make your own choices — every run can end differently.`
  const filmUrl = montageVideoUrl ?? (game.montageVideoUrl?.startsWith('http') ? game.montageVideoUrl : null)
  const filmRendering = !filmUrl && (videoStatus === 'pending' || (videoStatus === 'completed' && videoPanels.length >= 2 && videoPanels.every((p) => p.videoUrl)))
  const heroVideoUrl = filmUrl ?? videoPanels.find((panel) => panel.videoUrl)?.videoUrl ?? null

  const shareData = useMemo(
    () => ({
      title: game.title,
      text: `${endingText} ${rarityText ?? referralText}`,
      url: gameUrl,
      genre: game.genre,
      panelCount,
      gameTitle: game.title,
      author: game.authorParagraphUsername || undefined,
      videoUrl: heroVideoUrl,
    }),
    [game.title, game.genre, game.authorParagraphUsername, endingText, rarityText, referralText, gameUrl, panelCount, heroVideoUrl]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto px-4 pb-16"
    >
      {/* Celebration header */}
      <div className="text-center space-y-4 mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Story Complete
          </h2>
          <p className="text-muted-foreground text-sm">
            You finished &ldquo;{game.title}&rdquo; — a {game.genre} journey through {panelCount} panels
          </p>
        </div>
      </div>

      {/* Viral share card: the emotional payoff and social action come before
          ownership, export, or other optional paths. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              {heroVideoUrl ? 'Share your animated ending' : 'Share your ending'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {endingText}
            </p>
            {rarityText && (
              <p className="mt-2 text-xs font-bold text-amber-300">{rarityText}</p>
            )}
            <p className="mt-2 text-xs font-medium text-purple-200/80">{referralText}</p>
          </div>
          <ShareDropdown
            data={shareData}
            surface="post_game_completion"
            variant="default"
            size="default"
            buttonClassName="shrink-0 bg-white text-black hover:bg-white/90"
          />
        </div>
      </motion.div>

      {/* The film: the run's peak-end artifact. Auto-generated after a
          completed run — free to watch and share; claiming = minting the game
          (the film ships as the NFT's animation_url). */}
      {(filmUrl || filmRendering) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
          className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-5 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white mb-1">
                {filmUrl ? 'Your film is ready' : 'Your film is rendering'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {filmUrl
                  ? 'Your run as a continuous film — every scene resolves into the next.'
                  : 'We\'re turning your run into a continuous film — it lands here shortly.'}
              </p>
            </div>
            {filmUrl && (
              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href={`/games/${game.slug}?watch=1`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-white/90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Watch it
                </Link>
                {!game.nftTokenId && onClaimFilm && (
                  <button
                    type="button"
                    onClick={() =>
                      void onClaimFilm(
                        messages
                          .filter((m) => m.role === 'assistant' && !m.id.startsWith('epilogue'))
                          .map((m, i) => ({
                            id: m.id,
                            narrativeText: m.content,
                            imageUrl: m.narrativeImage ?? null,
                            imageModel: m.imageModel ?? 'unknown',
                            userChoice: userChoices.find((c) => c.panelIndex === i + 1)?.choice,
                            audioUrl: null,
                          }))
                      )
                    }
                    disabled={isClaimingFilm}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    {isClaimingFilm ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
                    {isClaimingFilm ? 'Claiming…' : 'Claim your film'}
                  </button>
                )}
              </div>
            )}
            {filmRendering && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-300" />}
          </div>
        </motion.div>
      )}

      {showEpilogueCta && (
        <SecretEpilogueFinaleCta game={game} nftMinted={Boolean(game.nftTokenId)} className="mb-8" />
      )}

      <RelatedPlayStrip game={game} density="finale" className="mb-8 px-0 py-0" />

      {/* Post-completion referral loop: secondary actions stay reachable but
          collapsed, so the completion view leads with one primary action. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.37, duration: 0.4 }}
        className="mb-8 space-y-3"
      >
        <details className="group rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <summary className="flex cursor-pointer list-none select-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <CalendarDays className="h-5 w-5 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Keep the loop going</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Come back tomorrow for a fresh Daily Challenge, or invite someone to play this story and compare endings.</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/basepaint" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-amber-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Open Daily Challenge
            </Link>
            <Link href="/generate" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10">
              Make your own story <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </details>

        {/* Export card — collapsed by default */}
        <details className="group rounded-2xl border border-white/10 bg-card p-5">
          <summary className="flex cursor-pointer list-none select-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Export your story</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Markdown, link, QR code, PDF, or the cover image.</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <button
              onClick={() => copyWithFeedback(markdownStory, 'markdown')}
              className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
            >
              {copiedFormat === 'markdown' ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
              {copiedFormat === 'markdown' ? 'Copied' : 'Markdown'}
            </button>
            <button
              onClick={() => copyWithFeedback(gameUrl, 'link')}
              className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
            >
              {copiedFormat === 'link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-muted-foreground" />}
              {copiedFormat === 'link' ? 'Copied' : 'Link'}
            </button>
            <button
              onClick={() => setShowQr((prev) => !prev)}
              className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
            >
              <QrCode className="w-4 h-4 text-muted-foreground" />
              {showQr ? 'Hide QR' : 'QR Code'}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Download className="w-4 h-4 text-muted-foreground" />}
              {pdfLoading ? 'Saving...' : 'PDF'}
            </button>
            <a
              href={game.imageUrl || gameUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors ${!game.imageUrl ? 'pointer-events-none opacity-50' : ''}`}
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              {game.imageUrl ? 'Image' : 'No Image'}
            </a>
          </div>
        {showQr && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-4"
          >
            <QRCodeSVG value={gameUrl} size={160} bgColor="transparent" fgColor="#ffffff" level="M" />
            <p className="text-xs text-muted-foreground text-center break-all max-w-[200px]">{gameUrl}</p>
          </motion.div>
        )}
        </details>
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3.5 text-sm font-bold text-white hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Gamepad2 className="w-4 h-4" />
            Play another story
          </Link>
          <Link
            href="/generate"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-5 py-3.5 text-sm font-bold text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Create your own game
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {game.authorParagraphUsername && (
            <Link
              href={`/writers/${game.writerCoinId || ''}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              More from @{game.authorParagraphUsername}
            </Link>
          )}

        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
      >
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{panelCount}</p>
          <p className="text-xs text-muted-foreground">Panels played</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{totalChoices}</p>
          <p className="text-xs text-muted-foreground">Choices made</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {playCount !== null ? `${playCount}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Games created</p>
        </div>
      </motion.div>

      {/* Source attribution — paired writer + canvas when dual */}
      {(basePaintDay != null ||
        (game.articleUrl && !game.articleUrl.startsWith('basepaint://'))) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-6 mx-auto max-w-lg"
        >
          <DualSourceCredits
            articleUrl={game.articleUrl}
            basePaintDay={basePaintDay}
            primaryColor={game.primaryColor || '#a78bfa'}
            variant="full"
          />
        </motion.div>
      )}

    </motion.div>
  )
}
