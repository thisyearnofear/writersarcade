#!/usr/bin/env node
/**
 * Listing-visibility audit.
 *
 * Fails loudly when a freshly generated, publishable game is missing from the
 * public listing filter — the regression that made generated games invisible
 * in the arcade until somebody played them.
 *
 * Usage: node scripts/maintenance/audit-listing.mjs
 * Exit 0 = healthy. Exit 1 = a ready+public game from the last 24h is excluded
 * by the provenance filter.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { config } from 'dotenv'
config({ path: '.env.local' }); config({ path: '.env' })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}
const { neonConfig } = await import('@neondatabase/serverless')
neonConfig.webSocketConstructor = ws
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

// Must mirror the requireProvenance clause in
// domains/games/services/game-database.service.ts
const provenance = {
  OR: [
    { writerCoinId: { not: null } },
    { paymentId: { not: null } },
    { ownershipSource: { in: ['free_demo', 'credits_user', 'payment_wallet'] } },
  ],
}

const recent = await prisma.game.findMany({
  where: {
    private: false,
    generationStatus: 'ready',
    createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  },
  select: { slug: true, ownershipSource: true, writerCoinId: true, paymentId: true },
})

const visible = await prisma.game.findMany({
  where: { AND: [{ private: false }, provenance, { generationStatus: { not: 'failed' } }] },
  select: { slug: true },
})
const visibleSlugs = new Set(visible.map((g) => g.slug))

const missing = recent.filter((g) => !visibleSlugs.has(g.slug))
console.log(`public+ready games (24h): ${recent.length}, visible in listing: ${visible.length}`)
if (missing.length > 0) {
  console.error('INVISIBLE:', missing.map((g) => `${g.slug} (source=${g.ownershipSource})`).join(', '))
  await prisma.$disconnect()
  process.exit(1)
}
console.log('OK — every recent publishable game appears in the listing')
await prisma.$disconnect()
