import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { config, logger } from '@/lib/config'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import {
  planSceneWithCritique,
} from '@/domains/games/services/scene-generation.service'
import { BUNDLED_SCENE_PAYMENT_REF, STALE_PENDING_MS } from '@/lib/scene-billing'
import type { StoryPlan } from '@/domains/games/services/story-planner.service'

export const maxDuration = 60

const SCENE_COST = CREDITS_CONFIG.cost['generate-scene']

/**
 * GET — the game's persisted diorama scene (public read, same as panels).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true } })
  if (!game) return NextResponse.json({ success: false, error: 'Game not found' }, { status: 404 })
  const scene = await prisma.gameScene.findUnique({ where: { gameId: game.id } })
  if (!scene) return NextResponse.json({ success: true, data: null })
  return NextResponse.json({ success: true, data: scene })
}

/**
 * POST — generate (or return) the game's explorable 3D diorama.
 *
 * Synchronous: ScenePlannerService is a single structured-output call, so the
 * scene is planned, charged, and persisted in one request. Idempotent — a
 * completed scene returns without charging; a pending one reports in-flight.
 * On planner failure the scene is marked 'failed' and the charge refunded,
 * matching the video pipeline's total-failure semantics.
 *
 * Bundled scenes (paymentRef === BUNDLED_SCENE_PAYMENT_REF — generated free
 * inside story generation) retry without any credit charge.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!config.features.sceneDiorama) {
    return NextResponse.json({ error: 'Diorama scenes are not available.' }, { status: 404 })
  }
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: 'Sign in to generate a scene.' }, { status: 401 })

  const game = await prisma.game.findUnique({
    where: { slug },
    include: { scene: true },
  })
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.private && game.userId && game.userId !== actor.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = game.scene
  const isBundled = existing?.paymentRef === BUNDLED_SCENE_PAYMENT_REF
  const staleCutoff = new Date(Date.now() - STALE_PENDING_MS)
  const staleBundledPending =
    isBundled && existing?.status === 'pending' && existing.updatedAt < staleCutoff

  if (existing?.status === 'completed' && existing.sceneJson) {
    return NextResponse.json({ success: true, data: { scene: existing, cached: true } })
  }
  if (existing?.status === 'pending' && !staleBundledPending) {
    return NextResponse.json({ success: true, data: { scene: existing, pending: true } })
  }

  const burst = checkRateLimit(`scene:${actor.user.id}`)
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Scene requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn }, { status: 429 })
  }

  if (!isBundled && actor.user.credits < SCENE_COST) {
    return NextResponse.json({ error: `Insufficient credits. You need ${SCENE_COST} but have ${actor.user.credits}.`, credits: actor.user.credits, required: SCENE_COST }, { status: 402 })
  }

  const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

  // Reserve the scene row atomically — gameId is unique, so a concurrent POST
  // loses the create and falls through to the pending branch above on retry.
  let sceneId: string
  try {
    if (existing) {
      const reserved = await prisma.gameScene.updateMany({
        where: isBundled
          ? {
              id: existing.id,
              OR: [
                { status: { in: ['idle', 'failed'] } },
                { status: 'pending', updatedAt: { lt: staleCutoff } },
              ],
            }
          : { id: existing.id, status: { in: ['idle', 'failed'] } },
        data: {
          status: 'pending',
          error: null,
          paymentRef: isBundled ? BUNDLED_SCENE_PAYMENT_REF : sentinelHash,
          userId: actor.user.id,
          creditsCharged: isBundled ? 0 : SCENE_COST,
        },
      })
      if (reserved.count === 0) {
        return NextResponse.json({ success: true, data: { scene: await prisma.gameScene.findUnique({ where: { id: existing.id } }), pending: true } })
      }
      sceneId = existing.id
    } else {
      const created = await prisma.gameScene.create({
        data: { gameId: game.id, status: 'pending', paymentRef: sentinelHash, userId: actor.user.id, creditsCharged: SCENE_COST },
      })
      sceneId = created.id
    }
  } catch (error) {
    // Unique-constraint race: another request created the row first.
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Scene generation already in progress.' }, { status: 409 })
    }
    throw error
  }

  // Atomic debit — same conditional-update guard as /api/credits/spend.
  // Bundled scenes were paid for inside generate-game; no debit, no refund.
  if (!isBundled) {
    try {
      await prisma.$transaction(async (tx) => {
        const debit = await tx.user.updateMany({ where: { id: actor.user.id, credits: { gte: SCENE_COST } }, data: { credits: { decrement: SCENE_COST } } })
        if (debit.count !== 1) throw new Error('INSUFFICIENT_CREDITS')
        await tx.creditTransaction.create({
          data: { userId: actor.user.id, fiatAmount: 0, creditAmount: -SCENE_COST, status: 'completed', completedAt: new Date() },
        })
        await tx.payment.create({
          data: { transactionHash: sentinelHash, action: 'generate-scene', amount: SCENE_COST, status: 'verified', verifiedAt: new Date(), writerCoinId: 'credits', userId: actor.user.id, walletAddress: actor.user.walletAddress ?? null },
        })
      })
    } catch (error) {
      await prisma.gameScene.update({ where: { id: sceneId }, data: { status: 'idle', paymentRef: null } })
      if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: `Insufficient credits. You need ${SCENE_COST} credits.`, required: SCENE_COST }, { status: 402 })
      }
      throw error
    }
  }

  const refund = async (reason: string) => {
    if (isBundled) return
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.user.id }, data: { credits: { increment: SCENE_COST } } })
      await tx.creditTransaction.create({
        data: { userId: actor.user.id, fiatAmount: 0, creditAmount: SCENE_COST, status: 'refunded', completedAt: new Date(), metadata: { reason, gameSlug: slug } },
      })
      await tx.payment.updateMany({ where: { transactionHash: sentinelHash }, data: { status: 'failed' } })
    })
  }

  let planned
  try {
    planned = await planSceneWithCritique({
      title: game.title,
      description: game.description,
      genre: game.genre,
      subgenre: game.subgenre ?? undefined,
      articleContext: game.articleContext ?? undefined,
      storyPlan: (game.agentPlan as StoryPlan | null) ?? null,
    })
  } catch (error) {
    logger.error('Scene plan generation failed:', error)
    await prisma.gameScene.update({ where: { id: sceneId }, data: { status: 'failed', error: 'Scene planning failed' } })
    await refund('scene-plan-failure').catch((e) => logger.error('Scene refund failed:', e))
    return NextResponse.json({
      error: isBundled
        ? 'Scene generation failed. It was included with your story — retry anytime.'
        : 'Scene generation failed. Your credits were refunded.',
    }, { status: 502 })
  }

  const scene = await prisma.gameScene.update({
    where: { id: sceneId },
    data: { status: 'completed', sceneJson: planned.plan, error: null },
  })

  return NextResponse.json({ success: true, data: { scene, cached: false, revised: planned.revised } })
}
