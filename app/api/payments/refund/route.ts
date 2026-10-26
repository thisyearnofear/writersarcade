import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/config'
import { CREDITS_CONFIG } from '@/lib/writer-coins'

/**
 * Refund a generate-game payment as credits when generation failed to
 * produce a usable game. Idempotent: the payment's status transition
 * (verified -> failed) is the guard — second call returns alreadyRefunded.
 * Covers credits, MUSD, and writer-coin payments alike (crypto refunds
 * aren't feasible on-chain, so we credit the account).
 */
export async function POST(req: NextRequest) {
  try {
    const { transactionHash, paymentId } = await req.json()
    if (!transactionHash && !paymentId) {
      return NextResponse.json({ success: false, error: 'Missing payment reference' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: {
        action: 'generate-game',
        ...(transactionHash ? { transactionHash } : { id: paymentId }),
      },
      select: { id: true, status: true, userId: true, walletAddress: true },
    })
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 })
    }
    if (payment.status !== 'verified') {
      return NextResponse.json({ success: true, data: { alreadyRefunded: true } })
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
      return NextResponse.json({ success: false, error: 'No account found to credit' }, { status: 400 })
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

    if (!result) return NextResponse.json({ success: true, data: { alreadyRefunded: true } })
    return NextResponse.json({ success: true, data: { credited: cost } })
  } catch (error) {
    logger.error('Payment refund failed:', error)
    return NextResponse.json({ success: false, error: 'Refund failed' }, { status: 500 })
  }
}
