import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

function isPrismaUniqueViolation(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
}

const DEFAULT_LOCK_TTL_MS = 120_000
const DEFAULT_POLL_MS = 500
const DEFAULT_WAIT_MS = 120_000
const RESULT_TTL_MS = 24 * 60 * 60 * 1000
const FAILED_RETRY_MS = 5_000

export interface SharedLockOptions<T> {
  ttlMs?: number
  pollMs?: number
  waitMs?: number
  serialize?: (value: T) => unknown
  deserialize?: (value: unknown) => T
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function executeAsOwner<T>(
  lockId: string,
  fn: () => Promise<T>,
  options: SharedLockOptions<T>,
): Promise<T> {
  try {
    const result = await fn()
    const resultData = options.serialize ? options.serialize(result) : result
    await prisma.generationLock.update({
      where: { id: lockId },
      data: {
        status: 'completed',
        resultData: resultData as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + RESULT_TTL_MS),
      },
    })
    return result
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message.slice(0, 500) : 'Unknown generation error'
    await prisma.generationLock
      .update({
        where: { id: lockId },
        data: { status: 'failed', errorMessage, expiresAt: new Date(Date.now() + FAILED_RETRY_MS) },
      })
      .catch(() => {
        // Best-effort cleanup; the lease will expire naturally if this fails.
      })
    throw err
  }
}

async function waitForLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: Required<Pick<SharedLockOptions<T>, 'ttlMs' | 'pollMs' | 'waitMs'>> & SharedLockOptions<T>,
): Promise<T> {
  const deadline = Date.now() + options.waitMs
  let lastFailureMessage: string | null = null
  while (Date.now() < deadline) {
    const lock = await prisma.generationLock.findUnique({ where: { key } })

    if (!lock) {
      // Lock disappeared mid-flight; try to become the owner.
      try {
        const newLock = await prisma.generationLock.create({
          data: {
            key,
            status: 'pending',
            expiresAt: new Date(Date.now() + options.ttlMs),
          },
        })
        return executeAsOwner(newLock.id, fn, options)
      } catch (createErr: unknown) {
        if (isPrismaUniqueViolation(createErr)) {
          await sleep(options.pollMs)
          continue
        }
        throw createErr
      }
    }

    if (lock.status === 'completed') {
      if (lock.resultData === null || lock.resultData === undefined) {
        throw new Error('Generation lock completed without stored result')
      }
      return options.deserialize ? options.deserialize(lock.resultData) : (lock.resultData as T)
    }

    if (lock.status === 'failed' || lock.status === 'pending') {
      if (lock.status === 'failed' && lock.errorMessage) {
        lastFailureMessage = lock.errorMessage
      }
      if (lock.expiresAt < new Date()) {
        // Take over an expired lock by atomically updating only if it is still expired.
        // Failed leases get a short FAILED_RETRY_MS expiry, so a waiter transparently
        // retries the generation instead of surfacing "another request held the lock".
        const took = await prisma.generationLock.updateMany({
          where: {
            id: lock.id,
            status: lock.status,
            expiresAt: { lt: new Date() },
          },
          data: {
            status: 'pending',
            expiresAt: new Date(Date.now() + options.ttlMs),
            resultData: Prisma.DbNull,
            errorMessage: null,
          },
        })
        if (took.count > 0) {
          return executeAsOwner(lock.id, fn, options)
        }
      }
    }

    await sleep(options.pollMs)
  }

  throw new Error(
    lastFailureMessage
      ? `Generation failed: ${lastFailureMessage}`
      : 'Generation lock wait timeout'
  )
}

/**
 * Execute `fn` exactly once across Vercel serverless instances for a given `key`.
 *
 * - Creates a Postgres-backed lease in `GenerationLock`.
 * - If another request already holds the lease, this caller polls until it completes
 *   (or the lease expires, at which point it takes over).
 * - Completed results are retained for 24h, so later duplicate requests can return
 *   the cached result without re-running `fn`.
 */
export async function withSharedGenerationLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: SharedLockOptions<T> = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS

  try {
    const lock = await prisma.generationLock.create({
      data: {
        key,
        status: 'pending',
        expiresAt: new Date(Date.now() + ttlMs),
      },
    })
    return executeAsOwner(lock.id, fn, options)
  } catch (createErr: unknown) {
    if (isPrismaUniqueViolation(createErr)) {
      return waitForLock(key, fn, { ...options, ttlMs, pollMs, waitMs })
    }
    throw createErr
  }
}
