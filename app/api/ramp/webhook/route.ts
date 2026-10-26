import { prisma } from '@/lib/prisma'
import {
  type RampWebhookPayload,
  verifyWebhookSignature,
} from '@/lib/integrations/etherfuse'
import { reportServerError } from '@/services/error-reporting'
import { logger } from '@/lib/config'
import { ok, fail, apiHandler } from '@/lib/api-response'

export const POST = apiHandler(async (request) => {
  {
    const bodyText = await request.text()
    const signature = request.headers.get('x-etherfuse-signature') || ''

    if (!await verifyWebhookSignature(bodyText, signature)) {
      return fail('Invalid signature', 401)
    }

    const payload: RampWebhookPayload = JSON.parse(bodyText)

    const transaction = await prisma.creditTransaction.findFirst({
      where: { etherfuseOrderId: payload.orderId },
      include: { user: true },
    })

    if (!transaction) {
      return fail('Order not found', 404)
    }

    // Idempotency: never credit a completed order twice (webhook replay guard).
    if (transaction.status === 'completed') {
      return ok({ received: true, idempotent: true })
    }

    if (payload.event === 'order.completed') {
      await prisma.$transaction([
        prisma.creditTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: transaction.userId },
          data: {
            credits: { increment: transaction.creditAmount },
            totalCreditsPurchased: { increment: transaction.creditAmount },
          },
        }),
      ])

      logger.info(
        `[Ramp Webhook] Credited ${transaction.creditAmount} to user ${transaction.userId}`
      )
    } else if (payload.event === 'order.failed') {
      await prisma.creditTransaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      })

      logger.warn(
        `[Ramp Webhook] Order ${payload.orderId} failed`
      )
    }

    return ok({ received: true })
  }
}, {
  onError: (error) => {
    logger.error('[Ramp Webhook] Error:', error)
    reportServerError(error, { route: '/api/ramp/webhook' })
    return fail('Webhook processing failed', 500)
  },
})
