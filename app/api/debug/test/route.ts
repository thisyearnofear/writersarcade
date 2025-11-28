import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API routes are working",
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasVenice: !!process.env.VENICE_API_KEY,
      hasWallet: !!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    },
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({
      success: true,
      message: "POST endpoint working",
      received: body
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}