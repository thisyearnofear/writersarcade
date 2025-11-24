import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Proxy endpoint for Farcaster profile lookup via Neynar API
 * 
 * This endpoint keeps the Neynar API key secure (server-side only)
 * and prevents rate limiting/quota exhaustion from client requests.
 * 
 * @param walletAddress - User's wallet address to lookup
 */

const profileQuerySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress parameter required' },
        { status: 400 }
      )
    }

    const validatedData = profileQuerySchema.parse({ walletAddress })

    const apiKey = process.env.NEYNAR_API_KEY

    if (!apiKey) {
      console.error('NEYNAR_API_KEY not configured')
      return NextResponse.json(
        { error: 'Farcaster profile service unavailable' },
        { status: 503 }
      )
    }

    // Call Neynar API for Farcaster profile
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${validatedData.walletAddress}`,
      {
        headers: {
          'api_key': apiKey,
        },
      }
    )

    if (!response.ok) {
      console.error('Neynar API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch Farcaster profile' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract first user from response
    const users = Object.values(data) as any[]
    const user = users[0]?.[0]

    if (!user) {
      return NextResponse.json(
        {
          fid: null,
          username: null,
          displayName: null,
          pfpUrl: null,
          verifiedAddresses: [],
        },
        { status: 200 }
      )
    }

    // Return profile data
    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      bio: user.profile?.bio?.text,
      pfpUrl: user.pfp_url,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
    })
  } catch (error) {
    console.error('Profile lookup error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to lookup profile' },
      { status: 500 }
    )
  }
}
