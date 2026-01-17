import { pieces } from '@madebuy/db'
import { unstable_cache } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

// Cache stock alerts for 30 seconds - balances freshness with performance
const getCachedStockAlerts = unstable_cache(
  async (tenantId: string, threshold: number) => {
    const alerts = await pieces.getStockAlerts(tenantId, threshold)

    return {
      alerts,
      summary: {
        outOfStock: alerts.filter((a) => a.alertType === 'out_of_stock').length,
        lowStock: alerts.filter((a) => a.alertType === 'low_stock').length,
        total: alerts.length,
      },
    }
  },
  ['stock-alerts'],
  { revalidate: 30, tags: ['stock', 'inventory'] },
)

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threshold = searchParams.get('threshold')
    const thresholdValue = threshold ? parseInt(threshold, 10) : 5

    // Validate threshold to prevent NaN or negative values
    if (Number.isNaN(thresholdValue) || thresholdValue < 0) {
      return NextResponse.json(
        { error: 'Invalid threshold value' },
        { status: 400 },
      )
    }

    const result = await getCachedStockAlerts(tenant.id, thresholdValue)
    // P13: Add cache headers for browser caching
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching stock alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
