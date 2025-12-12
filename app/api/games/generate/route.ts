import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import type { GameGenerationResponse } from '@/domains/games/types'
import { optionalAuth } from '@/lib/auth'
import { z } from 'zod'

// Request validation schema
const generateGameSchema = z.object({
  promptText: z.string().optional(),
  url: z.string().url().optional(),
  // Optional game mode: "story" (default) or "wordle" (article-derived word puzzle)
  mode: z.enum(['story', 'wordle']).optional(),
  customization: z.object({
    genre: z.enum(['horror', 'comedy', 'mystery']).optional(),
    difficulty: z.enum(['easy', 'hard']).optional(),
  }).optional(),
  payment: z.object({
    writerCoinId: z.string().optional(),
  }).optional(),
  model: z.string().optional(),
  promptName: z.string().optional(),
  private: z.boolean().optional(),
  assetIds: z.array(z.string()).optional(), // New: Link to parent assets
}).refine(
  (data) => data.promptText || data.url,
  "Either promptText or url must be provided"
)

export async function POST(request: NextRequest) {
  try {
    console.log('Game generation request received')

    const body = await request.json()
    console.log('Request body received:', { hasUrl: !!body.url, hasPromptText: !!body.promptText, mode: body.mode })

    // Validate request
    const validatedData = generateGameSchema.parse(body)
    const mode = validatedData.mode ?? 'story'

    //     // Get current user (optional)
    const user = await optionalAuth()
    console.log('User auth result:', { userId: user?.id, userWallet: user?.walletAddress })

    let processedPrompt = validatedData.promptText || ''
    let processedContent

    // If URL provided, extract and process content
    if (validatedData.url && ContentProcessorService.isValidUrl(validatedData.url)) {
      try {
        processedContent = await ContentProcessorService.processUrl(validatedData.url)

        // Only generate prompt from article if promptText wasn't explicitly provided
        // This allows the Workshop to pass a custom "Compiled Asset Context" while still linking the URL for attribution
        if (!validatedData.promptText) {
          // Extract article themes for thematic game design
          const articleThemes = ContentProcessorService.extractArticleThemes(
            processedContent.text,
            processedContent.title
          )

          processedPrompt = `Create a game based on this article: "${processedContent.title || 'Untitled'}"

ARTICLE SOURCE MATERIAL:
Author: ${processedContent.author || 'Unknown'} | Publication: ${processedContent.publicationName || 'Unknown'} | ${processedContent.wordCount} words

THEMATIC ESSENCE (use to inspire authentic game mechanics):
${articleThemes}

FULL ARTICLE TEXT (preserve the original author's voice and ideas):
${processedContent.text}

DESIGN IMPERATIVE:
Your game MUST authentically interpret this article's core themes. Players should play this game and think differently about the concepts ${processedContent.author || 'the author'} presents. This game is a derivative work that honors the original author's ideas while offering a unique, interactive interpretation.`
        }
      } catch (error) {
        console.error('Content processing failed:', error)
        // Re-throw with better message
        const message = error instanceof Error ? error.message : 'Failed to process URL'
        throw new Error(`URL processing failed: ${message}`)
      }
    }

    // In Wordle mode we require a URL so we can derive the puzzle from the article
    if (mode === 'wordle' && !validatedData.url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wordle mode requires an article URL.',
        },
        { status: 400 }
      )
    }

    let gameData: GameGenerationResponse
    let wordleAnswer: string | undefined

    if (mode === 'wordle') {
      if (!processedContent) {
        throw new Error('Failed to process article content for Wordle mode')
      }

      const answer = WordleService.deriveAnswerFromText(processedContent.text)
      wordleAnswer = answer

      gameData = {
        title: processedContent.title
          ? `Wordle: ${processedContent.title}`
          : 'Article Wordle',
        description:
          'A Wordle-style puzzle derived from the core language of this article. Guess the key word inspired by the source material.',
        tagline: processedContent.title
          ? `Guess a key word inspired by "${processedContent.title}"`
          : 'Guess a key word inspired by this article.',
        genre: 'Wordle',
        subgenre: 'Puzzle',
        primaryColor: '#fbbf24', // Amber, distinct from core horror/comedy/mystery palette
        promptModel: 'wordle-engine',
        promptName: 'Wordle-Article-v1',
        promptText: `Article-derived Wordle answer of length ${answer.length}.`,
        mode: 'wordle',
      }

      console.log('Wordle game generated from article:', {
        title: gameData.title,
        answerLength: answer.length,
      })
    } else {
      // Build game generation request with optional customization
      const gameRequest = {
        promptText: processedPrompt,
        url: validatedData.url,
        customization: validatedData.customization,
        model: validatedData.model,
        promptName: validatedData.promptName,
        private: validatedData.private,
        payment: validatedData.payment,
      }

      // Generate game using consolidated AI service
      console.log('Calling GameAIService.generateGame with prompt length:', gameRequest.promptText?.length)
      const aiGameData = await GameAIService.generateGame(gameRequest)
      console.log('AI generation successful:', { title: aiGameData.title, genre: aiGameData.genre })

      gameData = {
        ...aiGameData,
        mode: 'story' as const,
      }
    }

    // Save to database using enhanced database service  
    const miniAppData = processedContent ? {
      articleUrl: validatedData.url,
      difficulty: validatedData.customization?.difficulty,
      writerCoinId: validatedData.payment?.writerCoinId,
      wordleAnswer,
      authorWallet: processedContent.authorWallet,
      authorParagraphUsername: processedContent.author, // Extract from URL parsing
      publicationName: processedContent.publicationName,
      publicationSummary: processedContent.publicationSummary,
      subscriberCount: processedContent.subscriberCount,
      articlePublishedAt: processedContent.publishedAt,
      // Include comprehensive article context for authentic game narrative continuity
      articleContext: `Article: "${processedContent.title}"\nAuthor: ${processedContent.author || 'Unknown'}\nPublication: ${processedContent.publicationName || 'Unknown'}\n\nCore Themes:\n${ContentProcessorService.extractArticleThemes(processedContent.text, processedContent.title)}\n\nKey excerpt:\n${processedContent.text.substring(0, 800)}...`,
    } : undefined

    // Enhance game data with attribution
    const enhancedGameData = {
      ...gameData,
      creatorWallet: user?.walletAddress,
    }

    console.log('About to save game to database:', {
      title: enhancedGameData.title,
      hasUserId: !!user?.id,
      hasMiniAppData: !!miniAppData,
      creatorWallet: enhancedGameData.creatorWallet,
    })
    const savedGame = await GameDatabaseService.createGame(enhancedGameData, user?.id, miniAppData, validatedData.assetIds)
    console.log('Game saved successfully:', { id: savedGame.id, slug: savedGame.slug })

    return NextResponse.json({
      success: true,
      data: {
        ...gameData,
        id: savedGame.id,
        slug: savedGame.slug,
        createdAt: savedGame.createdAt,
        authorParagraphUsername: savedGame.authorParagraphUsername,
      },
    })

  } catch (error) {
    console.error('Game generation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate game. Please try again.'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Get recent games for homepage
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const genre = searchParams.get('genre') || undefined
    const featured = searchParams.get('featured') === 'true'

    // Fetch games from database
    const result = await GameDatabaseService.getGames({
      limit,
      offset,
      search,
      genre,
      featured,
      includePrivate: false, // Public API endpoint
    })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Get games error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}