import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import {
  type VideoStyle,
  VIDEO_STYLE_LABELS,
  getVideoDurationSeconds,
} from '@/domains/games/services/video-generation.service'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { config } from '@/lib/config'
import { refundVideoCharge } from '@/domains/games/services/video-charge.service'
import { runPanelClipGeneration } from '@/domains/games/services/montage-generation.service'

/**
 * Stage 3 — PAID "Animate the whole comic" montage.
 *
 * Renders a final 9:16 clip for EVERY panel (sequential, no fan-out) using the
 * same atomic debit+refund pattern as the hero upsell. Per-panel idempotency:
 * panels with an existing final `videoUrl` are skipped and a `videoStatus:'pending'`
 * guard prevents a retry from starting a second job on one panel. Refunded only if
 * NO panel produces a completed clip (total failure); partial success is non-refunded,
 * matching the hero semantics.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!config.features.videoPipeline) {
    return NextResponse.json({ error: 'Animation is not available.' }, { status: 404 })
  }
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: 'Sign in to animate this comic.' }, { status: 401 })

  const game = await prisma.game.findUnique({
    where: { slug },
    include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
  })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.private && game.userId && game.userId !== actor.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const panels = game.artifactPanels
  if (!panels.length) return NextResponse.json({ error: 'No saved panels to animate. Finish the comic first.' }, { status: 400 })

  // If the assembled film already exists (e.g. an auto-film ran after a
  // completed run), don't charge — return it. Paid montage only makes sense
  // before the film exists.
  if (game.montageVideoUrl?.startsWith('http')) {
    return NextResponse.json({
      success: true,
      data: { gameId: game.id, status: 'completed', mode: 'montage', montageVideoUrl: game.montageVideoUrl, panels },
    })
  }

  const burst = checkRateLimit(`video:${actor.user.id}`)
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Animation requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn }, { status: 429 })
  }

  const sentinelHash = `credits:${randomBytes(16).toString('hex')}`
  // Reserve the game atomically before charging (one video purchase per game).
  const reservation = await prisma.game.updateMany({
    where: {
      id: game.id,
      OR: [
        { videoUpsoldAt: null },
        { videoUpsellStatus: 'failed', OR: [{ videoChargeRefundedAt: { not: null } }, { videoPaymentRef: null }] },
      ],
    },
    data: { videoUpsoldAt: new Date(), videoUpsellStatus: 'pending', videoPaymentRef: sentinelHash, videoPaymentUserId: actor.user.id, videoChargeRefundedAt: null },
  })

  if (reservation.count === 0) {
    // An active/completed video reservation exists — return current state (idempotent).
    const current = await prisma.game.findUnique({ where: { id: game.id }, select: { videoUpsellStatus: true } })
    const refreshedPanels = await prisma.gameArtifactPanel.findMany({
      where: { gameId: game.id },
      orderBy: { panelIndex: 'asc' },
      select: { id: true, panelIndex: true, videoStatus: true, videoUrl: true },
    })
    return NextResponse.json({ success: true, data: { gameId: game.id, status: current?.videoUpsellStatus ?? 'pending', mode: 'montage', durationSeconds: getVideoDurationSeconds(), panels: refreshedPanels } })
  }

  const cost = CREDITS_CONFIG.cost['video-montage']
  if (actor.user.credits < cost) {
    await prisma.game.update({ where: { id: game.id }, data: { videoUpsoldAt: null, videoUpsellStatus: 'idle', videoPaymentRef: null, videoPaymentUserId: null, videoChargeRefundedAt: null } })
    return NextResponse.json({ error: `Insufficient credits. You need ${cost} but have ${actor.user.credits}.`, credits: actor.user.credits, required: cost }, { status: 402 })
  }

  const body = await request.json().catch(() => ({})) as { style?: VideoStyle }
  const style = body?.style && VIDEO_STYLE_LABELS[body.style] ? body.style : 'cinematic'

  try {
    await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({ where: { id: actor.user.id, credits: { gte: cost } }, data: { credits: { decrement: cost } } })
      if (debit.count !== 1) throw new Error('INSUFFICIENT_CREDITS')
      await tx.creditTransaction.create({ data: { userId: actor.user.id, fiatAmount: 0, creditAmount: -cost, status: 'completed', completedAt: new Date() } })
      await tx.payment.create({ data: { transactionHash: sentinelHash, action: 'video-montage', amount: cost, status: 'verified', verifiedAt: new Date(), writerCoinId: 'credits', userId: actor.user.id, walletAddress: actor.user.walletAddress ?? null } })
    })
  } catch (error) {
    await prisma.game.update({ where: { id: game.id }, data: { videoUpsoldAt: null, videoUpsellStatus: 'idle', videoPaymentRef: null, videoPaymentUserId: null, videoChargeRefundedAt: null } })
    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: `Insufficient credits. You need ${cost} credits.`, required: cost }, { status: 402 })
    }
    throw error
  }

  const { attempted, anyCompleted, anyPending, overallStatus, panelResults } =
    await runPanelClipGeneration({ game, panels, slug, style })

  await prisma.game.update({ where: { id: game.id }, data: { videoUpsellStatus: overallStatus } })

  // Refund only on total failure: at least one panel attempted, none completed and none in flight.
  if (attempted > 0 && !anyCompleted && !anyPending) {
    await refundVideoCharge({ gameId: game.id, userId: actor.user.id, paymentRef: sentinelHash, cost, slug, reason: 'video-montage-total-failure' })
  }

  return NextResponse.json({
    success: true,
    data: { gameId: game.id, status: overallStatus, mode: 'montage', durationSeconds: getVideoDurationSeconds(), cost, panels: panelResults },
  })
}
