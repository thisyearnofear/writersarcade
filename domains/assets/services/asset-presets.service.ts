import { AssetGenerationResponse } from '@/domains/games/types'

export interface CompositionPreset {
  id: string
  name: string
  description: string
  data: AssetGenerationResponse
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
}

/**
 * Asset Composition Presets Service
 * Manages saving, loading, and sharing preset configurations
 */
export class AssetPresetsService {
  /**
   * Create a preset from current asset state
   */
  static createPreset(
    assets: AssetGenerationResponse,
    presetName: string,
    description: string = '',
    isPublic: boolean = false
  ): CompositionPreset {
    return {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: presetName,
      description,
      data: JSON.parse(JSON.stringify(assets)), // Deep clone
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic
    }
  }

  /**
   * Save preset to localStorage
   */
  static savePresetLocally(preset: CompositionPreset): boolean {
    try {
      const presets = this.getAllPresetsLocally()
      const existingIndex = presets.findIndex(p => p.id === preset.id)
      
      if (existingIndex >= 0) {
        presets[existingIndex] = preset
      } else {
        presets.push(preset)
      }

      localStorage.setItem('assetPresets', JSON.stringify(presets))
      return true
    } catch (e) {
      console.error('Failed to save preset locally:', e)
      return false
    }
  }

  /**
   * Load preset from localStorage
   */
  static loadPresetLocally(presetId: string): CompositionPreset | null {
    try {
      const presets = this.getAllPresetsLocally()
      return presets.find(p => p.id === presetId) || null
    } catch (e) {
      console.error('Failed to load preset locally:', e)
      return null
    }
  }

  /**
   * Get all presets from localStorage
   */
  static getAllPresetsLocally(): CompositionPreset[] {
    try {
      const stored = localStorage.getItem('assetPresets')
      if (!stored) return []
      
      const presets = JSON.parse(stored) as Array<{
        id: string
        name: string
        description: string
        data: AssetGenerationResponse
        createdAt: string
        updatedAt: string
        isPublic: boolean
      }>
      // Reconstruct dates
      return presets.map((p) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }))
    } catch (e) {
      console.error('Failed to get presets from localStorage:', e)
      return []
    }
  }

  /**
   * Delete preset from localStorage
   */
  static deletePresetLocally(presetId: string): boolean {
    try {
      const presets = this.getAllPresetsLocally()
      const filtered = presets.filter(p => p.id !== presetId)
      localStorage.setItem('assetPresets', JSON.stringify(filtered))
      return true
    } catch (e) {
      console.error('Failed to delete preset:', e)
      return false
    }
  }

  /**
   * Export preset as JSON file
   */
  static exportPreset(preset: CompositionPreset, filename?: string): void {
    const json = JSON.stringify(preset, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `${preset.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Import preset from JSON file
   */
  static importPreset(file: File): Promise<CompositionPreset | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const preset = JSON.parse(event.target?.result as string) as CompositionPreset
          preset.id = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          preset.createdAt = new Date()
          preset.updatedAt = new Date()
          resolve(preset)
        } catch (err) {
          console.error('Failed to import preset:', err)
          resolve(null)
        }
      }
      reader.readAsText(file)
    })
  }

  /**
   * Apply preset (merge into existing assets)
   */
  static applyPreset(
    existingAssets: AssetGenerationResponse,
    preset: CompositionPreset,
    mergeMode: 'replace' | 'merge' = 'replace'
  ): AssetGenerationResponse {
    if (mergeMode === 'replace') {
      return JSON.parse(JSON.stringify(preset.data))
    }

    // Merge mode: combine existing and preset assets
    return {
      ...existingAssets,
      ...preset.data,
      characters: [
        ...existingAssets.characters,
        ...preset.data.characters.filter(
          p => !existingAssets.characters.some(e => e.name === p.name)
        )
      ],
      gameMechanics: [
        ...existingAssets.gameMechanics,
        ...preset.data.gameMechanics.filter(
          p => !existingAssets.gameMechanics.some(e => e.name === p.name)
        )
      ],
      storyBeats: [
        ...existingAssets.storyBeats,
        ...preset.data.storyBeats.filter(
          p => !existingAssets.storyBeats.some(e => e.title === p.title)
        )
      ]
    }
  }

  /**
   * Validate preset structure
   */
  static isValidPreset(preset: unknown): preset is CompositionPreset {
    if (!preset || typeof preset !== 'object') return false
    const p = preset as Partial<CompositionPreset> & { data?: unknown }
    if (!p.data || typeof p.data !== 'object' || p.data === null) return false
    
    const data = p.data as unknown as Record<string, unknown>
    return (
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.description === 'string' &&
      Array.isArray(data.characters) &&
      Array.isArray(data.gameMechanics) &&
      Array.isArray(data.storyBeats)
    )
  }
}
