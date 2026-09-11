import { NextRequest, after } from 'next/server'
import { prisma } from '@/lib/database'
import { ok, fail } from '@/lib/api-response'
import { queueAutoFilmIfEligible } from '@/domains/games/services/montage-generation.service'

/**
 * PATCH /api/games/[slug]/play
 * Increments the play counter for a game and logs a play event.
 * Called when a play session completes.
 *
 * Side effects (post-response):
 * - Subsidized auto-film: queues the montage pipeline for free when eligible
 *   (capped daily via filmAutoQueuedAt; skipped entirely for games with paid
 *   video activity so it never collides with a purchase).
 *
 * Returns endingStats — the player's choice-path rarity, derived from choice
 * events across completed sessions. Honest scarcity for the share card.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Optional sessionId ties the completion to its started/choice events
    const sessionId: string | null = await request
      .json()
      .then((body) => (typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 64) : null))
      .catch(() => null)

    const game = await prisma.game.update({
      where: { slug },
      data: {
        playCount: { increment: 1 },
        lastPlayedAt: new Date(),
      },
    })

    // Log a play event for trend analytics
    await prisma.gamePlayEvent.create({
      data: {
        gameId: game.id,
        type: 'completed',
        sessionId,
        playedAt: new Date(),
      },
    })

    // Rarity: each session's ordered choice indexes form a path signature.
    // Compare this session's path against every other session's — a claim
    // that is only meaningful (and only shown) with a real player base.
    let endingStats: {
      totalRuns: number
      samePathRuns: number
      uniquePath: boolean
    } | null = null
    if (sessionId) {
      try {
        const paths = await prisma.$queryRaw<Array<{ sessionId: string; path: string }>>`
        SELECT "sessionId",
               string_agg(("choiceIndex")::text, ',' ORDER BY "panelIndex") AS path
        FROM "game_play_events"
        WHERE "gameId" = ${game.id}
          AND "type" = 'choice'
          AND "sessionId" IS NOT NULL
        GROUP BY "sessionId"
      `
      const mine = paths.find((p) => p.sessionId === sessionId)?.path
      if (mine) {
        const samePathRuns = paths.filter((p) => p.path === mine).length
        endingStats = {
          totalRuns: paths.length,
          samePathRuns,
          uniquePath: samePathRuns === 1 && paths.length > 1,
        }
      }
      } catch {
        // Non-critical — rarity stats are a share-card nicety, never a blocker.
      }
    }

    try {
      after(async () => {
        try {
          await queueAutoFilmIfEligible(game.id)
        } catch (err) {
          console.error('[play-route] auto-film queue failed:', err)
        }
      })
    } catch {
      // after() throws outside a Next request scope (e.g. unit tests).
    }

    return ok({ playCount: game.playCount, lastPlayedAt: game.lastPlayedAt, endingStats })
  } catch (error) {
    console.error('[play-route] Failed to increment play count:', error)
    return fail('Failed to increment play count', 500)
  }
}
