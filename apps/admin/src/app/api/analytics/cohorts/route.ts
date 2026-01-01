import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { customers } from '@madebuy/db'

/**
 * GET /api/analytics/cohorts
 * Get cohort analysis by first purchase month
 *
 * Query params:
 * - months: number of months to analyze (default: 12)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12')

    const cohortData = await customers.getCohortAnalysis(tenant.id, months)

    // Calculate summary stats
    const totalCohorts = cohortData.length
    const totalCustomers = cohortData.reduce((sum, c) => sum + c.customers, 0)

    // Average retention by month across all cohorts
    const maxRetentionMonths = Math.max(...cohortData.map((c) => c.retention.length), 0)
    const averageRetention: number[] = []

    for (let i = 0; i < maxRetentionMonths; i++) {
      const cohortsWithMonth = cohortData.filter((c) => c.retention[i] !== undefined)
      if (cohortsWithMonth.length > 0) {
        const sum = cohortsWithMonth.reduce((s, c) => s + (c.retention[i] || 0), 0)
        averageRetention.push(Math.round(sum / cohortsWithMonth.length))
      }
    }

    // Calculate average revenue per cohort
    const averageRevenue = cohortData.length > 0
      ? cohortData.reduce((sum, c) => sum + c.revenue.reduce((s, r) => s + r, 0), 0) / cohortData.length
      : 0

    return NextResponse.json({
      cohorts: cohortData,
      summary: {
        totalCohorts,
        totalCustomers,
        averageRetention,
        averageRevenuePerCohort: averageRevenue,
        analysisMonths: months,
      },
    })
  } catch (error) {
    console.error('Error fetching cohort analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cohort analytics' },
      { status: 500 }
    )
  }
}
