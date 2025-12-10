'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AssetMarketplaceService } from '@/domains/assets/services/asset-marketplace.service'
import type { Asset } from '@/domains/assets/services/asset-database.service'

interface AssetDetail {
  asset: Asset
  relatedAssets: Asset[]
  stats: {
    totalAssets: number;
    assetsByType: { type: string; count: number }[];
    assetsByGenre: { genre: string; count: number }[];
    topTags: { tag: string; count: number }[];
  }
}

export default function AssetDetailPage() {
  const params = useParams()
  const assetId = params?.id as string
  
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!assetId) return

    const loadAsset = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await AssetMarketplaceService.getAssetDetail(assetId)
        if (result) {
          setDetail(result)
        } else {
          setError('Asset not found')
        }
      } catch (err) {
        console.error('Failed to load asset detail:', err)
        setError('Failed to load asset details')
      } finally {
        setLoading(false)
      }
    }

    loadAsset()
  }, [assetId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-300">Loading asset...</p>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/assets" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Assets
          </Link>
          <div className="text-center py-12">
            <p className="text-slate-300">{error || 'Asset not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { asset, relatedAssets } = detail

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/assets" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
          ← Back to Assets
        </Link>

        {/* Asset Header */}
        <div className="bg-slate-700 rounded-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{asset.title}</h1>
              <p className="text-slate-300 mb-4">{asset.description}</p>
            </div>
            <span className="text-sm bg-blue-600 text-white px-4 py-2 rounded capitalize">
              {asset.type}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-600">
            <div>
              <p className="text-xs text-slate-400 uppercase">Genre</p>
              <p className="text-white font-semibold capitalize">{asset.genre}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Created</p>
              <p className="text-white font-semibold">
                {new Date(asset.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Type</p>
              <p className="text-white font-semibold capitalize">{asset.type}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Tags</p>
              <p className="text-white font-semibold">{asset.tags.length} tags</p>
            </div>
          </div>
        </div>

        {/* Asset Content */}
        <div className="bg-slate-700 rounded-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Content</h2>
          <div className="bg-slate-800 rounded p-4">
            <p className="text-slate-200 whitespace-pre-wrap break-words">{asset.content}</p>
          </div>
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="bg-slate-700 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {asset.tags.map((tag) => (
                <span key={tag} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Article Source */}
        {asset.articleUrl && (
          <div className="bg-slate-700 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Source Article</h2>
            <a
              href={asset.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 break-all"
            >
              {asset.articleUrl}
            </a>
          </div>
        )}

        {/* Creator Info */}
        {asset.creatorId && (
          <div className="bg-slate-700 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Creator</h2>
            <p className="text-slate-300 font-mono">{asset.creatorId}</p>
          </div>
        )}

        {/* Related Assets */}
        {relatedAssets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Related Assets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedAssets.map((relatedAsset) => (
                <Link href={`/assets/${relatedAsset.id}`} key={relatedAsset.id}>
                  <div className="bg-slate-700 rounded-lg overflow-hidden hover:bg-slate-600 transition cursor-pointer h-full">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-white flex-1">{relatedAsset.title}</h3>
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded capitalize">
                          {relatedAsset.type}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                        {relatedAsset.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="capitalize">{relatedAsset.genre}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="bg-slate-700 rounded-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Asset Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase">Total Assets</p>
              <p className="text-white font-semibold">{detail.stats.totalAssets}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Top Type</p>
              <p className="text-white font-semibold">
                {detail.stats.assetsByType[0]?.type || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Top Genre</p>
              <p className="text-white font-semibold">
                {detail.stats.assetsByGenre[0]?.genre || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Top Tag</p>
              <p className="text-white font-semibold">
                {detail.stats.topTags[0]?.tag || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Use This Asset</h2>
          <p className="text-blue-100 mb-6">
            Combine this asset with others to create a unique game experience.
          </p>
          <Link
            href="/assets"
            className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Browse More Assets
          </Link>
        </div>
      </div>
    </div>
  )
}
