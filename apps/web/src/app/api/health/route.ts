import { getDatabase } from '@madebuy/db'
import { NextResponse } from 'next/server'

// Opt out of static generation - needs database access at runtime
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint for load balancer and monitoring
 * Returns 200 if app is healthy, 503 if unhealthy
 */
export async function GET() {
  try {
    // Check database connectivity
    const db = await getDatabase()
    await db.command({ ping: 1 })

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'madebuy-web',
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'madebuy-web',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    )
  }
}
