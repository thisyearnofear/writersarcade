import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import {
  VideoGenerationService,
  type VideoStyle,
  VIDEO_STYLE_LABELS,
} from '@/domains/games/services/video-generation.service'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { config } from '@/lib/config'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { refundPanelCharge } from '@/domains/games/services/video-charge.service'

const COST = CREDITS_CONFIG.cost['animate-panel']

/**
 * POST /api/games/[slug]/video/animate-panel
 *
 * Micro-tier: animate a single panel for `animate-panel` credits (10cr/$1).
 * Panel-scoped — unlike hero/montage it does NOT use the game-level video
 * reservation, so several panels can be animated independently. Concurrency
 * is guarded by the panel's own videoStatus; the payment ref lives on the
 * panel so terminal failures refund the correct (micro) amount.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!config.features.videoPipeline) {
      return NextResponse.json({ error: 'Animation is not available.' }, { status: 404 })
    }
    const actor = await getActor()
    if (!actor) {
      return NextResponse.json({ error: 'Sign in to animate a panel.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      panelIndex?: number
      style?: VideoStyle
    }
    const panelIndex = typeof body?.panelIndex === 'number' ? body.panelIndex : null
    const style = body?.style && VIDEO_STYLE_LABELS[body.style] ? body.style : 'cinematic'

    const game = await prisma.game.findUnique({
      where: { slug },
      include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
    })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    if (game.private && game.userId && game.userId !== actor.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const panel = game.artifactPanels.find((p) => p.panelIndex === panelIndex)
    if (!panel) {
      return NextResponse.json({ error: 'Panel not found.' }, { status: 404 })
    }
    const motionFrameUrl = panel.videoStillUrl ?? panel.imageUrl
    if (!motionFrameUrl) {
      return NextResponse.json(
        { error: 'This panel has no image to animate. Generate the image first.' },
        { status: 400 }
      )
    }

    const burst = checkRateLimit(`video:${actor.user.id}`)
    if (!burst.allowed) {
      return NextResponse.json(
        { error: 'Animation requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn },
        { status: 429 }
      )
    }

    // Idempotent / concurrency guard: claim the panel's video slot before
    // charging so duplicate clicks or requests can't create two paid jobs.
    const claimed = await prisma.gameArtifactPanel.updateMany({
      where: { id: panel.id, videoStatus: { in: ['idle', 'failed'] } },
      data: { videoStatus: 'pending', videoError: null },
    })
    if (claimed.count === 0) {
      return NextResponse.json({
        success: true,
        data: {
          gameId: game.id,
          status: panel.videoStatus,
          mode: 'panel',
          panels: [{
            id: panel.id,
            panelIndex: panel.panelIndex,
            videoStatus: panel.videoStatus,
            videoUrl: panel.videoUrl,
          }],
        },
      })
    }

    const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

    try {
      await prisma.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({
          where: { id: actor.user.id, credits: { gte: COST } },
          data: { credits: { decrement: COST } },
        })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_CREDITS')

        await tx.creditTransaction.create({
          data: {
            userId: actor.user.id,
            fiatAmount: 0,
            creditAmount: -COST,
            status: 'completed',
            completedAt: new Date(),
          },
        })
        await tx.payment.create({
          data: {
            transactionHash: sentinelHash,
            action: 'animate-panel',
            amount: COST,
            status: 'verified',
            verifiedAt: new Date(),
            writerCoinId: 'credits',
            userId: actor.user.id,
            walletAddress: actor.user.walletAddress ?? null,
          },
        })
        await tx.gameArtifactPanel.update({
          where: { id: panel.id },
          data: {
            videoPaymentRef: sentinelHash,
            videoPaymentUserId: actor.user.id,
            videoCost: COST,
          },
        })
      })
    } catch (error) {
      await prisma.gameArtifactPanel.update({
        where: { id: panel.id },
        data: { videoStatus: 'idle' },
      })
      if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${COST} credits.`, required: COST, credits: actor.user.credits },
          { status: 402 }
        )
      }
      throw error
    }

    let result
    try {
      result = await VideoGenerationService.generate({
        imageUrl: motionFrameUrl,
        narrative: panel.narrativeText,
        genre: game.genre,
        panelIndex: panel.panelIndex,
        primaryColor: game.primaryColor ?? undefined,
        style,
        aspectRatio: '16:9',
      })
    } catch (error) {
      await refundPanelCharge({
        panelId: panel.id,
        userId: actor.user.id,
        paymentRef: sentinelHash,
        cost: COST,
        slug,
        reason: 'panel-video-request-error',
      })
      await prisma.gameArtifactPanel.update({
        where: { id: panel.id },
        data: { videoStatus: 'failed', videoError: 'Provider rejected the request.' },
      })
      throw error
    }

    const durableVideoUrl = result.status === 'completed' && result.videoUrl
      ? await persistMediaUrl(result.videoUrl, `writersarcade-${slug}-panel-${panel.panelIndex}.mp4`)
      : null
    const persistenceFailed = result.status === 'completed' && !durableVideoUrl
    const effectiveResult = persistenceFailed
      ? { ...result, status: 'failed' as const, videoUrl: null, error: 'Durable media storage is not configured.' }
      : result

    await prisma.gameArtifactPanel.update({
      where: { id: panel.id },
      data: {
        videoStatus: effectiveResult.status,
        videoProvider: effectiveResult.provider,
        videoModel: effectiveResult.model,
        videoJobId: effectiveResult.providerJobId,
        videoStyle: style,
        videoPolledAt: null,
        videoUrl: durableVideoUrl ?? effectiveResult.videoUrl,
        videoError: effectiveResult.error ?? null,
      },
    })

    if (effectiveResult.status === 'failed') {
      await refundPanelCharge({
        panelId: panel.id,
        userId: actor.user.id,
        paymentRef: sentinelHash,
        cost: COST,
        slug,
        reason: 'panel-video-immediate-failure',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        status: effectiveResult.status,
        mode: 'panel',
        panels: [{
          id: panel.id,
          panelIndex: panel.panelIndex,
          videoStatus: effectiveResult.status,
          videoUrl: durableVideoUrl ?? effectiveResult.videoUrl,
        }],
      },
    })
  } catch (error) {
    console.error('[Animate Panel] failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Animation failed' },
      { status: 500 }
    )
  }
}
