import { NextRequest, NextResponse } from 'next/server'

/**
 * Audio Generation API Route
 * Generates voice narration using ElevenLabs TTS
 *
 * POST /api/generate-audio
 * Body: { text: string, voice?: string, speed?: number }
 * Returns: { audioUrl: string (base64 data URL), durationMs: number, characterCount: number }
 */


// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count }
}

/**
 * Calculate actual audio duration from MP3 buffer
 * MP3 frame-based calculation for accurate duration
 */
function calculateMp3Duration(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  
  // Find first MP3 frame sync (0xFF 0xFB, 0xFF 0xFA, or 0xFF 0xF3)
  let frameStart = 0
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
      frameStart = i
      break
    }
  }
  
  // Parse MP3 header to get bitrate
  if (frameStart + 4 > bytes.length) {
    // Fallback: estimate based on typical MP3 bitrate (128kbps)
    return Math.round((buffer.byteLength * 8) / 128000 * 1000)
  }
  
  const header = view.getUint32(frameStart, false)
  const bitrateIndex = (header >> 12) & 0x0F
  const samplingRateIndex = (header >> 10) & 0x03
  
  // MPEG Audio Layer 3 bitrate table (kbps)
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  const samplingRates = [44100, 48000, 32000, 0]
  
  const bitrate = bitrates[bitrateIndex] || 128
  const _samplingRate = samplingRates[samplingRateIndex] || 44100
  
  // Duration = (file size in bits) / (bitrate in bits per second)
  const durationMs = Math.round((buffer.byteLength * 8) / (bitrate * 1000) * 1000)
  
  return durationMs
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown'
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': '0' }
        }
      )
    }

    const { text, voice = 'Rachel' } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text parameter' },
        { status: 400 }
      )
    }

    // Limit text length to prevent abuse (ElevenLabs TTS supports up to 4096 chars)
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 4096 characters' },
        { status: 400 }
      )
    }

    // Generate with ElevenLabs
    const response = await generateWithElevenLabs(text, voice)

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    return response
  } catch (error) {
    console.error('[generate-audio] Request failed:', error)
    return NextResponse.json(
      { audioUrl: null, error: 'Audio generation failed' },
      { status: 500 }
    )
  }
}


/**
 * Generate audio using ElevenLabs API
 */
async function generateWithElevenLabs(text: string, voice: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    console.warn('[generate-audio] ElevenLabs API key not configured')
    return NextResponse.json(
      { audioUrl: null, error: 'ElevenLabs API key not configured' },
      { status: 200 }
    )
  }

  // ElevenLabs voice IDs - these would be configured per-project
  // Use the voice passed in, or default to Rachel
  const voiceId = voice || process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-audio] ElevenLabs API error:', response.status, errorText)
      return NextResponse.json(
        { audioUrl: null, error: `ElevenLabs API error: ${response.status}` },
        { status: 200 }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`

    // Calculate actual duration from MP3 data
    const durationMs = calculateMp3Duration(audioBuffer)

    return NextResponse.json({
      audioUrl,
      durationMs,
      characterCount: text.length,
      voice: voiceId,
    })
  } catch (error) {
    console.error('[generate-audio] ElevenLabs TTS failed:', error)
    return NextResponse.json(
      { audioUrl: null, error: 'ElevenLabs TTS generation failed' },
      { status: 200 }
    )
  }
}
