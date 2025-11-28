import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/database'

export async function GET() {
  try {
    const health = await checkDatabaseHealth()
    
    const status = health.healthy ? 200 : 503
    
    return NextResponse.json({
      success: health.healthy,
      database: health.message,
      environment: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'NOT_SET',
      timestamp: new Date().toISOString()
    }, { status })
  } catch (error) {
    return NextResponse.json({
      success: false,
      database: `Health check failed: ${error}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}