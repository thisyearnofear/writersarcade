import { NextResponse } from 'next/server'

// Deprecated endpoint retained for backward compatibility during migration
// Use /api/auth/me (GET), /api/auth/nonce (GET), /api/auth/verify (POST), and /api/auth/logout (POST)
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated endpoint. Use /api/auth/me, /api/auth/nonce, /api/auth/verify, or /api/auth/logout.'
    },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Deprecated endpoint. Use /api/auth/verify for SIWE-based auth.'
    },
    { status: 410 }
  )
}
