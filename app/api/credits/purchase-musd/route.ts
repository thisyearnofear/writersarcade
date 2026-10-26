import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { ok, fail, apiHandler } from '@/lib/api-response'
import { logger } from '@/lib/config'
import { reportServerError } from '@/services/error-reporting'
import { verifyMusdTreasuryTransfer, isMezoHolderOnChain } from '@/services/payments/payment-verifier'
import { MEZO_TESTNET_CHAIN_ID, MEZO_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

/**
 * Purchase credits with MUSD on Mezo.
 *
 * The user sends a plain `MUSD.transfer(treasury, amount)` on Mezo
 * (testnet or mainnet) and posts the transaction hash here. We verify the
 * transfer on-chain (sender = session wallet, recipient = platform treasury,
 * amount from the emitted Transfer event) and grant credits at
 * 10 credits per 1 MUSD (1 MUSD ≈ $1, 1 credit = $0.10).
 *
 * Idempotent: the transaction hash is stored as the Payment row's unique key
 * and as the CreditTransaction's externalRef — replays return the original
 * grant, and a hash registered under a different wallet/chain is rejected.
 */

const purchaseSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  chainId: z.number().int().refine(
    (id) => id === MEZO_TESTNET_CHAIN_ID || id === MEZO_MAINNET_CHAIN_ID,
    'chainId must be a Mezo network'
  ),
})

const ACTION = 'purchase-credits'
/** 1 credit per 0.1 MUSD (10 credits per 1 MUSD ≈ $1). */
const WEI_PER_CREDIT = 100_000_000_000_000_000n // 1e17
const MIN_WEI = WEI_PER_CREDIT

export const POST = apiHandler(async (request) => {
  {
    const actor = await getActor()
    const wallet = actor?.user.walletAddress?.toLowerCase()
    if (!actor || !wallet) {
      return fail('Wallet sign-in is required to buy credits with MUSD.', 401, { code: 'UNAUTHORIZED' })
    }

    const body = await request.json()
    const { transactionHash, chainId } = purchaseSchema.parse(body)

    // Idempotency: this tx hash may already be registered as a purchase.
    const existing = await prisma.payment.findUnique({ where: { transactionHash } })
    if (existing) {
      const sameIdentity =
        existing.action === ACTION &&
        existing.walletAddress?.toLowerCase() === wallet &&
        existing.chainId === chainId
      if (!sameIdentity) {
        return fail('This transaction hash is already registered for a different payment', 409, {
          code: 'PAYMENT_HASH_CONFLICT',
        })
      }
      const grant = await prisma.creditTransaction.findFirst({
        where: { externalRef: transactionHash, userId: actor.user.id },
      })
      if (existing.status === 'verified' && grant) {
        const refreshed = await prisma.user.findUnique({
          where: { id: actor.user.id },
          select: { credits: true },
        })
        return ok({
          creditsGranted: grant.creditAmount,
          creditsRemaining: refreshed?.credits ?? null,
          paymentId: existing.id,
          transactionHash,
          idempotent: true,
        })
      }
      // Registered but grant missing (earlier crash between writes) — fall
      // through to verification so the purchase can be completed.
    }

    const verified = await verifyMusdTreasuryTransfer({
      transactionHash: transactionHash as `0x${string}`,
      userAddress: wallet,
      chainId,
    })

    if (verified.amount < MIN_WEI) {
      return fail(`MUSD amount too small — minimum top-up is 0.1 MUSD (1 credit)`, 400, {
        code: 'AMOUNT_TOO_SMALL',
      })
    }

    // MEZO holders earn +10% credits on top-ups — MEZO as loyalty/utility
    // signal, consistent with the splitter's on-chain boost.
    const mezoHolderBoost = await isMezoHolderOnChain(wallet, chainId)
    const baseCredits = Number(verified.amount / WEI_PER_CREDIT)
    const creditsGranted = mezoHolderBoost ? Math.floor(baseCredits * 1.1) : baseCredits
    const fiatCentsEquivalent = Number((verified.amount * 100n) / 1_000_000_000_000_000_000n)
    const writerCoinId = `musd-${verified.network}`

    let paymentId: string
    let creditsRemaining: number
    try {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            transactionHash,
            action: ACTION,
            writerCoinId,
            amount: verified.amount.toString(),
            status: 'verified',
            verifiedAt: new Date(),
            userId: actor.user.id,
            walletAddress: wallet,
            chainId,
          },
        })
        await tx.creditTransaction.create({
          data: {
            userId: actor.user.id,
            externalRef: transactionHash,
            fiatAmount: fiatCentsEquivalent,
            fiatCurrency: 'USD',
            creditAmount: creditsGranted,
            status: 'completed',
            completedAt: new Date(),
            metadata: { method: 'musd', network: verified.network, chainId, transactionHash, mezoHolderBoost },
          },
        })
        const updatedUser = await tx.user.update({
          where: { id: actor.user.id },
          data: {
            credits: { increment: creditsGranted },
            totalCreditsPurchased: { increment: creditsGranted },
          },
          select: { credits: true },
        })
        return { paymentId: payment.id, credits: updatedUser.credits }
      })
      paymentId = result.paymentId
      creditsRemaining = result.credits
    } catch (txError) {
      // Concurrent identical request won the race — return its grant.
      if (typeof txError === 'object' && txError !== null && (txError as { code?: string }).code === 'P2002') {
        const payment = await prisma.payment.findUnique({ where: { transactionHash } })
        const grant = await prisma.creditTransaction.findFirst({
          where: { externalRef: transactionHash, userId: actor.user.id },
        })
        if (payment && grant) {
          const refreshed = await prisma.user.findUnique({
            where: { id: actor.user.id },
            select: { credits: true },
          })
          return ok({
            creditsGranted: grant.creditAmount,
            creditsRemaining: refreshed?.credits ?? null,
            paymentId: payment.id,
            transactionHash,
            idempotent: true,
          })
        }
      }
      throw txError
    }

    logger.payment('MUSD credit purchase verified', {
      paymentId,
      transactionHash,
      chainId,
      walletAddress: wallet,
      musdWei: verified.amount.toString(),
      creditsGranted,
    })

    return ok({
      creditsGranted,
      creditsRemaining,
      paymentId,
      transactionHash,
      network: verified.network,
      mezoHolderBoost,
      message: `Purchased ${creditsGranted} credits with MUSD`,
    })
  }
}, {
  onError: (error) => {
    logger.error('[Credits Purchase MUSD] Error:', error)
    reportServerError(error, { route: '/api/credits/purchase-musd' })
    if (error instanceof z.ZodError) {
      return fail('Invalid request', 400, {
        details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      })
    }
    // Mezo's public RPC can lag on its tx index — a just-mined tx may briefly
    // report "receipt could not be found". Surface as retryable, not a 500.
    if (error instanceof Error && /could not be found|receipt/i.test(error.message)) {
      return fail('Transaction not confirmed yet — retry in a few seconds', 409, {
        code: 'TX_NOT_CONFIRMED',
      })
    }
    return fail(error instanceof Error ? error.message : 'Failed to purchase credits', 500)
  },
})
