import { NextRequest, NextResponse } from 'next/server'

/**
 * Audio Generation API Route
 * Generates voice narration using OpenAI TTS (with ElevenLabs upgrade path)
 * 
 * POST /api/generate-audio
 * Body: { text: string, voice?: string, provider?: 'openai' | 'elevenlabs', speed?: number }
 * Returns: { audioUrl: string (base64 data URL), durationMs: number, characterCount: number }
 */

// Valid OpenAI TTS voices
const VALID_OPENAI_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer']

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

    const { text, voice = 'nova', provider = 'openai', speed = 1.0 } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text parameter' },
        { status: 400 }
      )
    }

    // Limit text length to prevent abuse (OpenAI TTS supports up to 4096 chars)
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 4096 characters' },
        { status: 400 }
      )
    }

    // Route to appropriate provider
    let response: NextResponse
    if (provider === 'openai') {
      response = await generateWithOpenAI(text, voice, speed)
    } else if (provider === 'elevenlabs') {
      response = await generateWithElevenLabs(text, voice)
    } else {
      return NextResponse.json(
        { error: 'Invalid provider. Supported: openai, elevenlabs' },
        { status: 400 }
      )
    }
    
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
 * Generate audio using OpenAI TTS API
 */
async function generateWithOpenAI(text: string, voice: string, speed: number) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn('[generate-audio] OpenAI API key not configured')
    return NextResponse.json(
      { audioUrl: null, error: 'OpenAI API key not configured' },
      { status: 200 }
    )
  }

  // Validate voice
  const validVoice = VALID_OPENAI_VOICES.includes(voice) ? voice : 'nova'

  // Clamp speed to valid range
  const validSpeed = Math.min(4.0, Math.max(0.25, speed))

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',        // Standard quality, faster
        input: text,
        voice: validVoice,
        speed: validSpeed,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-audio] OpenAI API error:', response.status, errorText)
      return NextResponse.json(
        { audioUrl: null, error: `OpenAI API error: ${response.status}` },
        { status: 200 }
      )
    }

    // Convert audio buffer to base64 data URL
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`

    // Calculate actual duration from MP3 data
    const durationMs = calculateMp3Duration(audioBuffer)

    return NextResponse.json({
      audioUrl,
      durationMs,
      characterCount: text.length,
      voice: validVoice,
      provider: 'openai',
    })
  } catch (error) {
    console.error('[generate-audio] OpenAI TTS failed:', error)
    return NextResponse.json(
      { audioUrl: null, error: 'OpenAI TTS generation failed' },
      { status: 200 }
    )
  }
}

/**
 * Generate audio using ElevenLabs API (future upgrade path)
 * Placeholder for Phase 11 implementation
 */
async function generateWithElevenLabs(text: string, voice: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    console.warn('[generate-audio] ElevenLabs API key not configured, falling back to OpenAI')
    // Fallback to OpenAI if ElevenLabs not configured
    return generateWithOpenAI(text, voice, 1.0)
  }

  // ElevenLabs voice IDs - these would be configured per-project
  // For now, use a default multilingual voice
  const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel

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
      // Fallback to OpenAI on ElevenLabs error
      return generateWithOpenAI(text, voice, 1.0)
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
      provider: 'elevenlabs',
    })
  } catch (error) {
    console.error('[generate-audio] ElevenLabs TTS failed:', error)
    // Fallback to OpenAI
    return generateWithOpenAI(text, voice, 1.0)
  }
}
