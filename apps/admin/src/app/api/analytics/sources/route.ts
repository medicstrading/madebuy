import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/session'
import { tracking } from '@madebuy/db'

// Cache source data for 2 minutes
const getCachedSourceData = unstable_cache(
  async (tenantId: string, startDate: Date, endDate: Date) => {
    const summary = await tracking.getAnalyticsSummary(tenantId, startDate, endDate)
    return summary
  },
  ['analytics-sources'],
  { revalidate: 120, tags: ['analytics'] }
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

    // Default to last 30 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const result = await getCachedSourceData(tenant.id, startDate, endDate)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error fetching source data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source data' },
      { status: 500 }
    )
  }
}
