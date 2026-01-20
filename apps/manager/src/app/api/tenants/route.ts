import { platformAnalytics } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()

    const [tenants, counts, byPlan] = await Promise.all([
      platformAnalytics.getTenantHealthScores(200),
      platformAnalytics.getTenantCounts(),
      platformAnalytics.getTenantsByPlan(),
    ])

    return NextResponse.json({
      tenants,
      counts,
      byPlan,
    })
  } catch (error) {
    console.error('Tenants API error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch tenants data' },
      { status: 500 },
    )
  }
}
