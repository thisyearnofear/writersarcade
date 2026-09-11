import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'
import { reportServerError } from '@/services/error-reporting'
import { logger } from '@/lib/config'

const requestSchema = z.object({
  url: z.string().url(),
  tone: z.string().max(200).optional(),
})

function getSecret(): string | undefined {
  return process.env.IMESSAGE_API_SECRET
}

export async function POST(request: NextRequest) {
  try {
    const secret = getSecret()
    const auth = request.headers.get('authorization')
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { url, tone } = requestSchema.parse(body)

    // Budget circuit-breaker — Flynn generations are platform-subsidized
    // (no wallet, no credits). Cap daily volume so a viral/abused number
    // can't run unbounded AI spend. Durable across serverless instances.
    const dailyCap = Number(process.env.IMESSAGE_DAILY_GAME_CAP || 100)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const createdToday = await prisma.game.count({
      where: { createdVia: 'imessage', createdAt: { gte: since } },
    })
    if (createdToday >= dailyCap) {
      return NextResponse.json(
        { success: false, error: 'Flynn is resting — too many stories today. Try again tomorrow.' },
        { status: 429 }
      )
    }

    // Same-article dedup: a second request for a URL that already produced a
    // ready game returns that game — cheaper, and a group chat ends up
    // sharing one artifact instead of N near-duplicates.
    const existing = await prisma.game.findFirst({
      where: {
        articleUrl: url,
        mode: 'story',
        generationStatus: 'ready',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, title: true },
    })
    if (existing) {
      const playUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/games/${existing.slug}`
      return NextResponse.json({
        success: true,
        deduplicated: true,
        data: { id: existing.id, slug: existing.slug, title: existing.title, playUrl },
      })
    }

    const processedContent = await ContentProcessorService.processUrl(url)
    const articleThemes = ContentProcessorService.extractArticleThemes(
      processedContent.text,
      processedContent.title
    )

    const processedPrompt = `Create a game based on this article: "${processedContent.title || 'Untitled'}"

ARTICLE SOURCE MATERIAL:
Author: ${processedContent.author || 'Unknown'} | Publication: ${processedContent.publicationName || 'Unknown'} | ${processedContent.wordCount} words

THEMATIC ESSENCE (use to inspire authentic game mechanics):
${articleThemes}

KEY EXCERPT:
${processedContent.text.substring(0, 1200)}

DESIGN IMPERATIVE:
Your game MUST authentically interpret this article's core themes. Players should play this game and think differently about the concepts the author presents.
${tone ? `\nTONE / MOOD REQUEST: ${tone}` : ''}`

    const userPreferences = await UserAIPreferenceService.getUserPreferences()
    const aiGameData = await GameAIService.generateGame(
      {
        promptText: processedPrompt,
        url,
      },
      0,
      userPreferences
    )

    const gameData = { ...aiGameData, mode: 'story' as const }

    const miniAppData = processedContent
      ? {
          articleUrl: url,
          articleContext: `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${articleThemes}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`,
          writerCoinId: undefined,
          authorParagraphUsername: processedContent.author,
          authorWallet: processedContent.authorWallet,
          publicationName: processedContent.publicationName,
          publicationSummary: processedContent.publicationSummary,
          subscriberCount:
            typeof processedContent.subscriberCount === 'number'
              ? Math.max(0, Math.floor(processedContent.subscriberCount))
              : undefined,
          articlePublishedAt:
            processedContent.publishedAt instanceof Date &&
            !Number.isNaN(processedContent.publishedAt.getTime())
              ? processedContent.publishedAt
              : undefined,
          ownerWallet: undefined,
          ownershipSource: 'free_demo' as const,
          paymentId: undefined,
          wordleAnswerVaultUuid: undefined,
          createdVia: 'imessage' as const,
        }
      : undefined

    const savedGame = await GameDatabaseService.createGame(
      gameData,
      undefined,
      miniAppData
    )

    after(async () => {
      try {
        const result = await ImageGenerationService.generateGameImage(savedGame)
        if (result.imageUrl) {
          await GameDatabaseService.updateGameImage(savedGame.id, result.imageUrl)
        }
      } catch (err) {
        logger.error('iMessage game cover image failed:', err)
      }
    })

    const playUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/games/${savedGame.slug}`

    return NextResponse.json({
      success: true,
      data: {
        id: savedGame.id,
        slug: savedGame.slug,
        title: savedGame.title,
        playUrl,
      },
    })
  } catch (error) {
    logger.error('/api/imessage/generate error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    reportServerError(error, { route: '/api/imessage/generate' })

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
