'use client'

import { useGetCurrentAccount } from '@mezo-org/passport'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Badge } from '@/components/ui/badge'
import {
  Gamepad2,
  Eye,
  Lock,
  BadgeCheck,
  Sparkles,
  Coins,
  Zap,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react'
import type {
  CreatorStudioSummary,
  AttentionItem,
} from '@/domains/creators/stats.service'

interface DashboardClientProps {
  initialSummary: CreatorStudioSummary
}

const attentionMeta: Record<
  AttentionItem['kind'],
  { label: string; description: string; icon: typeof ImageIcon; tone: 'amber' | 'blue' | 'purple' | 'indigo' }
> = {
  'no-artifact': {
    label: 'Needs artifact',
    description: 'Play through to save the artifact manifest.',
    icon: ImageIcon,
    tone: 'amber',
  },
  'private-ready': {
    label: 'Ready to publish',
    description: 'Private but complete — publish from /my-games.',
    icon: Eye,
    tone: 'blue',
  },
  'not-minted': {
    label: 'Not minted',
    description: 'Artifact saved, NFT not yet minted.',
    icon: BadgeCheck,
    tone: 'purple',
  },
}

const toneClasses: Record<'amber' | 'blue' | 'purple' | 'indigo', string> = {
  amber: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400',
  blue: 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400',
  purple: 'border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400',
  indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400',
}

export function DashboardClient({ initialSummary }: DashboardClientProps) {
  const summary = initialSummary
  const { data: mezoAccount } = useGetCurrentAccount()


  const walletDisplay = summary.identity.walletAddress
    ? `${summary.identity.walletAddress.slice(0, 6)}…${summary.identity.walletAddress.slice(-4)}`
    : '—'

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Page header + status strip */}
          <section className="px-4 py-8 border-b border-border sm:py-10">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Overview
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-bold">Creator Studio</h1>
                  <p className="mt-3 max-w-2xl text-muted-foreground">
                    Review what changed, what needs attention, and which games are ready for
                    publishing, minting, or IP registration.
                  </p>
                </div>
                <Link
                  href="/my-games"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  Open library
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{walletDisplay}</span>
                {mezoAccount?.totalMats !== undefined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-foreground">
                      {mezoAccount.totalMats.toLocaleString()}
                    </span>
                    <span>Mats</span>
                  </span>
                )}
                <a
                  href={`https://explorer.test.mezo.org/address/${summary.identity.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Mezo Passport <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://basescan.org/address/${summary.identity.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Basescan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </section>

          {/* Status strip */}
          <section className="px-4 py-6 border-b border-border">
            <div className="max-w-6xl mx-auto grid grid-cols-2 gap-3 md:grid-cols-6">
              <StatTile icon={Gamepad2} label="Games" value={summary.games.total} />
              <StatTile icon={Eye} label="Public" value={summary.games.public} />
              <StatTile icon={Lock} label="Private" value={summary.games.private} />
              <StatTile icon={ImageIcon} label="Artifacts" value={summary.games.artifactReady} />
              <StatTile icon={BadgeCheck} label="Minted" value={summary.games.minted} />
            </div>
          </section>

          <section className="px-4 py-10 sm:py-12">
            <div className="max-w-6xl mx-auto grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Primary column */}
              <div className="space-y-8 lg:col-span-2">
                <AttentionSection items={summary.attention} />
                <RecentGamesSection games={summary.games.recent} />
                <PaymentsSection payments={summary.payments} />
              </div>

              {/* Side column */}
              <div className="space-y-6">
              </div>
            </div>
          </section>
        </main>

      </div>
    </ThemeWrapper>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gamepad2
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function AttentionSection({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Nothing needs attention</h2>
        <p className="text-sm text-muted-foreground">
          Your library is up to date. Publish, mint, or register IP when you are ready.
        </p>
      </div>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Needs attention
        </h2>
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const meta = attentionMeta[item.kind]
          const Icon = meta.icon
          const href =
            item.kind === 'no-artifact'
              ? `/games/${item.game.slug}?play=1`
              : `/my-games#${item.game.id}`
          return (
            <Link
              key={`${item.kind}-${item.game.id}`}
              href={href}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:border-purple-500/40 transition-colors"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClasses[meta.tone]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {item.game.title}
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                    {item.game.genre}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold">{meta.label}.</span> {meta.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function RecentGamesSection({ games }: { games: CreatorStudioSummary['games']['recent'] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Recent games
        </h2>
        <Link
          href="/my-games"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open library →
        </Link>
      </div>
      {games.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">No games yet.</p>
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Create your first game
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <div
              key={game.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-purple-500/40 transition-colors"
            >
              <Link href={`/games/${game.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {game.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                      {game.genre}
                    </Badge>
                  </div>
                </div>
              </Link>
              <Link
                href={`/games/${game.slug}/insights`}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                title="Resonance insights"
              >
                Insights
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function PaymentsSection({ payments }: { payments: CreatorStudioSummary['payments'] }) {
  const byTokenEntries = Object.entries(payments.byToken)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Tracked payments
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Verified on-chain payments from this wallet.
        </span>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-y-0 md:divide-x">
          <PaymentColumn
            title="Generation"
            description="Spent creating games"
            musd={payments.generation.musd}
            writerCoin={payments.generation.writerCoin}
            icon={<Zap className="h-4 w-4" />}
          />
          <PaymentColumn
            title="Minting"
            description="Spent minting NFTs"
            musd={payments.minting.musd}
            writerCoin={payments.minting.writerCoin}
            icon={<BadgeCheck className="h-4 w-4" />}
          />
        </div>
        {byTokenEntries.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              By token
            </p>
            <div className="flex flex-wrap gap-2">
              {byTokenEntries.map(([token, amount]) => (
                <span
                  key={token}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
                >
                  <span className="font-mono font-semibold text-foreground">{amount}</span>
                  <span className="text-muted-foreground">{token.toUpperCase()}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function PaymentColumn({
  title,
  description,
  musd,
  writerCoin,
  icon,
}: {
  title: string
  description: string
  musd: string
  writerCoin: string
  icon: React.ReactNode
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">{description}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">MUSD</span>
          <span className="font-mono text-sm font-semibold text-foreground">{musd}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Writer coins</span>
          <span className="font-mono text-sm font-semibold text-foreground">{writerCoin}</span>
        </div>
      </div>
    </div>
  )
}

