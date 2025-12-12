import { NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'

export async function POST(req: Request) {
    try {
        const { message, signature } = await req.json()
        const cookieStore = await cookies()
        const nonce = cookieStore.get('siwe-nonce')?.value

        if (!nonce) {
            return NextResponse.json({ error: 'Nonce not found' }, { status: 422 })
        }

        const SIWEObject = new SiweMessage(message)
        const { data: fields } = await SIWEObject.verify({ signature, nonce })

        // Check if the nonce matches (already checked by verify, but double check logic if needed)
        if (fields.nonce !== nonce) {
            return NextResponse.json({ error: 'Invalid nonce' }, { status: 422 })
        }

        // User is authenticated!
        const walletAddress = fields.address

        // Upsert user in database
        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: { updatedAt: new Date() },
            create: {
                walletAddress,
                preferredModel: 'gpt-4o-mini',
            },
        })

        // Create session
        const response = NextResponse.json({ success: true, user })

        // Set the app's main session cookie
        response.cookies.set('wallet_session', walletAddress, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        // Clear nonce
        response.cookies.delete('siwe-nonce')

        return response

    } catch (error) {
        console.error('SIWE verification failed:', error)
        return NextResponse.json(
            { success: false, error: 'Invalid signature' },
            { status: 401 }
        )
    }
}
