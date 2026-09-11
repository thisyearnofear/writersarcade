import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { config, logger } from '@/lib/config'
import { GameAIService } from './game-ai.service'
import { ImageGenerationService } from './image-generation.service'
import { GameDatabaseService } from './game-database.service'
import { deduplicateGeneration } from '@/lib/ai-cache'
import { pickAccentColor } from '@/lib/daily-challenge'
import type { GameGenerationResponse, GameGenerationRequest } from '../types'
import type { UserAIPreferences } from '@/lib/user-ai-preferences.service'

/**
 * Record-first generation: the Game row exists before this runs (status
 * 'generating'), so the caller can return the slug immediately and let the
 * player navigate to the game page while the AI pipeline finishes.
 *
 * On success the row is updated with the generated fields and flipped to
 * 'ready' (and made public unless the creator asked for private). On failure
 * the row is marked 'failed' with the error — the game page's retry surface
 * re-invokes this function.
 */
export interface StoryFinalizeContext {
  gameId: string
  slug: string
  /** The structured-gen request — same shape as the synchronous path. */
  gameRequest: GameGenerationRequest
  cacheKey: string
  userPreferences: UserAIPreferences
  /** BasePaint palette for grounding the game's accent color. */
  basePaintPalette?: string[]
  /** Article text for secret-panel/hypercert enrichment. */
  articleText?: string
  canonicalWriterCoinId?: string
  /** Target `private` value once generation completes. */
  targetPrivate: boolean
}

export async function runStoryGeneration(ctx: StoryFinalizeContext): Promise<void> {
  const { gameId, slug } = ctx
  try {
    const aiGameData = await deduplicateGeneration(ctx.cacheKey, () =>
      GameAIService.generateGame(ctx.gameRequest, 0, ctx.userPreferences)
    )

    logger.info('AI generation successful (async finalize):', { gameId, title: aiGameData.title, genre: aiGameData.genre })

    const gameData: GameGenerationResponse = { ...aiGameData, mode: 'story' as const }

    if (ctx.basePaintPalette) {
      const accent = pickAccentColor(ctx.basePaintPalette)
      if (accent) gameData.primaryColor = accent
    }

    await prisma.game.update({
      where: { id: gameId },
      data: {
        title: gameData.title,
        description: gameData.description,
        tagline: gameData.tagline,
        genre: gameData.genre,
        subgenre: gameData.subgenre,
        primaryColor: gameData.primaryColor,
        promptName: gameData.promptName,
        promptModel: gameData.promptModel,
        promptText: gameData.promptText,
        promptVaultUuid: gameData.promptVaultUuid,
        agentPlan: (gameData.agentPlan as Prisma.InputJsonValue | undefined) ?? undefined,
        private: ctx.targetPrivate,
        generationStatus: 'ready',
        generationError: null,
      },
    })

    // Cover image — best-effort, the game page also kicks this off lazily.
    const savedGame = await GameDatabaseService.getGameBySlug(slug)
    if (savedGame) {
      ImageGenerationService.generateGameImage(savedGame).then(async (result) => {
        if (result.imageUrl) {
          await GameDatabaseService.updateGameImage(gameId, result.imageUrl)
        }
      }).catch((err) => {
        logger.error('Cover image generation failed:', err, { gameId })
      })
    }

    await enrichGameInBackground(gameId, slug, gameData, ctx.articleText)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    logger.error('Async story generation failed', err, { gameId, slug })
    await prisma.game.update({
      where: { id: gameId },
      data: { generationStatus: 'failed', generationError: message },
    }).catch((updateErr) => {
      logger.error('Failed to mark generation failed', updateErr, { gameId })
    })
  }
}

/**
 * Secret panel + hypercert enrichment. Non-blocking — failures do not affect
 * the game. Moved here from the generate route so the async finalize path and
 * the retry route share it.
 */
export async function enrichGameInBackground(
  gameId: string,
  gameSlug: string,
  gameData: GameGenerationResponse,
  articleText?: string,
  _writerCoinId?: string
): Promise<void> {
  // Generate secret panel and store it for Inco on-chain encryption at mint time.
  try {
    const secretPanel = await GameAIService.generateSecretPanel(
      {
        title: gameData.title,
        description: gameData.description,
        genre: gameData.genre,
        tagline: gameData.tagline,
      },
      articleText?.substring(0, 800)
    )

    const secretPanelJson = JSON.stringify(secretPanel)

    // Store the plaintext temporarily in the DB.
    // It will be encrypted on-chain via SecretPanelVault.storeSecretPanel()
    // when the game is minted (tokenId becomes available).
    await prisma.game.update({
      where: { id: gameId },
      data: {
        secretPanelCiphertext: secretPanelJson,
        secretPanelImagePrompt: secretPanel.imagePrompt,
        secretPanelGenerated: true,
      },
    })

    logger.info('Secret panel generated for Inco encryption at mint time', {
      gameId,
      encryption: 'inco',
    })
  } catch (err) {
    logger.error('Secret panel generation failed', err, { gameId })
  }

  // Create hypercert impact certificate
  try {
    if (config.hypercerts.enabled) {
      const {
        createGameHypercert,
        buildGameHypercertInput,
      } = await import('@/lib/integrations/hypercerts')

      const hypercertInput = buildGameHypercertInput({
        gameTitle: gameData.title,
        gameDescription: gameData.description,
        genre: gameData.genre,
        articleTitle: articleText ? 'Source Article' : undefined,
      })

      const result = await createGameHypercert(hypercertInput)

      if (result) {
        await prisma.game.update({
          where: { id: gameId },
          data: {
            hypercertUri: result.uri,
            hypercertCid: result.cid,
          },
        })

        logger.hypercerts('Hypercert created and linked', {
          gameId,
          slug: gameSlug,
          uri: result.uri,
        })
      }
    }
  } catch (err) {
    logger.error('Hypercert creation failed (non-blocking)', err, {
      gameId,
    })
  }
}
