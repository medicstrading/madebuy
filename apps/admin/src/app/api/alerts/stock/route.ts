import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'

// Cache stock alerts for 30 seconds - balances freshness with performance
const getCachedStockAlerts = unstable_cache(
  async (tenantId: string, threshold: number) => {
    const alerts = await pieces.getStockAlerts(tenantId, threshold)

    return {
      alerts,
      summary: {
        outOfStock: alerts.filter(a => a.alertType === 'out_of_stock').length,
        lowStock: alerts.filter(a => a.alertType === 'low_stock').length,
        total: alerts.length,
      },
    }
  },
  ['stock-alerts'],
  { revalidate: 30, tags: ['stock', 'inventory'] }
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

    const result = await getCachedStockAlerts(tenant.id, thresholdValue)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching stock alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
