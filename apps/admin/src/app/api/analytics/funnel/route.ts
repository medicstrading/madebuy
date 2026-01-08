import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { analytics } from '@madebuy/db'

export async function GET(request: Request) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const productId = searchParams.get('productId')

    // Default to last 30 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get funnel data
    const funnelData = productId
      ? await analytics.getFunnelDataByProduct(tenant.id, productId, startDate, endDate)
      : await analytics.getFunnelData(tenant.id, startDate, endDate)

    // Get top products by conversion
    const topProducts = await analytics.getTopProductsByConversion(tenant.id, startDate, endDate, 5)

    return NextResponse.json({
      funnel: funnelData,
      topProducts,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}
