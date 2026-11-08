import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { config, logger } from '@/lib/config'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { ScenePlannerService, type ScenePlan } from '@/domains/games/services/scene-planner.service'
import { SceneCritiqueService } from '@/domains/games/services/scene-critique.service'
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
  if (existing?.status === 'completed' && existing.sceneJson) {
    return NextResponse.json({ success: true, data: { scene: existing, cached: true } })
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ success: true, data: { scene: existing, pending: true } })
  }

  const burst = checkRateLimit(`scene:${actor.user.id}`)
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Scene requests are temporarily limited. Please try again shortly.', resetIn: burst.resetIn }, { status: 429 })
  }

  if (actor.user.credits < SCENE_COST) {
    return NextResponse.json({ error: `Insufficient credits. You need ${SCENE_COST} but have ${actor.user.credits}.`, credits: actor.user.credits, required: SCENE_COST }, { status: 402 })
  }

  const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

  // Reserve the scene row atomically — gameId is unique, so a concurrent POST
  // loses the create and falls through to the pending branch above on retry.
  let sceneId: string
  try {
    if (existing) {
      const reserved = await prisma.gameScene.updateMany({
        where: { id: existing.id, status: { in: ['idle', 'failed'] } },
        data: { status: 'pending', error: null, paymentRef: sentinelHash, userId: actor.user.id, creditsCharged: SCENE_COST },
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

  const refund = async (reason: string) => {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.user.id }, data: { credits: { increment: SCENE_COST } } })
      await tx.creditTransaction.create({
        data: { userId: actor.user.id, fiatAmount: 0, creditAmount: SCENE_COST, status: 'refunded', completedAt: new Date(), metadata: { reason, gameSlug: slug } },
      })
      await tx.payment.updateMany({ where: { transactionHash: sentinelHash }, data: { status: 'failed' } })
    })
  }

  let scenePlan: ScenePlan
  try {
    scenePlan = await ScenePlannerService.generateScenePlan({
      title: game.title,
      description: game.description,
      genre: game.genre,
      subgenre: game.subgenre,
      articleContext: game.articleContext ?? undefined,
      storyPlan: (game.agentPlan as StoryPlan | null) ?? null,
    })
  } catch (error) {
    logger.error('Scene plan generation failed:', error)
    await prisma.gameScene.update({ where: { id: sceneId }, data: { status: 'failed', error: 'Scene planning failed' } })
    await refund('scene-plan-failure').catch((e) => logger.error('Scene refund failed:', e))
    return NextResponse.json({ error: 'Scene generation failed. Your credits were refunded.' }, { status: 502 })
  }

  // Critique→revise pass (Scenethesis pattern): a second structured call
  // reviews the plan against the story and may return a corrected plan.
  // Non-fatal — a critique failure keeps the original plan.
  let revised = false
  try {
    const critique = await SceneCritiqueService.review(scenePlan, {
      title: game.title,
      description: game.description,
      genre: game.genre,
      articleContext: game.articleContext ?? undefined,
      storyPlan: (game.agentPlan as StoryPlan | null) ?? null,
    })
    if (critique.revisedScenePlan) {
      scenePlan = critique.revisedScenePlan
      revised = true
    }
    logger.info('Scene critique completed', { gameSlug: slug, score: critique.score, issues: critique.issues.length, revised })
  } catch (error) {
    logger.warn('Scene critique failed; keeping original plan', { gameSlug: slug, error: error instanceof Error ? error.message : 'unknown' })
  }

  const scene = await prisma.gameScene.update({
    where: { id: sceneId },
    data: { status: 'completed', sceneJson: scenePlan, error: null },
  })

  return NextResponse.json({ success: true, data: { scene, cached: false, revised } })
}
