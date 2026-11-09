import { generateText, Output } from 'ai'
import { z } from 'zod'
import {
  getCompatibleGoogleModel,
  getCompatibleFeatherlessModel,
  FEATHERLESS_MODEL,
  type CompatibleLanguageModel,
} from '@/lib/ai-model-compatibility'
import { logger } from '@/lib/config'

// Vision pass over the client-rendered diorama thumbnail. The JSON critique
// reviews the plan; this reviews the pixels — catching what a plan can't
// (empty voids, clipping, unreadable layouts, mood mismatches). Runs async
// after thumbnail persistence; failure is non-fatal.

const thumbnailCritiqueSchema = z.object({
  score: z.number().min(0).max(10)
    .describe('Overall visual quality 0-10: reads as a coherent explorable world, matches the story mood, no glaring glitches'),
  looksLikeDiorama: z.boolean()
    .describe('True when the image clearly shows a 3D scene/diorama rather than a blank frame, UI screenshot, or broken render'),
  issues: z.array(z.string()).max(6)
    .describe('Concrete visual problems, e.g. "large empty void", "objects clipped through terrain", "no visible landmarks", "dark/unreadable"'),
  summary: z.string().max(300)
    .describe('One sentence describing what the frame shows'),
})

export type SceneThumbnailCritique = z.infer<typeof thumbnailCritiqueSchema>

function resolveVisionModel(): CompatibleLanguageModel | null {
  if (process.env.GOOGLE_API_KEY) {
    return getCompatibleGoogleModel('gemini-2.0-flash')
  }
  if (process.env.FEATHERLESS_API_KEY) {
    return getCompatibleFeatherlessModel(FEATHERLESS_MODEL)
  }
  return null
}

export interface ThumbnailReviewInput {
  image: Uint8Array
  mimeType: string
  title: string
  genre?: string
  /** Short structural summary of the plan (zone names, objective count). */
  sceneSummary?: string
}

/**
 * Review a diorama thumbnail with a vision model. Returns null when no
 * vision provider is configured or the call fails — callers treat null as
 * "no critique", never as an error.
 */
export async function reviewSceneThumbnail(input: ThumbnailReviewInput): Promise<SceneThumbnailCritique | null> {
  const model = resolveVisionModel()
  if (!model) return null

  try {
    const { output } = await generateText({
      model,
      instructions: `You are the art director reviewing a screenshot of a generated 3D diorama for an interactive story game.
Assess the IMAGE on:
- World legibility: does it read as a coherent, explorable place with distinct areas, landmarks, and characters — or an empty void / cluttered smear?
- Story match: does the mood and subject matter plausibly match the game described?
- Visual glitches: floating objects, clipping, z-fighting, unreadable darkness, UI artifacts.
Be honest and concise — a mediocre-but-coherent scene scores 6-7; blank/broken frames score 0-3.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `GAME: "${input.title}"${input.genre ? ` (${input.genre})` : ''}\n${input.sceneSummary ? `SCENE STRUCTURE: ${input.sceneSummary}\n` : ''}\nReview this rendered frame.`,
            },
            { type: 'file', mediaType: input.mimeType, data: input.image },
          ],
        },
      ],
      output: Output.object({ schema: thumbnailCritiqueSchema }),
    })
    return output
  } catch (error) {
    logger.warn('Scene thumbnail critique failed', {
      title: input.title,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
}
