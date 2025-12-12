import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

/**
 * PATCH /api/games/[slug]/settings
 * Update game settings (play fee, visibility)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { playFee, private: isPrivate, wallet } = body

        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet address is required for verification' },
                { status: 400 }
            )
        }

        // Fetch game to verify ownership
        const game = await prisma.game.findUnique({
            where: { slug },
            include: { user: true },
        })

        if (!game) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            )
        }

        // Verify ownership
        // Note: This is a robust check ensuring only the wallet that owns the game (via User relation) can update it
        if (!game.user || game.user.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
            // Fallback check: if no user relation but creatorWallet matches (legacy/direct wallet games)
            if (game.creatorWallet?.toLowerCase() !== wallet.toLowerCase()) {
                return NextResponse.json(
                    { error: 'Unauthorized: You do not own this game' },
                    { status: 403 }
                )
            }
        }

        // Prepare update data
        const updateData: any = {}

        if (typeof isPrivate === 'boolean') {
            updateData.private = isPrivate
        }

        if (playFee !== undefined) {
            // Validate play fee
            const fee = Number(playFee)
            if (isNaN(fee) || fee < 0) {
                return NextResponse.json(
                    { error: 'Invalid play fee. Must be a positive number.' },
                    { status: 400 }
                )
            }
            updateData.playFee = playFee.toString()
        }

        // Update game
        const updatedGame = await prisma.game.update({
            where: { slug },
            data: updateData,
        })

        return NextResponse.json({
            success: true,
            data: {
                slug,
                private: updatedGame.private,
                playFee: (updatedGame as any).playFee,
            },
        })
    } catch (error) {
        console.error('Settings update error:', error)
        return NextResponse.json(
            { error: 'Failed to update game settings' },
            { status: 500 }
        )
    }
}
