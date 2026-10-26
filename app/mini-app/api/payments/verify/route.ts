import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOnChainPayment } from '@/services/payments/payment-verifier'
import { getMintConfig } from '@/lib/writer-coins'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

/**
 * Verify an on-chain payment for a Farcaster mini-app action.
 *
 * Hardened: this delegates to the same `verifyOnChainPayment` used by the web
 * app (`/api/payments/verify`, `/api/games/mint`) instead of the previous
 * hand-rolled receipt check. That check only confirmed the receipt succeeded
 * and that `receipt.to` was the payment contract, so any successful
 * transaction to the contract — wrong function, wrong coin, wrong amount,
 * wrong sender — was reported to the client as a verified payment.
 *
 * The shared verifier enforces, and throws on any mismatch:
 *   1. Receipt succeeded, sender matches, destination is the payment contract.
 *   2. Calldata calls the expected payment function for the action, and (Base)
 *      the writer-coin argument matches the configured coin.
 *   3. The receipt emits the expected event for the action.
 *   4. Event sender matches, and the paid amount >= the configured cost.
 *
 * Note on auth: the mini-app runs inside a Farcaster client and has no SIWE
 * session cookie, so this route cannot use the session-bound `getActor()` gate
 * that `/api/payments/verify` uses. Verification is therefore cryptographic
 * rather than session-based: the transaction must have been sent *by* the
 * `userAddress` in the request, and the emitted event sender must match it too.
 * A caller cannot claim someone else's payment, because the on-chain sender is
 * checked against the address they claim.
 *
 * This route verifies and reports; it deliberately does not write a `Payment`
 * row. Nothing in the mini-app consumes a payment id — the mint flow confirms
 * through `/api/games/mint` (PATCH), which does its own verification and
 * persistence. Writing a second, unauthenticated payment record here would
 * duplicate that path rather than strengthen it.
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid user address'),
  gameId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    // Resolve the chain from the coin/action config rather than trusting a
    // client-supplied chainId — the verifier picks its RPC client from this.
    const chainId = getMintConfig(validatedData.writerCoinId)?.chainId ?? BASE_MAINNET_CHAIN_ID

    const verified = await verifyOnChainPayment({
      transactionHash: validatedData.transactionHash as `0x${string}`,
      writerCoinId: validatedData.writerCoinId,
      userAddress: validatedData.userAddress,
      action: validatedData.action,
      chainId,
    })

    return NextResponse.json({
      success: true,
      transactionHash: verified.txHash,
      action: validatedData.action,
      writerCoinId: validatedData.writerCoinId,
      chainId,
      amount: verified.amount,
      functionName: verified.functionName,
      message: `Payment for ${validatedData.action} verified`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    // Verification failures are client-actionable (wrong tx, wrong amount,
    // wrong coin, wrong sender) — surface the reason instead of a generic 500.
    const message = error instanceof Error ? error.message : 'Failed to verify payment'
    console.error('Mini-app payment verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
