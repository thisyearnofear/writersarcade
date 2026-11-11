import { NextRequest } from 'next/server'
import { apiHandler, ok } from '@/lib/api-response'
import { collectTitleCards, fallbackTitleCards } from '@/domains/games/services/title-cards.service'

/**
 * GET /api/title-cards — cover imagery for the shared loading title sequence.
 *
 * Public: the cards are already public artefacts, and the loading reel must
 * work for a visitor with no session.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const exclude = request.nextUrl.searchParams.get('exclude') ?? undefined
  const cards = await collectTitleCards(exclude)
  return ok({ cards: cards.length > 0 ? cards : fallbackTitleCards() })
})
