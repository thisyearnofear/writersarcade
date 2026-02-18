import { NextRequest, NextResponse } from 'next/server'

// ─── In-flight deduplication ──────────────────────────────────────────────
// React StrictMode double-invokes effects in development, which can trigger
// two identical image generation requests back-to-back — each costing real
// Venice API credits. This Map coalesces concurrent identical requests so
// only one upstream call is made; both callers receive the same result.
const IN_FLIGHT = new Map<string, Promise<{ imageUrl: string | null }>>()

function requestKey(prompt: string, model: string) {
  // Simple deterministic key — no crypto needed for this use-case
  return `${model}::${prompt.slice(0, 200)}`
}
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, model } = await req.json()

    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Missing prompt or type' },
        { status: 400 }
      )
    }

    const apiKey = process.env.VENICE_API_KEY

    if (!apiKey) {
      console.warn('Venice API key not configured')
      return NextResponse.json(
        { imageUrl: null },
        { status: 200 }
      )
    }

    // Use specified model or default to venice-sd35
    const selectedModel = model || 'venice-sd35'
    const key = requestKey(prompt, selectedModel)

    // Deduplicate: if an identical request is already in flight, share its result
    const existing = IN_FLIGHT.get(key)
    if (existing) {
      console.log(`[generate-image] Deduplicating in-flight request for key: ${key.slice(0, 60)}`)
      const result = await existing
      return NextResponse.json(result)
    }

    // Create the upstream request promise and register it
    const upstreamPromise = (async (): Promise<{ imageUrl: string | null }> => {
      console.log(`Generating image with model: ${selectedModel}`)
      const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          width: 1024,
          height: 1024,
          format: 'png',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Venice API error:', response.status, errorText)
        return { imageUrl: null }
      }

      const data = await response.json()

      if (data.images?.[0]) {
        return { imageUrl: `data:image/png;base64,${data.images[0]}` }
      }

      console.warn('Venice API response missing images array:', data)
      return { imageUrl: null }
    })()

    IN_FLIGHT.set(key, upstreamPromise)

    try {
      const result = await upstreamPromise
      return NextResponse.json(result)
    } finally {
      // Always clean up so a future retry can start fresh
      IN_FLIGHT.delete(key)
    }
  } catch (error) {
    console.error('Image generation failed:', error)
    return NextResponse.json(
      { imageUrl: null },
      { status: 200 }
    )
  }
}
