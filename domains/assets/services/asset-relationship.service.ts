import { AssetRelationship, CharacterProfile, GameMechanic, StoryBeat } from '@/domains/games/types'

/**
 * Asset Relationship Service
 * Computes and validates relationships between asset components
 */
export class AssetRelationshipService {
  /**
   * Analyze asset content to infer relationships
   * Looks for keywords and context clues to determine connections
   */
  static computeRelationships(
    characters: CharacterProfile[],
    mechanics: GameMechanic[],
    storyBeats: StoryBeat[]
  ): AssetRelationship[] {
    const relationships: AssetRelationship[] = []

    // Character → Mechanic relationships
    characters.forEach((char, charIdx) => {
      mechanics.forEach((mech, mechIdx) => {
        // Check if mechanic description mentions the character's role or motivation
        const charKeywords = [
          char.name.toLowerCase(),
          char.role.toLowerCase(),
          char.motivation.toLowerCase()
        ].filter(k => k.length > 3)

        const mechDescLower = mech.description.toLowerCase()
        const mechNameLower = mech.name.toLowerCase()

        if (charKeywords.some(keyword => mechDescLower.includes(keyword) || mechNameLower.includes(keyword))) {
          relationships.push({
            source: { type: 'character', index: charIdx },
            target: { type: 'mechanic', index: mechIdx },
            relationshipType: 'activates'
          })
        }
      })
    })

    // Mechanic → Story relationships
    mechanics.forEach((mech, mechIdx) => {
      storyBeats.forEach((beat, beatIdx) => {
        const mechKeywords = [
          mech.name.toLowerCase(),
          mech.description.toLowerCase()
        ].filter(k => k.length > 3)

        const beatDescLower = beat.description.toLowerCase()
        const beatTitleLower = beat.title.toLowerCase()

        if (mechKeywords.some(keyword => beatDescLower.includes(keyword) || beatTitleLower.includes(keyword))) {
          relationships.push({
            source: { type: 'mechanic', index: mechIdx },
            target: { type: 'story', index: beatIdx },
            relationshipType: 'triggers'
          })
        }
      })
    })

    // Character → Story relationships
    characters.forEach((char, charIdx) => {
      storyBeats.forEach((beat, beatIdx) => {
        const charKeywords = [
          char.name.toLowerCase(),
          char.role.toLowerCase()
        ].filter(k => k.length > 3)

        const beatDescLower = beat.description.toLowerCase()
        const beatTitleLower = beat.title.toLowerCase()

        if (charKeywords.some(keyword => beatDescLower.includes(keyword) || beatTitleLower.includes(keyword))) {
          relationships.push({
            source: { type: 'character', index: charIdx },
            target: { type: 'story', index: beatIdx },
            relationshipType: 'uses'
          })
        }
      })
    })

    // Remove duplicates
    return Array.from(new Map(
      relationships.map(r => [
        `${r.source.type}-${r.source.index}-${r.target.type}-${r.target.index}`,
        r
      ])
    ).values())
  }

  /**
   * Get all relationships for a specific asset
   */
  static getAssetRelationships(
    assetType: 'character' | 'mechanic' | 'story',
    assetIndex: number,
    relationships: AssetRelationship[]
  ) {
    return {
      outgoing: relationships.filter(
        r => r.source.type === assetType && r.source.index === assetIndex
      ),
      incoming: relationships.filter(
        r => r.target.type === assetType && r.target.index === assetIndex
      )
    }
  }

  /**
   * Validate that all referenced assets in relationships exist
   */
  static validateRelationships(
    relationships: AssetRelationship[],
    characters: CharacterProfile[],
    mechanics: GameMechanic[],
    storyBeats: StoryBeat[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    relationships.forEach((rel, idx) => {
      // Check source exists
      if (rel.source.type === 'character' && rel.source.index >= characters.length) {
        errors.push(`Relationship ${idx}: character index ${rel.source.index} out of bounds`)
      }
      if (rel.source.type === 'mechanic' && rel.source.index >= mechanics.length) {
        errors.push(`Relationship ${idx}: mechanic index ${rel.source.index} out of bounds`)
      }
      if (rel.source.type === 'story' && rel.source.index >= storyBeats.length) {
        errors.push(`Relationship ${idx}: story beat index ${rel.source.index} out of bounds`)
      }

      // Check target exists
      if (rel.target.type === 'character' && rel.target.index >= characters.length) {
        errors.push(`Relationship ${idx}: target character index ${rel.target.index} out of bounds`)
      }
      if (rel.target.type === 'mechanic' && rel.target.index >= mechanics.length) {
        errors.push(`Relationship ${idx}: target mechanic index ${rel.target.index} out of bounds`)
      }
      if (rel.target.type === 'story' && rel.target.index >= storyBeats.length) {
        errors.push(`Relationship ${idx}: target story beat index ${rel.target.index} out of bounds`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get relationship label for UI display
   */
  static getRelationshipLabel(relationshipType: string): string {
    const labels: Record<string, string> = {
      activates: 'Activates',
      uses: 'Uses',
      triggers: 'Triggers',
      requires: 'Requires'
    }
    return labels[relationshipType] || relationshipType
  }
}
