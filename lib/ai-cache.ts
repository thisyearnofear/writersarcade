/**
 * AI Generation Cache
 *
 * Caches game generation results so identical requests (same actor +
 * article URL + genre + difficulty, or same payment) return the cached
 * result for 24 hours. This reduces AI API costs and speeds up repeat
 * generations.
 *
 * Also provides cross-instance request deduplication so concurrent identical
 * requests share one in-flight generation, even across Vercel serverless
 * instances (see `deduplicateGeneration`).
 */

import { cacheGet, cacheSet } from './cache'
import { withSharedGenerationLock } from './generation-lock'

const GENERATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface GenerationCacheKey {
  url?: string
  genre?: string
  difficulty?: string
  mode: 'story' | 'wordle'
  actorId?: string
  paymentId?: string
}

/**
 * Build a deterministic cache key from generation parameters.
 *
 * If a `paymentId` is present it is used as the primary idempotency key so
 * a paid generation can never run twice for the same payment. Otherwise the key
 * is scoped to the actor and the article/genre/difficulty so different users
 * or different requests do not collide.
 */
export function buildGenerationCacheKey(params: GenerationCacheKey): string {
  if (params.paymentId) {
    return `ai:gen:payment:${params.paymentId}`
  }
  const parts = [
    'ai:gen',
    params.mode,
    params.actorId || '',
    params.url || '',
    params.genre || '',
    params.difficulty || '',
  ]
  return parts.join(':')
}

/**
 * Try to read a cached generation result.
 */
export function getCachedGeneration<T>(key: string): T | null {
  return cacheGet<T>(key, GENERATION_CACHE_TTL_MS)
}

/**
 * Write a generation result to cache.
 */
export function setCachedGeneration<T>(key: string, data: T): void {
  cacheSet(key, data)
}

/**
 * Execute a generation function with deduplication — concurrent calls with
 * the same cache key share one in-flight generation across Vercel instances.
 *
 * Successful results are persisted in the shared `GenerationLock` record for
 * 24h, so later duplicate requests can return the cached result without
 * re-running `fn`.
 */
export function deduplicateGeneration<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withSharedGenerationLock(key, fn)
}
