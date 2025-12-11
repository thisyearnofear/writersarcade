import { NextRequest, NextResponse } from 'next/server'
import { GameAIService } from '@/domains/games/services/game-ai.service'
import { ContentProcessorService } from '@/domains/content/services/content-processor.service'
import { z } from 'zod'

const generateAssetsSchema = z.object({
  url: z.string().url(),
  genre: z.string().optional(),
  model: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { url, genre, model } = generateAssetsSchema.parse(await request.json())

    // 1. Process Content (Reuse existing service)
    const content = await ContentProcessorService.processUrl(url)
    const promptText = `Content from "${content.title}" by ${content.author}:\n\n${content.text}`

    // 2. Generate Assets (Reuse existing AI service)
    const assets = await GameAIService.generateAssets({
      promptText,
      genre,
      model,
      url
    })

    // 3. Store Assets (Use Prisma directly for now, keeping it simple)
    // In a full implementation, we'd loop through and create Asset records
    // For this "Infrastructure" MVP step, we'll store a "Master Asset Pack" 
    // effectively as a specialized Game entry or a new Asset record if we migrated schemas.

    // Since we agreed to strict schema management, let's verify if "Asset" model exists.
    // If not, we return the structured JSON which proves the "Protocol" works.

    // We will assume the Asset model creation is next/pending or we return raw JSON
    // to the frontend "Workshop" to be hydrated.

    return NextResponse.json({
      success: true,
      data: {
        ...assets,
        source: {
          title: content.title,
          url: url,
          author: content.author
        }
      }
    })

  } catch (error) {
    console.error('Asset generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate assets' },
      { status: 500 }
    )
  }
}
