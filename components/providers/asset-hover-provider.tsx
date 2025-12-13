'use client'

import { useState, useMemo } from 'react'
import { AssetHoverContext, HoverAsset } from '@/contexts/asset-hover.context'
import { AssetRelationship, CharacterProfile, GameMechanic, StoryBeat } from '@/domains/games/types'
import { AssetRelationshipService } from '@/domains/assets/services/asset-relationship.service'

interface AssetHoverProviderProps {
  children: React.ReactNode
  relationships: AssetRelationship[]
  characters: CharacterProfile[]
  mechanics: GameMechanic[]
  storyBeats: StoryBeat[]
}

export function AssetHoverProvider({
  children,
  relationships,
  characters,
  mechanics,
  storyBeats
}: AssetHoverProviderProps) {
  const [hoveredAsset, setHoveredAsset] = useState<HoverAsset | null>(null)

  // Compute related assets based on hovering
  const relatedAssets = useMemo<HoverAsset[]>(() => {
    if (!hoveredAsset) return []

    const related = new Set<string>()

    relationships.forEach((rel) => {
      // If hovering source, highlight targets
      if (
        rel.source.type === hoveredAsset.type &&
        rel.source.index === hoveredAsset.index
      ) {
        related.add(`${rel.target.type}-${rel.target.index}`)
      }
      // If hovering target, highlight sources
      if (
        rel.target.type === hoveredAsset.type &&
        rel.target.index === hoveredAsset.index
      ) {
        related.add(`${rel.source.type}-${rel.source.index}`)
      }
    })

    return Array.from(related).map((key) => {
      const [type, indexStr] = key.split('-') as [
        'character' | 'mechanic' | 'story',
        string
      ]
      return { type, index: parseInt(indexStr, 10) }
    })
  }, [hoveredAsset, relationships])

  return (
    <AssetHoverContext.Provider
      value={{
        hoveredAsset,
        relatedAssets,
        setHoveredAsset,
        setRelatedAssets: () => {} // Computed automatically
      }}
    >
      {children}
    </AssetHoverContext.Provider>
  )
}
