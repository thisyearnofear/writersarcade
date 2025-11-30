import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'

/**
 * POST /api/assets/generate
 * 
 * Generate reusable game assets from an article
 * 
 * Body:
 * {
 *   articleUrl?: string
 *   articleContent?: string
 *   genre?: string
 *   userId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articleUrl, articleContent, genre, userId } = body

    // Validate input
    if (!articleUrl && !articleContent) {
      return NextResponse.json(
        { error: 'Either articleUrl or articleContent is required' },
        { status: 400 }
      )
    }

    // Fetch article content if URL provided
    let content = articleContent
    if (articleUrl && !articleContent) {
      try {
        const processed = await ContentProcessorService.processUrl(articleUrl)
        content = processed.text
      } catch (error) {
        console.error('Failed to fetch article:', error)
        return NextResponse.json(
          { error: 'Failed to fetch article content' },
          { status: 400 }
        )
      }
    }

    // Generate assets using GameAIService (reusing existing pattern)
    const assetResponse = await GameAIService.generateAssets({
      promptText: content || '',
      genre: genre as 'horror' | 'comedy' | 'mystery' | undefined,
    })

    if (!assetResponse) {
      return NextResponse.json(
        { error: 'Failed to generate assets' },
        { status: 500 }
      )
    }

    // Transform AssetGenerationResponse components into individual assets
    const assetPromises = [
      // Save characters as assets
      ...(assetResponse.characters || []).map((char) =>
        AssetDatabaseService.createAsset({
          title: char.name,
          description: `${char.role}: ${char.personality}`,
          type: 'character',
          content: `Motivation: ${char.motivation}\nAppearance: ${char.appearance}`,
          genre: genre || 'General',
          tags: ['character', char.role.toLowerCase()],
          articleUrl,
          creatorId: userId,
        })
      ),
      // Save story beats as assets
      ...(assetResponse.storyBeats || []).map((beat) =>
        AssetDatabaseService.createAsset({
          title: beat.title,
          description: beat.description,
          type: 'plot',
          content: `Conflict: ${beat.keyConflict}\nTone: ${beat.emotionalTone}`,
          genre: genre || 'General',
          tags: ['plot', 'story'],
          articleUrl,
          creatorId: userId,
        })
      ),
      // Save mechanics as assets
      ...(assetResponse.gameMechanics || []).map((mech) =>
        AssetDatabaseService.createAsset({
          title: mech.name,
          description: mech.description,
          type: 'mechanic',
          content: `Mechanics: ${mech.mechanics.join(', ')}\nConsequence: ${mech.consequence}`,
          genre: genre || 'General',
          tags: ['mechanic', 'gameplay'],
          articleUrl,
          creatorId: userId,
        })
      ),
    ]

    const savedAssets = await Promise.all(assetPromises)

    return NextResponse.json({
      success: true,
      assetCount: savedAssets.length,
      assets: savedAssets,
      metadata: {
        articleUrl,
        genre,
        generatedAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Asset generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/assets/generate
 * 
 * Get featured assets or search
 * 
 * Query:
 * - type?: string (character, mechanic, plot, world, dialog)
 * - genre?: string
 * - search?: string
 * - limit?: number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '12')

    let result

    if (search) {
      result = await AssetDatabaseService.getAssets({
        search,
        limit,
      })
    } else if (type) {
      result = await AssetDatabaseService.getAssetsByType(type, limit)
    } else if (genre) {
      result = await AssetDatabaseService.getAssetsByGenre(genre, limit)
    } else {
      result = await AssetDatabaseService.getAssets({ limit })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Asset retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
