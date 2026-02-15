/**
 * Voice Narration Service using OpenAI TTS (with ElevenLabs upgrade path)
 * Generates audio narration for comic panel narratives
 *
 * Architecture: Single source of truth for all voice narration logic
 * - Panel narration: Called per-panel to generate audio for narrative text
 * - Caching: Prevents duplicate API calls for identical narratives
 * - Provider abstraction: Supports OpenAI TTS now, ElevenLabs later
 * - Server-side API: Uses /api/generate-audio endpoint to keep API keys secure
 *
 * Core Principles:
 * - ENHANCEMENT FIRST: Follows existing ImageGenerationService patterns
 * - DRY: Reuses caching and API patterns from image generation
 * - MODULAR: Provider-agnostic interface for future upgrades
 */

export type VoiceProvider = 'openai' | 'elevenlabs'

export interface VoiceNarrationResult {
  audioUrl: string | null
  durationMs: number | null
  provider: VoiceProvider
  voice: string
  timestamp: number
}

export interface VoiceNarrationOptions {
  voice?: string        // Voice ID or name
  provider?: VoiceProvider
  speed?: number        // 0.25 to 4.0 for OpenAI
  force?: boolean       // Bypass cache
}

// OpenAI TTS voices optimized for different genres
const GENRE_VOICE_MAP: Record<string, string> = {
  horror: 'onyx',      // Deep, dramatic
  mystery: 'fable',    // British accent, storytelling
  comedy: 'shimmer',   // Warm, expressive
  adventure: 'nova',   // Energetic, clear
  'sci-fi': 'echo',    // Neutral, futuristic feel
  fantasy: 'alloy',    // Versatile, warm
  default: 'nova',     // Good all-around narrator
}

export class VoiceNarrationService {
  private static getApiEndpoint(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/generate-audio`
    }
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || 'localhost:3000'
    return `${protocol}://${host}/api/generate-audio`
  }

  // Cache: narrative hash → result
  private static readonly CACHE = new Map<string, VoiceNarrationResult>()

  /**
   * Get recommended voice for a genre
   */
  static getVoiceForGenre(genre: string): string {
    return GENRE_VOICE_MAP[genre.toLowerCase()] || GENRE_VOICE_MAP.default
  }

  /**
   * Generate audio narration for panel narrative text
   * Primary method for generating voice-over audio
   */
  static async generateNarration(
    narrativeText: string,
    genre: string,
    options: VoiceNarrationOptions = {}
  ): Promise<VoiceNarrationResult> {
    const {
      voice = this.getVoiceForGenre(genre),
      provider = 'openai',
      speed = 1.0,
      force = false,
    } = options

    // Create cache key from content hash
    const cacheKey = this.hashNarrative(narrativeText, voice, provider)

    // Check cache unless forced regeneration
    if (!force && this.CACHE.has(cacheKey)) {
      console.log('[VoiceNarration] Cache hit for:', narrativeText.substring(0, 40) + '...')
      return this.CACHE.get(cacheKey)!
    }

    try {
      const response = await fetch(this.getApiEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: narrativeText,
          voice,
          provider,
          speed,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[VoiceNarration] API error:', response.status, errorText)
        return this.createFailedResult(provider, voice)
      }

      const data = await response.json()

      const result: VoiceNarrationResult = {
        audioUrl: data.audioUrl || null,
        durationMs: data.durationMs || null,
        provider,
        voice,
        timestamp: Date.now(),
      }

      // Cache successful results
      if (result.audioUrl) {
        this.CACHE.set(cacheKey, result)
      }

      return result
    } catch (error) {
      console.error('[VoiceNarration] Generation failed:', error)
      return this.createFailedResult(provider, voice)
    }
  }

  /**
   * Generate narration for multiple panels (batch operation)
   * Returns results in same order as input panels
   */
  static async generateBatchNarration(
    panels: Array<{ narrativeText: string; id: string }>,
    genre: string,
    options: VoiceNarrationOptions = {}
  ): Promise<Map<string, VoiceNarrationResult>> {
    const results = new Map<string, VoiceNarrationResult>()

    // Process panels sequentially to avoid rate limiting
    for (const panel of panels) {
      const result = await this.generateNarration(panel.narrativeText, genre, options)
      results.set(panel.id, result)
    }

    return results
  }

  /**
   * Create a failed result object
   */
  private static createFailedResult(provider: VoiceProvider, voice: string): VoiceNarrationResult {
    return {
      audioUrl: null,
      durationMs: null,
      provider,
      voice,
      timestamp: Date.now(),
    }
  }

  /**
   * Create hash for cache key
   */
  private static hashNarrative(text: string, voice: string, provider: string): string {
    // Simple hash for cache key - combines text, voice, and provider
    const input = `${text}_${voice}_${provider}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `voice_${hash}`
  }

  /**
   * Clear cache (for testing or memory management)
   */
  static clearCache(): void {
    this.CACHE.clear()
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number } {
    return { size: this.CACHE.size }
  }

  /**
   * Check if narration is available for text (preview without generating)
   */
  static isNarrationCached(narrativeText: string, genre: string, provider: VoiceProvider = 'openai'): boolean {
    const voice = this.getVoiceForGenre(genre)
    const cacheKey = this.hashNarrative(narrativeText, voice, provider)
    return this.CACHE.has(cacheKey)
  }
}
