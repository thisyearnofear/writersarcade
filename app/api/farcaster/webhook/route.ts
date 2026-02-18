import { NextRequest, NextResponse } from 'next/server'

/**
 * Farcaster Mini App Webhook Handler
 * 
 * Receives events for:
 * - miniapp_added: User added your mini app
 * - miniapp_removed: User removed your mini app  
 * - notifications_enabled: User enabled notifications
 * - notifications_disabled: User disabled notifications
 */

interface WebhookPayload {
  event: 'miniapp_added' | 'miniapp_removed' | 'notifications_enabled' | 'notifications_disabled'
  notificationDetails?: {
    url: string
    token: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the incoming webhook
    const body = await request.json()

    console.log('Farcaster Mini App Webhook:', body)

    // The webhook data comes in JSON Farcaster Signature format
    // In production, you should verify the signature
    // See: https://docs.farcaster.xyz/developers/miniapps/notifications

    const _header = body.header
    const payload = body.payload
    const _signature = body.signature

    if (!payload) {
      return NextResponse.json(
        { error: 'Missing payload' },
        { status: 400 }
      )
    }

    // Decode base64url payload
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    ) as WebhookPayload

    console.log('Webhook Event:', decodedPayload.event)

    // Handle different event types
    switch (decodedPayload.event) {
      case 'miniapp_added':
        // User added your mini app
        // Save notification token if provided for sending notifications later
        if (decodedPayload.notificationDetails) {
          const { token } = decodedPayload.notificationDetails
          console.log('Store notification token for user:', token)
          // TODO: Save token to database for this user
          // const userId = decodeFarcasterUser(header)
          // await db.notificationTokens.create({ userId, token })
        }
        break

      case 'miniapp_removed':
        // User removed your mini app
        // Invalidate any stored tokens for this user
        console.log('Invalidate notification tokens')
        // TODO: Remove tokens from database for this user
        break

      case 'notifications_enabled':
        // User re-enabled notifications
        if (decodedPayload.notificationDetails) {
          const { token } = decodedPayload.notificationDetails
          console.log('Update notification token:', token)
          // TODO: Update token in database
        }
        break

      case 'notifications_disabled':
        // User disabled notifications
        console.log('Notifications disabled for user')
        // TODO: Mark tokens as disabled in database
        break
    }

    // Always respond with 200 OK
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to prevent retries
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 200 }
    )
  }
}
