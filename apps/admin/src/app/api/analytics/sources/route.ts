import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { tracking } from '@madebuy/db'

/**
 * GET /api/analytics/sources
 * Get traffic source analytics for the tenant
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' (default: '7d')
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse period from query params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d'

    // Calculate date range
    const endDate = new Date()
    let startDate: Date

    switch (period) {
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '7d':
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get analytics summary
    const summary = await tracking.getAnalyticsSummary(tenant.id, startDate, endDate)

    // Get daily breakdown
    const daily = await tracking.getDailyBreakdown(tenant.id, startDate, endDate)

    return NextResponse.json({
      ...summary,
      daily,
    })
  } catch (error) {
    console.error('Error fetching source analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
