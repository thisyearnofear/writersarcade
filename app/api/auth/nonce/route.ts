import { NextResponse } from 'next/server'
import { generateNonce } from 'siwe'

export async function GET() {
    const nonce = generateNonce()

    const response = NextResponse.json({ nonce })

    response.cookies.set('siwe-nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    })

    return response
}
