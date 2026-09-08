'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  GalleryHorizontalEnd,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PlayTrendChart = dynamic(
  () => import('@/components/ui/play-trend-chart').then(m => m.PlayTrendChart),
  { ssr: false }
)

import type { Game, SavedGamePanel } from '../types'
import { getWriterCoinById, MUSD_CONFIG } from '@/lib/writer-coins'
import { parsePanel, pullQuote } from '../utils/text-parser'
import { coverFocalClass, getPanelMedia } from '../utils/artifact-media'
import { RelatedPlayStrip } from './related-play-strip'

interface GameArtifactViewProps {
  game: Game
}

function shortAddress(value?: string | null) {
  if (!value) return 'Unknown'
  if (!value.startsWith('0x') || value.length < 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function formatDate(value?: Date) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function hostnameLabel(url?: string | null) {
  if (!url) return '—'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getTokenLabel(game: Game) {
  if (!game.writerCoinId) return 'Writer coin'
  if (game.writerCoinId === 'musd-testnet') return MUSD_CONFIG.testnet.symbol
  if (game.writerCoinId === 'musd-mainnet') return MUSD_CONFIG.mainnet.symbol
  return getWriterCoinById(game.writerCoinId)?.symbol || game.writerCoinId.toUpperCase()
}

function getRemixHref(game: Game) {
  const params = new URLSearchParams()
  if (game.articleUrl) params.set('url', game.articleUrl)
  if (game.mode === 'wordle') params.set('mode', 'wordle')
  if (game.writerCoinId?.startsWith('musd')) params.set('pay', 'musd')
  if (game.writerCoinId && !game.writerCoinId.startsWith('musd')) params.set('pay', 'writercoin')
  return `/generate${params.toString() ? `?${params.toString()}` : ''}`
}

function DetailRow({ label, value, href, title }: { label: string; value: string; href?: string | null; title?: string }) {
  const content = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-sm text-white hover:text-emerald-200"
      title={title || value}>
      <span className="truncate">{value}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  ) : (
    <span className="text-sm text-white truncate" title={title || value}>{value}</span>
  )
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/8 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      {content}
    </div>
  )
}

function PanelCell({
  panel,
  coverUrl,
  accent,
  selected,
  reduceMotion,
  onSelect,
}: {
  panel: SavedGamePanel
  coverUrl?: string
  accent: string
  selected: boolean
  reduceMotion: boolean
  onSelect: () => void
}) {
  const media = getPanelMedia(panel, coverUrl)
  const showQuote = media.kind === 'poster' || (media.kind === 'image' && Boolean(media.reuseCover))
  const quote = showQuote ? pullQuote(panel.narrativeText, 72) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Panel ${panel.panelNumber}${quote ? `: ${quote}` : ''}`}
      className={`group relative aspect-[3/4] w-[min(72vw,220px)] shrink-0 snap-start overflow-hidden rounded-sm border bg-zinc-950 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto ${
        selected ? 'scale-[1.02]' : 'hover:-translate-y-0.5'
      }`}
      style={{ borderColor: selected ? accent : 'rgba(255,255,255,0.16)' }}
    >
      {media.kind === 'video' && !reduceMotion ? (
        <video
          src={media.src}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : media.kind === 'video' || media.kind === 'image' ? (
        <img
          src={media.kind === 'video' ? (panel.videoStillUrl || panel.imageUrl || coverUrl || media.src) : media.src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${
            media.kind === 'image' && media.reuseCover ? coverFocalClass(panel.panelNumber - 1) : ''
          }`}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${accent}55 0%, #09090b 48%, #000 100%)`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <span
        className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-[2px] px-1.5 font-serif text-xs font-semibold text-black"
        style={{ backgroundColor: accent }}
      >
        {panel.panelNumber}
      </span>

      {quote ? (
        <p className="absolute inset-x-2 bottom-2 font-serif text-[13px] leading-5 text-white/90 line-clamp-3">
          {quote}
        </p>
      ) : null}
    </button>
  )
}

export function GameArtifactView({ game }: GameArtifactViewProps) {
  const { address } = useAccount()
  const reduceMotion = Boolean(useReducedMotion())
  const ownerAddress = game.ownerWallet || game.creatorWallet
  const isOwner = Boolean(address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase())
  const tokenLabel = getTokenLabel(game)
  const hasMintRecord = Boolean(game.nftTokenId || game.nftTransactionHash || game.nftMintedAt)
  const hasSuperRareRecord = Boolean(game.superrareTokenId || game.superrareMintedAt)
  const savedPanels = game.savedPanels || []
  const hasSavedPanels = savedPanels.length > 0
  const remixHref = useMemo(() => getRemixHref(game), [game])
  const accent = game.primaryColor || '#34d399'
  const writerLabel = game.authorParagraphUsername || game.publicationName || tokenLabel

  const [superrareMinting, setSuperrareMinting] = useState(false)
  const [superrareError, setSuperrareError] = useState<string | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)

  const selectedPanel = savedPanels.find(panel => panel.id === selectedPanelId) ?? null
  const selectedParsed = selectedPanel ? parsePanel(selectedPanel.narrativeText) : null

  const handleSuperrareMint = async () => {
    if (!address) return
    setSuperrareMinting(true)
    setSuperrareError(null)
    try {
      const res = await fetch('/api/superrare/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, wallet: address }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch (err) {
      setSuperrareError(err instanceof Error ? err.message : 'Minting failed')
    } finally {
      setSuperrareMinting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-black text-white">
      <section className="relative min-h-[72vh] overflow-hidden">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${accent}40, transparent 50%), linear-gradient(180deg, #141414, #000)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-between px-4 py-5">
          <div className="flex items-center justify-between">
            <Link href="/games"
              className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Arcade
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-black/35 px-2.5 py-1 text-xs text-white/70 backdrop-blur">
              <BookOpen className="h-3.5 w-3.5" /> Saved creation
            </span>
          </div>

          <div className="max-w-2xl pb-8 pt-16 sm:pb-12">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                {game.genre}
              </span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                ${tokenLabel}
              </span>
              {hasMintRecord ? (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                  <BadgeCheck className="h-3 w-3" /> Minted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] text-white/65">
                  <Lock className="h-3 w-3" /> Not minted
                </span>
              )}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              {writerLabel}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              {game.title}
            </h1>
            {game.tagline ? (
              <p className="mt-4 max-w-xl font-serif text-lg leading-snug text-white/80 sm:text-xl">
                {game.tagline}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              {isOwner && !hasMintRecord ? (
                <Link href={`/games/${game.slug}?play=1`}
                  className="inline-flex h-12 items-center gap-1.5 rounded-md px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}>
                  <Sparkles className="h-4 w-4" /> Play & mint as NFT
                </Link>
              ) : (
                <Link href={`/games/${game.slug}?play=1`}
                  className="inline-flex h-12 items-center gap-1.5 rounded-md bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-emerald-100">
                  <Gamepad2 className="h-4 w-4" /> Play
                </Link>
              )}
              <Link href={remixHref}
                className="inline-flex items-center gap-1.5 text-sm text-white/65 transition-colors hover:text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Remix
              </Link>
              <a href="#credits"
                className="text-sm text-white/65 transition-colors hover:text-white">
                Credits
              </a>
            </div>
          </div>
        </div>
      </section>

      {hasSavedPanels ? (
        <section className="relative z-10 -mt-8 pb-4" aria-label="Story panels">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-serif text-lg text-white">Panels</h2>
              <p className="text-xs text-white/45">{savedPanels.length} beats · tap one to read</p>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
              {savedPanels.map(panel => (
                <PanelCell
                  key={panel.id}
                  panel={panel}
                  coverUrl={game.imageUrl}
                  accent={accent}
                  selected={panel.id === selectedPanelId}
                  reduceMotion={reduceMotion}
                  onSelect={() => setSelectedPanelId(current => current === panel.id ? null : panel.id)}
                />
              ))}
            </div>

            {selectedPanel && selectedParsed ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-white/12 bg-zinc-950">
                <div className="grid gap-0 md:grid-cols-[minmax(0,280px)_1fr]">
                  <div className="relative aspect-[4/5] bg-black md:aspect-auto md:min-h-[280px]">
                    <PanelReaderVisual
                      panel={selectedPanel}
                      coverUrl={game.imageUrl}
                      accent={accent}
                      reduceMotion={reduceMotion}
                    />
                  </div>
                  <div className="flex flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                        Panel {selectedPanel.panelNumber}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedPanelId(null)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/8 hover:text-white"
                        aria-label="Close panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 font-serif text-base leading-7 text-white/85">
                      {selectedParsed.narrative}
                    </p>
                    {selectedPanel.userChoice ? (
                      <p className="mt-4 border-l-2 pl-3 text-sm text-white/65" style={{ borderColor: accent }}>
                        {selectedPanel.userChoice}
                      </p>
                    ) : null}
                    {selectedPanel.audioUrl ? (
                      <a
                        href={selectedPanel.audioUrl}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Listen
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : game.mode !== 'wordle' ? (
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-white/45">
          Play to generate this story&apos;s panels.
        </p>
      ) : null}

      <RelatedPlayStrip game={game} density="landing" />

      <section id="credits" className="mx-auto max-w-6xl space-y-3 px-4 py-8">
        {game.description ? (
          <details className="group rounded-lg border border-white/10 bg-zinc-950">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-white/70 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              About this story
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="border-t border-white/8 px-4 py-3 text-sm leading-6 text-white/65">
              {game.description}
            </p>
          </details>
        ) : null}

        <details className="group rounded-lg border border-white/10 bg-zinc-950">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-white/70 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            Credits & collectible
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-6 border-t border-white/8 px-4 py-4 md:grid-cols-2">
            <div>
              <DetailRow label="Creator" value={shortAddress(ownerAddress)} />
              <DetailRow label="Writer" value={writerLabel} />
              <DetailRow label="Publication" value={game.publicationName || '—'} />
              <DetailRow label="Source" value={hostnameLabel(game.articleUrl)} href={game.articleUrl} title={game.articleUrl || undefined} />
              <DetailRow label="Created" value={formatDate(game.createdAt)} />
              <DetailRow label="Mode" value={game.mode === 'wordle' ? 'Word puzzle' : '5-panel comic'} />
            </div>
            <div>
              <DetailRow
                label="NFT"
                value={hasMintRecord ? (game.nftTokenId ? 'Minted' : 'Pending') : 'Not minted'}
              />
              {hasMintRecord ? (
                <>
                  <DetailRow label="Token ID" value={game.nftTokenId || '—'} />
                  <DetailRow label="Chain" value="Base" />
                  <DetailRow label="Contract" value={shortAddress(game.nftContractAddress)}
                    href={game.nftContractAddress ? `https://basescan.org/address/${game.nftContractAddress}` : null} />
                  <DetailRow label="Tx" value={shortAddress(game.nftTransactionHash)}
                    href={game.nftTransactionHash ? `https://basescan.org/tx/${game.nftTransactionHash}` : null} />
                </>
              ) : null}
              <DetailRow label="Token" value={`$${tokenLabel}`} />
              {hasSuperRareRecord ? (
                <DetailRow label="SuperRare" value="Minted" />
              ) : isOwner ? (
                <div className="pt-3">
                  <p className="mb-2 text-sm text-white/55">Mint as a collectible on SuperRare.</p>
                  <button onClick={handleSuperrareMint} disabled={superrareMinting}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:opacity-50">
                    {superrareMinting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
                    ) : (
                      <><GalleryHorizontalEnd className="h-4 w-4" /> Mint on SuperRare</>
                    )}
                  </button>
                  {superrareError && <p className="mt-1.5 text-xs text-red-400">{superrareError}</p>}
                </div>
              ) : (
                <p className="pt-2 text-sm text-white/45">Only the owner can mint on SuperRare.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <PlayTrendChart slug={game.slug} />
            </div>
          </div>
        </details>
      </section>
    </main>
  )
}

function PanelReaderVisual({
  panel,
  coverUrl,
  accent,
  reduceMotion,
}: {
  panel: SavedGamePanel
  coverUrl?: string
  accent: string
  reduceMotion: boolean
}) {
  const media = getPanelMedia(panel, coverUrl)
  if (media.kind === 'video' && !reduceMotion) {
    return (
      <video
        src={media.src}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }
  if (media.kind === 'video' || media.kind === 'image') {
    return (
      <img
        src={media.kind === 'video' ? (panel.videoStillUrl || panel.imageUrl || coverUrl || media.src) : media.src}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${
          media.kind === 'image' && media.reuseCover ? coverFocalClass(panel.panelNumber - 1) : ''
        }`}
      />
    )
  }
  return (
    <div
      className="absolute inset-0 flex items-end p-4"
      style={{ background: `linear-gradient(160deg, ${accent}55 0%, #09090b 48%, #000 100%)` }}
    >
      <p className="font-serif text-lg leading-6 text-white/85">{pullQuote(panel.narrativeText, 110)}</p>
    </div>
  )
}
