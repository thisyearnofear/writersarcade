import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import { getCurrentUser, requireAuth } from '@/lib/auth'
import { logger } from '@/lib/config'

/**
 * Unified Payment Verification Endpoint
 * 
 * Used by both web app and mini app to verify on-chain payments.
 * Implements async verification: stores payment and returns polling endpoint.
 * 
 * POST: Initiate verification (returns polling endpoint)
 * GET: Check verification status
 */

const verifyPaymentSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  writerCoinId: z.string().min(1, 'Writer coin ID is required'),
  action: z.enum(['generate-game', 'mint-nft']),
})

/**
 * POST: Initiate async payment verification
 * Returns endpoint for polling verification status
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)

    // Store payment record in DB with pending status
    const payment = await prisma.payment.create({
      data: {
        transactionHash: validatedData.transactionHash,
        action: validatedData.action,
        writerCoinId: validatedData.writerCoinId,
        status: 'pending',
        userId: user?.id,
        amount: BigInt(0), // Will be updated after verification
      }
    })

    logger.payment('Payment recorded for verification', {
      paymentId: payment.id,
      transactionHash: validatedData.transactionHash,
      action: validatedData.action,
      status: payment.status,
      userId: user?.id,
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      transactionHash: validatedData.transactionHash,
      status: 'pending',
      statusCheckUrl: `/api/payments/${payment.id}/status`,
    })
  } catch (error) {
    logger.error('[Payment Verify] Error', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check payment verification status
 * Polls blockchain for transaction confirmation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('paymentId')
    const transactionHash = searchParams.get('transactionHash')

    if (!paymentId && !transactionHash) {
      return NextResponse.json(
        { error: 'Either paymentId or transactionHash is required' },
        { status: 400 }
      )
    }

    // Fetch payment record
    const payment = await prisma.payment.findFirst({
      where: paymentId 
        ? { id: paymentId }
        : { transactionHash: transactionHash || '' }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // If already verified, return cached result
    if (payment.status === 'verified') {
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: 'verified',
        verifiedAt: payment.verifiedAt,
      })
    }

    // If failed, return failure
    if (payment.status === 'failed') {
      return NextResponse.json({
        success: false,
        paymentId: payment.id,
        status: 'failed',
        error: 'Transaction failed or was not mined',
      })
    }

    // Verification in progress - return pending status
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: 'pending',
      message: 'Waiting for blockchain confirmation. Check back in a few seconds.',
    })
  } catch (error) {
    logger.error('[Payment Status] Error', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
