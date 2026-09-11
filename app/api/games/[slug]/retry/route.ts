import { after } from 'next/server'
import { ok, fail } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { logger } from '@/lib/config'
import { buildGenerationCacheKey } from '@/lib/ai-cache'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'
import { runStoryGeneration } from '@/domains/games/services/story-generation.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/games/[slug]/retry — re-run the async story pipeline for a game
 * whose record-first generation failed. Owner/actor-gated; reuses the stored
 * prompt and (if present) the original payment — no second charge.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const game = await prisma.game.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      userId: true,
      ownerWallet: true,
      creatorWallet: true,
      promptText: true,
      articleUrl: true,
      genre: true,
      difficulty: true,
      generationStatus: true,
      generationTargetPrivate: true,
      paymentId: true,
      mode: true,
    },
  })
  if (!game) return fail('Game not found', 404, { code: 'GAME_NOT_FOUND' })
  if (game.mode !== 'story') return fail('Only story games can retry generation.', 400, { code: 'NOT_STORY_MODE' })
  if (game.generationStatus === 'generating') {
    return ok({ slug: game.slug, generationStatus: 'generating' })
  }
  if (game.generationStatus === 'ready') {
    return ok({ slug: game.slug, generationStatus: 'ready' })
  }

  // Only the creator (or an attached wallet) may retry — the record carries
  // the paid/demo entitlement from the original request.
  const actor = await getActor()
  const actorWallet = actor?.user.walletAddress?.toLowerCase()
  const isCreator = Boolean(
    actor && (
      (game.userId && game.userId === actor.user.id) ||
      (actorWallet && (
        actorWallet === game.ownerWallet?.toLowerCase() ||
        actorWallet === game.creatorWallet?.toLowerCase()
      ))
    )
  )
  if (!isCreator) {
    return fail('Only the creator can retry generation.', 403, { code: 'FORBIDDEN' })
  }

  if (!game.promptText) {
    return fail('This game has no source prompt to retry from.', 400, { code: 'NO_PROMPT' })
  }

  const claimed = await prisma.game.updateMany({
    where: { id: game.id, generationStatus: 'failed' },
    data: { generationStatus: 'generating', generationError: null },
  })
  if (claimed.count === 0) {
    // Lost the race — another request already reset it.
    return ok({ slug: game.slug, generationStatus: 'generating' })
  }

  const userPreferences = await UserAIPreferenceService.getUserPreferences()

  after(async () => {
    await runStoryGeneration({
      gameId: game.id,
      slug: game.slug,
      gameRequest: {
        promptText: game.promptText ?? undefined,
        url: game.articleUrl ?? undefined,
        customization: {
          genre: (game.genre === 'horror' || game.genre === 'comedy' || game.genre === 'mystery'
            ? game.genre
            : undefined) as 'horror' | 'comedy' | 'mystery' | undefined,
          difficulty: (game.difficulty === 'easy' || game.difficulty === 'hard'
            ? game.difficulty
            : undefined) as 'easy' | 'hard' | undefined,
        },
      },
      cacheKey: buildGenerationCacheKey({
        url: game.articleUrl ?? undefined,
        prompt: game.promptText ?? undefined,
        genre: game.genre ?? undefined,
        difficulty: game.difficulty ?? undefined,
        mode: 'story',
        actorId: actor?.user.id || actorWallet,
        paymentId: game.paymentId ?? undefined,
      }),
      userPreferences,
      targetPrivate: game.generationTargetPrivate,
    })
  })

  logger.info('Story generation retry queued', { gameId: game.id, slug: game.slug })
  return ok({ slug: game.slug, generationStatus: 'generating' })
}
