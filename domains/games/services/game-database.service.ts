import { prisma } from '@/lib/database'
import { createSlug } from '@/lib/utils'
import type { Game, GameGenerationResponse, GameMode } from '../types'
import { Prisma, Game as PrismaGameModel } from '@prisma/client'

/**
 * Game Database Service
 * Handles all game-related database operations
 */
export class GameDatabaseService {
  
  /**
    * Create a new game from AI generation response
    */
  static async createGame(
    gameData: GameGenerationResponse,
    userId?: string,
    miniAppData?: {
      articleUrl?: string
      writerCoinId?: string
      difficulty?: string
      articleContext?: string
      wordleAnswer?: string
      // Source material attribution
      authorParagraphUsername?: string
      authorWallet?: string
      publicationName?: string
      publicationSummary?: string
      subscriberCount?: number
      articlePublishedAt?: Date
    }
  ): Promise<Game> {
    try {
      // Generate unique slug
      let slug = createSlug(gameData.title)
      
      // Check if slug exists and make unique if needed
      const existingGame = await prisma.game.findUnique({
        where: { slug }
      })
      
      if (existingGame) {
        slug = `${slug}-${Date.now()}`
      }
      
      const gameCreateData = {
        title: gameData.title,
        slug,
        description: gameData.description,
        tagline: gameData.tagline,
        genre: gameData.genre,
        subgenre: gameData.subgenre,
        primaryColor: gameData.primaryColor,
        // Default to "story" to preserve behavior for existing games
        mode: (gameData.mode as GameMode | undefined) || 'story',
        promptName: gameData.promptName,
        promptText: gameData.promptText,
        promptModel: gameData.promptModel,
        articleUrl: miniAppData?.articleUrl,
        wordleAnswer: miniAppData?.wordleAnswer,
        articleContext: miniAppData?.articleContext,
        writerCoinId: miniAppData?.writerCoinId,
        difficulty: miniAppData?.difficulty,
        // Source material attribution - preserves original author
        authorParagraphUsername: miniAppData?.authorParagraphUsername,
        authorWallet: miniAppData?.authorWallet,
        publicationName: miniAppData?.publicationName,
        publicationSummary: miniAppData?.publicationSummary,
        subscriberCount: miniAppData?.subscriberCount,
        articlePublishedAt: miniAppData?.articlePublishedAt,
        // Creator attribution
        creatorWallet: gameData.creatorWallet,
        private: false, // Default to public for now
        userId: userId || null,
      }
      
      console.log('Creating game with data:', {
        title: gameCreateData.title,
        slug: gameCreateData.slug,
        genre: gameCreateData.genre,
        hasCreatorWallet: !!gameCreateData.creatorWallet,
        hasUserId: !!gameCreateData.userId,
      })
      
      const game = await prisma.game.create({ data: gameCreateData })
      
      console.log('Game created successfully:', { id: game.id, slug: game.slug })
      return this.mapPrismaGameToGame(game)
      
    } catch (error) {
      console.error('Failed to create game:', error)
      console.error('Game creation error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as { code?: string }).code,
        meta: (error as { meta?: Record<string, unknown> }).meta,
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw new Error('Failed to save game to database')
    }
  }
  
  /**
   * Get game by slug
   */
  static async getGameBySlug(slug: string): Promise<Game | null> {
    try {
      const game = await prisma.game.findUnique({
        where: { slug },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            }
          }
        }
      })
      
      return game ? this.mapPrismaGameToGame(game) : null
      
    } catch (error) {
      console.error('Failed to get game by slug:', error)
      return null
    }
  }
  
  /**
   * Get games with pagination and filtering
   */
  static async getGames(options: {
    limit?: number
    offset?: number
    search?: string
    genre?: string
    userId?: string
    includePrivate?: boolean
  } = {}) {
    const {
      limit = 25,
      offset = 0,
      search,
      genre,
      userId,
      includePrivate = false
    } = options
    
    try {
      // Build where clause
      const where: Prisma.GameWhereInput = {
        AND: [
          // Privacy filter
          includePrivate ? {} : { private: false },
          // User filter
          userId ? { userId } : {},
          // Search filter
          search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { genre: { contains: search, mode: 'insensitive' } },
              { subgenre: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
          // Genre filter
          genre ? { genre: { equals: genre, mode: 'insensitive' } } : {},
        ]
      }
      
      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.game.count({ where })
      ])
      
      return {
        games: games.map(this.mapPrismaGameToGame),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
      
    } catch (error) {
      console.error('Failed to get games:', error)
      // Return empty result instead of throwing on database errors
      return {
        games: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      }
    }
  }
  
  /**
   * Get games by genre
   */
  static async getGamesByGenre(genre: string, limit: number = 25) {
    return this.getGames({ genre, limit, includePrivate: false })
  }
  
  /**
   * Get user's games
   */
  static async getUserGames(userId: string, limit: number = 25) {
    return this.getGames({ userId, limit, includePrivate: true })
  }
  
  /**
   * Update game
   */
  static async updateGame(
    id: string,
    updates: Partial<Pick<Game, 'title' | 'description' | 'tagline' | 'private'>>
  ): Promise<Game | null> {
    try {
      const game = await prisma.game.update({
        where: { id },
        data: updates,
      })
      
      return this.mapPrismaGameToGame(game)
      
    } catch (error) {
      console.error('Failed to update game:', error)
      return null
    }
  }

  /**
   * Update game image URL
   */
  static async updateGameImage(id: string, imageUrl: string): Promise<Game | null> {
    try {
      const game = await prisma.game.update({
        where: { id },
        data: { imageUrl },
      })
      
      return this.mapPrismaGameToGame(game)
      
    } catch (error) {
      console.error('Failed to update game image:', error)
      return null
    }
  }
  
  /**
   * Delete game
   */
  static async deleteGame(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.game.delete({
        where: {
          id,
          userId, // Ensure user owns the game
        }
      })
      
      return true
      
    } catch (error) {
      console.error('Failed to delete game:', error)
      return false
    }
  }
  
  /**
   * Get game statistics
   */
  static async getGameStats() {
    try {
      const [
        totalGames,
        publicGames,
        genres,
        recentGames
      ] = await Promise.all([
        prisma.game.count(),
        prisma.game.count({ where: { private: false } }),
        prisma.game.groupBy({
          by: ['genre'],
          _count: { genre: true },
          orderBy: { _count: { genre: 'desc' } },
          take: 10,
        }),
        prisma.game.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            }
          }
        })
      ])
      
      return {
        totalGames,
        publicGames,
        topGenres: genres.map(g => ({ genre: g.genre, count: g._count.genre })),
        recentGames,
      }
      
    } catch (error) {
      console.error('Failed to get game stats:', error)
      return {
        totalGames: 0,
        publicGames: 0,
        topGenres: [],
        recentGames: 0,
      }
    }
  }
  
  /**
   * Map Prisma game model to our Game type
   */
  private static mapPrismaGameToGame(prismaGame: any): Game {
      return {
        id: prismaGame.id,
        title: prismaGame.title,
        slug: prismaGame.slug,
        description: prismaGame.description,
        tagline: prismaGame.tagline,
        genre: prismaGame.genre,
        subgenre: prismaGame.subgenre,
        primaryColor: prismaGame.primaryColor || undefined,
        mode: (prismaGame.mode as GameMode | undefined) || 'story',
        promptName: prismaGame.promptName,
        wordleAnswer: prismaGame.wordleAnswer || undefined,
        promptText: prismaGame.promptText || undefined,
        promptModel: prismaGame.promptModel,
        imageUrl: prismaGame.imageUrl || undefined,
        imagePromptModel: prismaGame.imagePromptModel || undefined,
        imagePromptName: prismaGame.imagePromptName || undefined,
        imagePromptText: prismaGame.imagePromptText || undefined,
        imageData: prismaGame.imageData || undefined,
        musicPromptText: prismaGame.musicPromptText || undefined,
        musicPromptSeedImage: prismaGame.musicPromptSeedImage || undefined,
        articleUrl: prismaGame.articleUrl || undefined,
        articleContext: prismaGame.articleContext || undefined,
        writerCoinId: prismaGame.writerCoinId || undefined,
        difficulty: prismaGame.difficulty || undefined,
        // Attribution data - preserves source material author for NFT & Story Protocol
        creatorWallet: prismaGame.creatorWallet || undefined,
        authorWallet: prismaGame.authorWallet || undefined,
        authorParagraphUsername: prismaGame.authorParagraphUsername || undefined,
        publicationName: prismaGame.publicationName || undefined,
        publicationSummary: prismaGame.publicationSummary || undefined,
        subscriberCount: prismaGame.subscriberCount || undefined,
        articlePublishedAt: prismaGame.articlePublishedAt || undefined,
        nftTokenId: prismaGame.nftTokenId || undefined,
        nftTransactionHash: prismaGame.nftTransactionHash || undefined,
        nftMintedAt: prismaGame.nftMintedAt || undefined,
        private: prismaGame.private,
        userId: prismaGame.userId || undefined,
        createdAt: prismaGame.createdAt,
        updatedAt: prismaGame.updatedAt,
      }
  }
}