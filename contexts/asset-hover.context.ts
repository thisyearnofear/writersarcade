import { createContext, useContext } from 'react'

export interface HoverAsset {
  type: 'character' | 'mechanic' | 'story'
  index: number
}

interface AssetHoverContext {
  hoveredAsset: HoverAsset | null
  relatedAssets: HoverAsset[]
  setHoveredAsset: (asset: HoverAsset | null) => void
  setRelatedAssets: (assets: HoverAsset[]) => void
}

export const AssetHoverContext = createContext<AssetHoverContext | null>(null)

export function useAssetHover() {
  const context = useContext(AssetHoverContext)
  if (!context) {
    throw new Error('useAssetHover must be used within AssetHoverProvider')
  }
  return context
}
