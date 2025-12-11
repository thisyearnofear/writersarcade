import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/database'
import { registerGameAsIP } from '@/lib/story-protocol.service'
import { uploadToIPFS } from '@/lib/ipfs-utils'

const registerSchema = z.object({
    gameId: z.string().min(1, 'Game ID is required'),
    userAddress: z.string().optional(), // In a real app we'd get this from session or verify sig
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = registerSchema.parse(body)

        const game = await prisma.game.findUnique({
            where: { id: validatedData.gameId },
        })

        if (!game) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            )
        }

        // Prepare metadata
        const ipfsMetadata = {
            name: game.title,
            description: game.description || 'Game generated on WritArcade',
            image: game.imageUrl || '',
            external_url: game.articleUrl,
        }
        const nftMetadataUri = await uploadToIPFS(ipfsMetadata)

        console.log(`Opt-In Registering Game ${game.id} as IP on Story Protocol...`)

        // In this "Platform Pays" mode, we use the backend wallet to pay gas
        // We treat the "userAddress" basically as the "IP Owner" we are registering for
        // For Hackathon MVP, we might default to registration to the connected wallet passed in body
        // or just registered to the platform if no address provided.

        const ownerAddress = validatedData.userAddress && validatedData.userAddress.startsWith('0x')
            ? validatedData.userAddress
            : game.creatorWallet // fallback to creator if no specific address passed

        const registrationResult = await registerGameAsIP({
            title: game.title,
            description: game.description || '',
            articleUrl: game.articleUrl || '',
            gameCreatorAddress: ownerAddress as `0x${string}`,
            authorParagraphUsername: game.authorParagraphUsername || 'Unknown',
            authorWalletAddress: game.creatorWallet ? (game.creatorWallet as `0x${string}`) : '0x0000000000000000000000000000000000000000' as `0x${string}`,
            genre: (game.genre || 'mystery') as 'horror' | 'comedy' | 'mystery',
            difficulty: (game.difficulty || 'easy') as 'easy' | 'hard',
            gameMetadataUri: nftMetadataUri,
            nftMetadataUri: nftMetadataUri,
        })

        return NextResponse.json({
            success: true,
            storyIPAssetId: registrationResult.storyIPAssetId,
            txHash: registrationResult.txHash
        })

    } catch (error) {
        console.error('Story IP Registration error:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
}