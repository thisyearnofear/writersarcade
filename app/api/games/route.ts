import { NextRequest } from 'next/server'
import { getPublicGamesWithClips } from '@/domains/games/services/public-games.service'
import { ok, fail } from '@/lib/api-response'

// NOTE: The POST (game creation) endpoint lives at /api/games/generate.
// This file handles the GET listing only, so client components can call
// GET /api/games?limit=12&offset=0&search=...&genre=...&featured=true
// without importing server-side Prisma services.

// The listing is one indexed findMany + count — cheap. The old 60s
// in-process cache was per-Vercel-instance and could never be invalidated,
// so every instance served a different stale list. The CDN caches at the
// edge instead, with a short window + SWR.
const LISTING_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const genre = searchParams.get('genre') || undefined
    const featured = searchParams.get('featured') === 'true'
    const writerCoinId = searchParams.get('writerCoinId') || undefined
    const requireFunding = searchParams.get('requireFunding') === 'true'
    const requireImage = searchParams.get('requireImage') === 'true'
    const includeLegacy = searchParams.get('includeLegacy') === 'true'
    // Artifact presence is derived from *play* (panel rows are written
    // mid-playthrough), so it must stay opt-in — gating listings on it hid
    // every freshly generated game until somebody played it.
    const requireArtifact = searchParams.get('requireArtifact') === 'true'
    // Provenance is the listing gate: wallet/credits/free-demo games are
    // publishable; only pre-funding legacy rows are excluded. includeLegacy
    // remains as an alias for requireProvenance=false.
    const requireProvenance = searchParams.has('requireProvenance')
      ? searchParams.get('requireProvenance') === 'true'
      : !includeLegacy
    const sortByParam = searchParams.get('sortBy')
    const sortBy: 'recent' | 'playCount' = sortByParam === 'playCount' ? 'playCount' : 'recent'

    const result = await getPublicGamesWithClips({
      limit,
      offset,
      search,
      genre,
      featured,
      writerCoinId,
      requireFunding,
      requireImage,
      requireArtifact,
      requireProvenance,
      sortBy,
    })

    return ok(result, 200, { headers: LISTING_CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/games error:', error)
    return fail('Failed to fetch games', 500)
  }
}
