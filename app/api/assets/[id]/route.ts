import { NextRequest, NextResponse } from 'next/server'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'
import { AssetMarketplaceService } from '@/domains/assets/services/asset-marketplace.service'

/**
 * GET /api/assets/[id]
 * 
 * Get asset detail with related assets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const detail = await AssetMarketplaceService.getAssetDetail(id)

    if (!detail) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      ...detail,
    })
  } catch (error) {
    console.error('Asset detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/assets/[id]
 * 
 * Update asset
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const updated = await AssetDatabaseService.updateAsset(id, body)

    if (!updated) {
      return NextResponse.json(
        { error: 'Asset not found or update failed' },
        { status: 404 }
      )
    }

    // Invalidate related caches
    AssetMarketplaceService.clearCache()

    return NextResponse.json({
      success: true,
      asset: updated,
    })
  } catch (error) {
    console.error('Asset update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assets/[id]
 * 
 * Delete asset
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const deleted = await AssetDatabaseService.deleteAsset(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Invalidate related caches
    AssetMarketplaceService.clearCache()

    return NextResponse.json({
      success: true,
      message: 'Asset deleted',
    })
  } catch (error) {
    console.error('Asset deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
