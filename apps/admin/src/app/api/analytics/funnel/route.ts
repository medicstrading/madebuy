import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/session'
import { analytics } from '@madebuy/db'

// Cache funnel data for 2 minutes - analytics don't need real-time updates
const getCachedFunnelData = unstable_cache(
  async (tenantId: string, startDate: Date, endDate: Date, productId?: string) => {
    const [funnelData, topProducts] = await Promise.all([
      productId
        ? analytics.getFunnelDataByProduct(tenantId, productId, startDate, endDate)
        : analytics.getFunnelData(tenantId, startDate, endDate),
      analytics.getTopProductsByConversion(tenantId, startDate, endDate, 5),
    ])

    return {
      funnel: funnelData,
      topProducts,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    }
  },
  ['analytics-funnel'],
  { revalidate: 120, tags: ['analytics'] } // 2 minute cache
)

export async function GET(request: Request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const productId = searchParams.get('productId') || undefined

    // Default to last 30 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const result = await getCachedFunnelData(tenant.id, startDate, endDate, productId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}
