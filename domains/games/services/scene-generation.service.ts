import { prisma } from '@/lib/prisma'
import { config, logger } from '@/lib/config'
import {
  ScenePlannerService,
  type ScenePlan,
  type ScenePlannerInput,
} from './scene-planner.service'
import { SceneCritiqueService } from './scene-critique.service'
import type { StoryPlan } from './story-planner.service'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'
import { BUNDLED_SCENE_PAYMENT_REF, STALE_PENDING_MS } from '@/lib/scene-billing'

export { BUNDLED_SCENE_PAYMENT_REF, STALE_PENDING_MS }

export interface PlannedScene {
  plan: ScenePlan
  revised: boolean
  score?: number
  issueCount: number
}

/**
 * Plan → critique→revise. Shared by the paid POST route and the bundled
 * pipeline. Critique failure is non-fatal — the original plan is kept.
 */
export async function planSceneWithCritique(
  input: ScenePlannerInput,
  userPreferences?: UserAIPreferences
): Promise<PlannedScene> {
  const plan = await ScenePlannerService.generateScenePlan(input, userPreferences)

  try {
    const critique = await SceneCritiqueService.review(plan, input, userPreferences)
    logger.info('Scene critique completed', {
      title: input.title,
      score: critique.score,
      issues: critique.issues.length,
      revised: Boolean(critique.revisedScenePlan),
    })
    return {
      plan: critique.revisedScenePlan ?? plan,
      revised: Boolean(critique.revisedScenePlan),
      score: critique.score,
      issueCount: critique.issues.length,
    }
  } catch (error) {
    logger.warn('Scene critique failed; keeping original plan', {
      title: input.title,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return { plan, revised: false, issueCount: 0 }
  }
}

/**
 * Generate and persist a game's bundled scene. Runs inside the story
 * generation finalize (after game.agentPlan exists). Never throws — a scene
 * failure leaves the game 'ready' with GameScene.status='failed', retryable
 * for free via POST /api/games/[slug]/scene.
 */
export async function runBundledSceneGeneration(
  gameId: string,
  userPreferences?: UserAIPreferences
): Promise<void> {
  if (!config.features.sceneDiorama) return

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { scene: true },
  })
  if (!game || game.mode !== 'story') return

  const existing = game.scene
  const stalePending =
    existing?.status === 'pending' &&
    existing.updatedAt < new Date(Date.now() - STALE_PENDING_MS)
  if (existing && (existing.status === 'completed' || (existing.status === 'pending' && !stalePending))) {
    return
  }

  // Reserve the scene row — same atomic pattern as the paid route.
  let sceneId: string
  try {
    if (existing) {
      const reserved = await prisma.gameScene.updateMany({
        where: { id: existing.id, status: { in: ['idle', 'failed', 'pending'] } },
        data: {
          status: 'pending',
          error: null,
          paymentRef: BUNDLED_SCENE_PAYMENT_REF,
          userId: game.userId,
          creditsCharged: 0,
        },
      })
      if (reserved.count === 0) return
      sceneId = existing.id
    } else {
      const created = await prisma.gameScene.create({
        data: {
          gameId: game.id,
          status: 'pending',
          paymentRef: BUNDLED_SCENE_PAYMENT_REF,
          userId: game.userId,
          creditsCharged: 0,
        },
      })
      sceneId = created.id
    }
  } catch (error) {
    // Unique-constraint race: a concurrent run created the row first.
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') return
    throw error
  }

  try {
    const { plan, revised, score } = await planSceneWithCritique(
      {
        title: game.title,
        description: game.description,
        genre: game.genre,
        subgenre: game.subgenre ?? undefined,
        articleContext: game.articleContext ?? undefined,
        storyPlan: (game.agentPlan as StoryPlan | null) ?? null,
      },
      userPreferences
    )

    await prisma.gameScene.update({
      where: { id: sceneId },
      data: { status: 'completed', sceneJson: plan, error: null },
    })
    logger.info('Bundled scene generated', { gameId, revised, score })
  } catch (error) {
    logger.error('Bundled scene generation failed', error, { gameId })
    await prisma.gameScene
      .update({ where: { id: sceneId }, data: { status: 'failed', error: 'Scene planning failed' } })
      .catch((updateErr) => logger.error('Failed to mark bundled scene failed', updateErr, { gameId }))
  }
}
