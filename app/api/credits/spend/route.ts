import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { getActor } from '@/services/auth'
import { z } from 'zod'
import { ok, fail } from '@/lib/api-response'

const spendSchema = z.object({
  action: z.enum(['generate-game', 'mint-nft', 'play-wordle', 'video-upsell', 'video-montage', 'agent-panel']),
  gameId: z.string().optional(),
})

/** Signal an atomic-spend conflict (insufficient or concurrently-consumed balance). */
const SPEND_CONFLICT = Symbol('credits-spend-conflict')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = spendSchema.parse(body)
    const { action } = validated

    // Identity comes from the signed session cookie, never the request body.
    const actor = await getActor()
    if (!actor) {
      return fail('Sign in to spend credits.', 401)
    }
    const user = actor.user

    const cost = CREDITS_CONFIG.cost[action]
    if (!cost) {
      return fail(`Unknown action: ${action}`, 400, { code: 'INVALID_ACTION' })
    }

    // Fast-fail for an obviously insufficient balance (keeps the 402 contract).
    // The atomic guard below is what prevents concurrent overspend.
    if (user.credits < cost) {
      return fail(`Insufficient credits. You need ${cost} credits but have ${user.credits}.`, 402, {
        code: 'INSUFFICIENT_CREDITS',
        details: [`credits:${user.credits}`, `required:${cost}`],
      })
    }

    // Sentinel hash: never collides with real 0x tx hashes, satisfies the
    // unique constraint, and lets the generate route verify credits funding
    // through the same Payment lookup as on-chain payments.
    const sentinelHash = `credits:${randomBytes(16).toString('hex')}`

    // Atomic spend: decrement ONLY if the user still has >= cost. The conditional
    // updateMany makes the check-and-spend a single statement, so two concurrent
    // requests cannot both pass a stale balance check and overspend.
    let result: { updatedUser: { credits: number }; payment: { id: string } }
    try {
      result = await prisma.$transaction(async (tx) => {
        const reserved = await tx.user.updateMany({
          where: { id: user.id, credits: { gte: cost } },
          data: { credits: { decrement: cost } },
        })
        if (reserved.count === 0) {
          throw SPEND_CONFLICT
        }

        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { credits: true },
        })

        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            fiatAmount: 0,
            creditAmount: -cost,
            status: 'completed',
            completedAt: new Date(),
          },
        })

        const payment = await tx.payment.create({
          data: {
            transactionHash: sentinelHash,
            action,
            amount: cost,
            status: 'verified',
            verifiedAt: new Date(),
            writerCoinId: 'credits',
            userId: user.id,
            walletAddress: user.walletAddress ?? null,
          },
        })

        return { updatedUser, payment }
      })
    } catch (txError) {
      if (txError === SPEND_CONFLICT) {
        return fail(
          `Insufficient credits. You need ${cost} credits but your balance was already consumed.`,
          409,
          { code: 'SPEND_CONFLICT' }
        )
      }
      throw txError
    }

    return ok({
      creditsRemaining: result.updatedUser.credits,
      cost,
      action,
      paymentId: result.payment.id,
      message: `Paid ${cost} credits for ${action}`,
    })
  } catch (error) {
    console.error('[Credits Spend] Error:', error)
    if (error instanceof z.ZodError) {
      return fail('Invalid request', 400, {
        details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      })
    }
    return fail(error instanceof Error ? error.message : 'Failed to spend credits', 500)
  }
}