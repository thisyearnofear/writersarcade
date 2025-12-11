import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const asset = await GameDatabaseService.getAssetPack(id)

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset pack not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error('Fetch asset error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch asset pack' }, { status: 500 })
  }
}
