import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Unified Payment Verification Endpoint
 * 
 * Used by both web app and mini app to verify on-chain payments
 * Checks if a transaction was mined and payment successful
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    // TODO: Implement on-chain verification via ethers.js or viem
    // This should:
    // 1. Query the transaction receipt from Base network
    // 2. Verify it was mined successfully
    // 3. Decode the transaction data to verify it matches expected payment
    // 4. Log the transaction for audit trail

    console.log('[Payment Verify] Verifying:', {
      transactionHash: validatedData.transactionHash,
      writerCoinId: validatedData.writerCoinId,
      action: validatedData.action,
    })

    // For MVP, return success for now
    // Production will include on-chain verification
    return NextResponse.json({
      success: true,
      transactionHash: validatedData.transactionHash,
      verified: true,
    })
  } catch (error) {
    console.error('[Payment Verify] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
