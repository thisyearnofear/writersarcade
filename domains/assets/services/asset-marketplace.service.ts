import { AssetDatabaseService, type Asset } from './asset-database.service'
import type { Game } from '@/domains/games/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Asset Marketplace Service
 * Handles discovery, caching, and composition logic for asset marketplace
 */
export class AssetMarketplaceService {
  private static cache = new Map<string, CacheEntry<unknown>>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  
  /**
   * Get featured assets for homepage discovery
   * Cached for performance
   */
  static async getFeaturedAssets(limit: number = 12) {
    const cacheKey = `featured:${limit}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }
    
    try {
      // Featured: most recent assets across all types
      const result = await AssetDatabaseService.getAssets({
        limit,
        offset: 0,
      })
      
      const featured = {
        assets: result.assets,
        total: result.total,
        lastUpdated: new Date(),
      }
      
      this.setCache(cacheKey, featured)
      return featured
    } catch (error) {
      console.error('Failed to get featured assets:', error)
      return {
        assets: [],
        total: 0,
        lastUpdated: new Date(),
      }
    }
  }
  
  /**
   * Get assets by type with caching
   */
  static async getAssetsByType(type: string, limit: number = 12) {
    const cacheKey = `type:${type}:${limit}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }
    
    try {
      const result = await AssetDatabaseService.getAssetsByType(type, limit)
      
      const data = {
        type,
        ...result,
        lastUpdated: new Date(),
      }
      
      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to get assets by type ${type}:`, error)
      return {
        type,
        assets: [],
        total: 0,
        limit,
        offset: 0,
        hasMore: false,
        lastUpdated: new Date(),
      }
    }
  }
  
  /**
   * Get assets by genre with caching
   */
  static async getAssetsByGenre(genre: string, limit: number = 12) {
    const cacheKey = `genre:${genre}:${limit}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }
    
    try {
      const result = await AssetDatabaseService.getAssetsByGenre(genre, limit)
      
      const data = {
        genre,
        ...result,
        lastUpdated: new Date(),
      }
      
      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to get assets by genre ${genre}:`, error)
      return {
        genre,
        assets: [],
        total: 0,
        limit,
        offset: 0,
        hasMore: false,
        lastUpdated: new Date(),
      }
    }
  }
  
  /**
   * Search assets by term with caching
   */
  static async searchAssets(searchTerm: string, limit: number = 12, offset: number = 0) {
    const cacheKey = `search:${searchTerm}:${limit}:${offset}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }
    
    try {
      const result = await AssetDatabaseService.getAssets({
        search: searchTerm,
        limit,
        offset,
      })
      
      const data = {
        searchTerm,
        ...result,
        lastUpdated: new Date(),
      }
      
      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Failed to search assets for "${searchTerm}":`, error)
      return {
        searchTerm,
        assets: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
        lastUpdated: new Date(),
      }
    }
  }
  
  /**
   * Get trending assets based on recent usage
   * (Assets used in most recently created games)
   */
  static async getTrendingAssets(limit: number = 12) {
    const cacheKey = `trending:${limit}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data
    }
    
    try {
      // Get recently used assets by counting games_from_assets
      const result = await AssetDatabaseService.getAssets({
        limit,
        offset: 0,
      })
      
      // TODO: In future, sort by usage frequency
      // For now, return most recent assets as "trending"
      const data = {
        assets: result.assets,
        total: result.total,
        lastUpdated: new Date(),
      }
      
      this.setCache(cacheKey, data)
      return data
    } catch (error) {
      console.error('Failed to get trending assets:', error)
      return {
        assets: [],
        total: 0,
        lastUpdated: new Date(),
      }
    }
  }
  
  /**
   * Compose a game from multiple assets
   * Associates game with source assets
   */
  static async composeGameFromAssets(
    assetIds: string[],
    customization?: {
      genre?: string
      difficulty?: string
      title?: string
      description?: string
    }
  ): Promise<{ game: Game; assetCount: number } | null> {
    if (!assetIds || assetIds.length === 0) {
      console.error('No assets provided for composition')
      return null
    }
    
    try {
      // Fetch all assets to verify they exist and get content
      const assets = await Promise.all(
        assetIds.map(id => AssetDatabaseService.getAssetById(id))
      )
      
      // Filter out null assets
      const validAssets = assets.filter((a): a is Asset => a !== null)
      
      if (validAssets.length === 0) {
        console.error('No valid assets found for composition')
        return null
      }
      
      // Build game narrative from asset content
      const assetContent = validAssets
        .map(a => `[${a.type.toUpperCase()}] ${a.title}: ${a.content}`)
        .join('\n\n')
      
      // TODO: Call GameAIService.generateGame() with asset-derived prompt
      // For now, return structure for integration
      
      return {
        game: {
          id: `game-from-assets-${Date.now()}`,
          title: customization?.title || `Game from ${validAssets.length} Assets`,
          slug: `game-${Date.now()}`,
          description: customization?.description || assetContent.slice(0, 200),
          tagline: '',
          genre: customization?.genre || validAssets[0]?.genre || 'adventure',
          subgenre: '',
          primaryColor: '#3b82f6',
          promptName: 'GenerateFromAssets-v1',
          promptText: assetContent,
          promptModel: 'gpt-4o-mini',
          imageUrl: undefined,
          private: false,
          userId: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Game,
        assetCount: validAssets.length,
      }
    } catch (error) {
      console.error('Failed to compose game from assets:', error)
      return null
    }
  }
  
  /**
   * Get asset detail view with related assets
   */
  static async getAssetDetail(assetId: string) {
    try {
      const asset = await AssetDatabaseService.getAssetById(assetId)
      
      if (!asset) {
        return null
      }
      
      // Get related assets (same type and genre)
      const relatedAssets = await AssetDatabaseService.getAssets({
        type: asset.type,
        genre: asset.genre,
        limit: 6,
      })
      
      // Filter out the current asset
      const related = relatedAssets.assets.filter(a => a.id !== assetId)
      
      return {
        asset,
        relatedAssets: related,
        stats: await AssetDatabaseService.getAssetStats(),
      }
    } catch (error) {
      console.error(`Failed to get asset detail for ${assetId}:`, error)
      return null
    }
  }
  
  /**
   * Clear cache for a specific key or all cache
   */
  static clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    // Clear cache entries matching pattern
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    )
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
  
  /**
   * Private helper: check if cache entry is still valid
   */
  private static isCacheValid(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    const now = Date.now()
    const age = now - entry.timestamp
    
    return age < this.CACHE_TTL
  }
  
  /**
   * Private helper: set cache entry with timestamp
   */
  private static setCache<T>(key: string, data: T) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
}
