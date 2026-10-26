import { prisma } from '@/lib/database'
import { logger } from '@/lib/config'
import { CREDITS_CONFIG } from '@/lib/writer-coins'
import { ok, fail, apiHandler } from '@/lib/api-response'

/**
 * Refund a generate-game payment as credits when generation failed to
 * produce a usable game. Idempotent: the payment's status transition
 * (verified -> failed) is the guard — second call returns alreadyRefunded.
 * Covers credits, MUSD, and writer-coin payments alike (crypto refunds
 * aren't feasible on-chain, so we credit the account).
 */
export const POST = apiHandler(async (req) => {
  {
    const { transactionHash, paymentId } = await req.json()
    if (!transactionHash && !paymentId) {
      return fail('Missing payment reference')
    }

    const payment = await prisma.payment.findFirst({
      where: {
        action: 'generate-game',
        ...(transactionHash ? { transactionHash } : { id: paymentId }),
      },
      select: { id: true, status: true, userId: true, walletAddress: true },
    })
    if (!payment) {
      return fail('Payment not found', 404)
    }
    if (payment.status !== 'verified') {
      return ok({ alreadyRefunded: true })
    }

    // Resolve the account to credit — payment.userId, else by wallet.
    let userId = payment.userId
    if (!userId && payment.walletAddress) {
      const user = await prisma.user.findFirst({
        where: { walletAddress: { equals: payment.walletAddress, mode: 'insensitive' } },
        select: { id: true },
      })
      userId = user?.id ?? null
    }
    if (!userId) {
      return fail('No account found to credit')
    }

    const cost = Number(CREDITS_CONFIG.cost['generate-game'])
    const result = await prisma.$transaction(async (tx) => {
      const marked = await tx.payment.updateMany({
        where: { id: payment.id, status: 'verified' },
        data: { status: 'failed' },
      })
      if (marked.count !== 1) return false
      await tx.user.update({ where: { id: userId }, data: { credits: { increment: cost } } })
      await tx.creditTransaction.create({
        data: {
          userId,
          fiatAmount: 0,
          creditAmount: cost,
          status: 'refunded',
          completedAt: new Date(),
          metadata: { reason: 'generation_failed', paymentId: payment.id },
        },
      })
      return true
    })

    if (!result) return ok({ alreadyRefunded: true })
    return ok({ credited: cost })
  }
}, {
  onError: (error) => {
    logger.error('Payment refund failed:', error)
    return fail('Refund failed', 500)
  },
})
