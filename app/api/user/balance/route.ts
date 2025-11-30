import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/user/balance
 * Fetch user's writer coin (AVC) balance
 * Query params: wallet (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // TODO: Implement actual contract balance fetch
    // For now, return mock data
    // In production, use Viem to read WriterCoinPayment contract
    
    // Placeholder: Return 0 balance (contract integration needed)
    return NextResponse.json({
      success: true,
      data: {
        wallet,
        balance: '0',
        decimals: 18,
        symbol: 'AVC',
        formattedBalance: '0',
      },
    })
  } catch (error) {
    console.error('Balance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
