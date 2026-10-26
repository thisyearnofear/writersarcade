import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { prisma } from '@/lib/database'
import { z } from 'zod'
import { UserAIPreferenceService } from '@/lib/user-ai-preferences.service'
import { isFeatureEnabled, logger } from '@/lib/config'
import { Prisma } from '@prisma/client'

// The opening panel streams an LLM generation; without an explicit limit the
// function dies on the platform default mid-stream and the client sees a
// silently truncated SSE (no 'end' event). 120s covers the primary +
// fallback provider path.
export const maxDuration = 120

const startGameSchema = z.object({
  sessionId: z.string().uuid(),
  ref: z.string().max(200).optional(),
  embedded: z.boolean().optional(),
  dailyChallenge: z.object({
    incoSessionId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  }).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await context.params

    const body = await request.json()
    const { sessionId, ref, embedded, dailyChallenge } = startGameSchema.parse(body)
    
    // Get game by slug
    const game = await GameDatabaseService.getGameBySlug(params.slug)
    
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }
    
    // Verify session exists
    const session = await prisma.session.findFirst({
      where: { sessionId }
    })
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 400 }
      )
    }

    // Resonance: record the start once per (game, session). Non-blocking.
    try {
      const existingStart = await prisma.gamePlayEvent.findFirst({
        where: { gameId: game.id, sessionId, type: 'started' },
        select: { id: true },
      })
      if (!existingStart) {
        await prisma.gamePlayEvent.create({
          data: {
            gameId: game.id,
            type: 'started',
            sessionId,
            referrer: ref || request.headers.get('referer')?.slice(0, 200) || null,
            embedded: embedded ?? false,
          },
        })
      }
    } catch (eventError) {
      logger.error('Start event write failed (non-blocking):', eventError)
    }
    
    // Create system message for game start
    const systemMessage = await prisma.chat.create({
      data: {
        sessionId: session.id,
        gameId: game.id,
        userId: session.userId,
        role: 'system',
        content: `Starting game: ${game.title}`,
        model: `${game.promptModel}:StartGame-v2`,
      }
    })
    
    // Start streaming response
    const encoder = new TextEncoder()

    // Assistant-row persistence lives outside start() so cancel() can flush
    // partial content on client disconnect. The row is created lazily on
    // first content — waiting for 'end' orphaned rows whenever a stream died
    // mid-flight (leaving 'started' events that never closed, which poisoned
    // the Resonance funnel).
    let assistantContent = ''
    let assistantRowId: Promise<string | null> | null = null
    const persistAssistant = (): Promise<unknown> => {
      if (!assistantContent) return Promise.resolve()
      if (!assistantRowId) {
        assistantRowId = prisma.chat.create({
          data: {
            parentId: systemMessage.id,
            sessionId: session.id,
            gameId: game.id,
            userId: session.userId,
            role: 'assistant',
            content: assistantContent,
            model: game.promptModel,
          }
        }).then((row) => row.id).catch((err) => {
          logger.error('Assistant message persist failed:', err)
          return null
        })
        return assistantRowId
      }
      return assistantRowId.then(async (id) => {
        if (!id) return
        await prisma.chat.update({ where: { id }, data: { content: assistantContent } })
      }).catch((err) => logger.error('Assistant message update failed:', err))
    }

    const stream = new ReadableStream({
      async start(controller) {
        // SSE keepalive — the edge drops responses that stay silent before the
        // first byte (~20-30s); provider latency + model fallbacks make that
        // window real, and the client reads the drop as a dead stream.
        const keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('data: {"type":"keepalive"}\n\n'))
          } catch { /* controller closed */ }
        }, 10_000)
        try {
          // Get user AI preferences
          const userPreferences = await UserAIPreferenceService.getUserPreferences()

          let gameStream
          let agenticUsed = false

          // Phase 2: agentic opening panel (ToolLoopAgent) when enabled + plan exists.
          const openingBeat = game?.agentPlan?.arc?.[0]
          if (isFeatureEnabled('agentTools') && openingBeat) {
            try {
              const { streamAgenticPanel, generateAgenticPanelOrThrow, chargeAgentPanel } = await import(
                '@/domains/games/services/panel-agent.service'
              )
              // Wire a real paid-panel payment (no-op unless FEATURE_AGENT_PAID_PANELS).
              const mediaCharge = await chargeAgentPanel({
                userId: session.userId,
                gameId: game.id,
                slug: game.slug,
              })
              const panel = await generateAgenticPanelOrThrow(
                {
                  genre: game.genre,
                  title: game.title,
                  articleText: game.articleContext || game.promptText || game.description,
                  modelLabel: game.promptModel || 'gpt-4o-mini',
                  mediaCharge: mediaCharge ?? undefined,
                },
                openingBeat,
                `You are opening the comic "${game.title}". Begin the story for the player.`
              )
              gameStream = streamAgenticPanel(panel)
              agenticUsed = true
              if (panel.traces.length && game.id) {
                try {
                  const existing = ((game as unknown as { agentTraces?: unknown[] }).agentTraces as unknown[]) ?? []
                  await prisma.game.update({
                    where: { id: game.id },
                    data: { agentTraces: [...existing, ...panel.traces] as Prisma.InputJsonValue },
                  })
                } catch (traceError) {
                  logger.error('agentTraces persist failed (non-blocking):', traceError)
                }
              }
            } catch (agentError) {
              logger.error('Agentic opening panel failed, falling back:', agentError)
            }
          }

          if (!agenticUsed && dailyChallenge?.incoSessionId && process.env.FEATURE_DAILY_CHALLENGE === 'true') {
            const { getModifierPromptForPanel } = await import('@/lib/daily-challenge')
            const modifierPrompt = await getModifierPromptForPanel(
              dailyChallenge.incoSessionId,
              0
            )

            const basePrompt = game.articleContext || game.promptText || game.description

            if (modifierPrompt) {
              gameStream = GameAIService.generatePanelWithModifier(
                modifierPrompt,
                0,
                basePrompt,
                [],
                userPreferences,
                game?.agentPlan
              )
            } else {
              gameStream = GameAIService.startGame(
                {
                  title: game.title,
                  description: game.description,
                  genre: game.genre,
                  subgenre: game.subgenre,
                  tagline: game.tagline,
                },
                sessionId,
                game.promptModel,
                game.articleContext,
                userPreferences,
                game?.agentPlan
              )
            }
          } else {
            gameStream = GameAIService.startGame(
              {
                title: game.title,
                description: game.description,
                genre: game.genre,
                subgenre: game.subgenre,
                tagline: game.tagline,
              },
              sessionId,
              game.promptModel,
              game.articleContext,
              userPreferences,
              game?.agentPlan
            )
          }

          for await (const response of gameStream) {
            const data = `data: ${JSON.stringify(response)}\n\n`
            controller.enqueue(encoder.encode(data))

            if (response.type === 'content') {
              assistantContent += response.content
              void persistAssistant()
            }

            // Final content sync when done
            if (response.type === 'end') {
              await persistAssistant()
            }
          }

          controller.close()
        } catch (error) {
          logger.error('Game start streaming error:', error)
          await persistAssistant()
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to start game'
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        } finally {
          clearInterval(keepalive)
        }
      },
      async cancel() {
        // Client disconnected mid-stream — flush whatever content arrived.
        try { await persistAssistant() } catch { /* best-effort */ }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error) {
    logger.error('Game start error:', error)
    
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
      { success: false, error: 'Failed to start game' },
      { status: 500 }
    )
  }
}