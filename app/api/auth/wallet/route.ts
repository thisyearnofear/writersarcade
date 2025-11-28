import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { z } from 'zod'

const walletAuthSchema = z.object({
    address: z.string().min(1),
})

export async function POST(req: Request) {
    try {
        console.log('Wallet auth request received')
        
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL not configured')
            return NextResponse.json(
                { success: false, error: 'Database not configured' },
                { status: 503 }
            )
        }

        const body = await req.json()
        const { address } = walletAuthSchema.parse(body)

        // Upsert user based on wallet address
        const user = await prisma.user.upsert({
            where: { walletAddress: address },
            update: {
                // Update last seen or other metadata if needed
                updatedAt: new Date(),
            },
            create: {
                walletAddress: address,
                preferredModel: 'gpt-4o-mini',
            },
        })

        // Create a response with the cookie
        const response = NextResponse.json({ success: true, user })

        // Set a simple session cookie
        response.cookies.set('wallet_session', user.walletAddress, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        console.log('Wallet auth successful for:', user.walletAddress)
        return response
    } catch (error) {
        console.error('Wallet auth error:', error)
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
        })
        return NextResponse.json(
            { success: false, error: 'Failed to authenticate wallet' },
            { status: 500 }
        )
    }
}
