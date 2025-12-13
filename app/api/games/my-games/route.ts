import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuth } from '@/lib/auth'

/**
 * GET /api/games/my-games
 * Fetch all games created by the authenticated user
 * 
 * Query params:
 * - wallet: string (user's wallet address)
 * - limit: number (default 20)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  // Try to infer wallet from session if not provided

  try {
    const { searchParams } = new URL(request.url)
    let wallet = searchParams.get('wallet')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!wallet) {
      try {
        const maybeUser = await optionalAuth()
        if (maybeUser?.walletAddress) {
          wallet = maybeUser.walletAddress
        }
      } catch {}
    }

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

    // Fetch user
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: wallet, mode: 'insensitive' } },
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          wallet,
          games: [],
          total: 0,
          stats: {
            totalGames: 0,
            mintedGames: 0,
            totalPlaytime: 0,
          },
        },
      })
    }

    // Fetch user's games
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.game.count({
        where: { userId: user.id },
      }),
    ])

    // Calculate stats
    const mintedGames = games.filter((g: { nftTokenId?: string | null }) => g.nftTokenId).length

    const formattedGames = games.map((game) => ({
      id: game.id,
      slug: game.slug,
      title: game.title,
      description: game.description,
      tagline: game.tagline,
      genre: game.genre,
      subgenre: game.subgenre,
      primaryColor: game.primaryColor,
      mode: game.mode as 'story' | 'wordle' || 'story',
      promptName: game.promptName,
      promptText: game.promptText,
      promptModel: game.promptModel,
      articleUrl: game.articleUrl,
      articleContext: game.articleContext,
      writerCoinId: game.writerCoinId,
      difficulty: game.difficulty,
      creatorWallet: game.creatorWallet,
      authorWallet: game.authorWallet,
      authorParagraphUsername: game.authorParagraphUsername,
      publicationName: game.publicationName,
      publicationSummary: game.publicationSummary,
      subscriberCount: game.subscriberCount,
      articlePublishedAt: game.articlePublishedAt,
      imageUrl: game.imageUrl,
      imagePromptModel: game.imagePromptModel,
      imagePromptName: game.imagePromptName,
      imagePromptText: game.imagePromptText,
      imageData: game.imageData,
      musicPromptText: game.musicPromptText,
      musicPromptSeedImage: game.musicPromptSeedImage,
      nftTokenId: game.nftTokenId,
      nftTransactionHash: game.nftTransactionHash,
      nftMintedAt: game.nftMintedAt,
      private: game.private,
      playFee: (game as any).playFee,
      featured: (game as any).featured ?? false,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        wallet,
        games: formattedGames,
        total,
        limit,
        offset,
        stats: {
          totalGames: total,
          mintedGames,
        },
      },
    })
  } catch (error) {
    console.error('My games fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
