import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Clapperboard, Boxes, Gem, ArrowUpRight, Loader2, AlertCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { buildGameWorlds, type WorldArtifact, type WorldArtifactStatus } from '@/lib/game-worlds'

export const dynamic = 'force-dynamic'

interface WorldsPageProps {
  params: Promise<{ slug: string }>
}

const ICONS = {
  comic: BookOpen,
  film: Clapperboard,
  diorama: Boxes,
  nft: Gem,
} as const

const STATUS_STYLES: Record<WorldArtifactStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  rendering: { label: 'Rendering', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  available: { label: 'Available', className: 'border-white/15 bg-white/5 text-white/70' },
  failed: { label: 'Failed', className: 'border-red-500/30 bg-red-500/10 text-red-300' },
  minted: { label: 'Minted', className: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
  hidden: { label: '', className: '' },
}

function statusLabel(artifact: WorldArtifact): string {
  if (artifact.meta) return artifact.meta
  return STATUS_STYLES[artifact.status].label
}

function WorldCard({ artifact }: { artifact: WorldArtifact }) {
  const Icon = ICONS[artifact.id]
  const style = STATUS_STYLES[artifact.status]
  const interactive = artifact.status !== 'hidden'

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Icon className="h-5 w-5 text-white/80" />
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.className}`}>
          {artifact.status === 'rendering' && <Loader2 className="h-3 w-3 animate-spin" />}
          {artifact.status === 'failed' && <AlertCircle className="h-3 w-3" />}
          {statusLabel(artifact)}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-base font-bold text-white">{artifact.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/60">{artifact.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-white/50">
          {artifact.costCredits ? `${artifact.costCredits} credits` : artifact.status === 'ready' || artifact.status === 'minted' ? 'Included' : 'Free'}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80">
          {artifact.status === 'ready' || artifact.status === 'minted' ? 'Open' : artifact.status === 'rendering' ? 'Pending' : 'Explore'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  )

  const className = `group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors ${
    interactive ? 'hover:border-white/25 hover:bg-white/[0.06]' : 'opacity-50'
  }`

  return interactive ? (
    <Link href={artifact.href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  )
}

export default async function GameWorldsPage({ params }: WorldsPageProps) {
  const { slug } = await params

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      scene: true,
      artifactPanels: { select: { videoStatus: true, videoUrl: true } },
    },
  })
  if (!game) notFound()
  const actor = await getActor()
  if (game.private && game.userId && actor?.user.id !== game.userId) notFound()

  const artifacts = buildGameWorlds(game, game.scene)

  return (
    <ThemeWrapper theme="arcade">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">One story, many worlds</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white sm:text-4xl">{game.title}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/60">
            Your article became a story. Experience it as a comic, a film, a walkable world, and an onchain asset.
          </p>
          <Link href={`/games/${slug}`} className="mt-4 inline-block text-sm text-white/50 underline-offset-4 hover:text-white hover:underline">
            ← Back to the story
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {artifacts.map((artifact) => (
            <WorldCard key={artifact.id} artifact={artifact} />
          ))}
        </div>
      </main>
      <Footer />
    </ThemeWrapper>
  )
}
