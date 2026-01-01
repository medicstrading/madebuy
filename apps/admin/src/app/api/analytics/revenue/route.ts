import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns'

export interface RevenueStats {
  today: number
  week: number
  month: number
  todayChange: number
  weekChange: number
  monthChange: number
}

/**
 * GET /api/analytics/revenue
 * Get revenue statistics for dashboard widget
 *
 * Returns:
 * - today: revenue in cents for today
 * - week: revenue in cents for this week
 * - month: revenue in cents for this month
 * - todayChange: percentage change vs yesterday
 * - weekChange: percentage change vs last week
 * - monthChange: percentage change vs last month
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Current period ranges
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Previous period ranges for comparison
    const yesterdayStart = startOfDay(subDays(now, 1))
    const yesterdayEnd = endOfDay(subDays(now, 1))
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    // Fetch all period summaries in parallel
    const [
      todaySummary,
      yesterdaySummary,
      weekSummary,
      lastWeekSummary,
      monthSummary,
      lastMonthSummary,
    ] = await Promise.all([
      transactions.getTransactionSummary(tenant.id, todayStart, todayEnd),
      transactions.getTransactionSummary(tenant.id, yesterdayStart, yesterdayEnd),
      transactions.getTransactionSummary(tenant.id, weekStart, weekEnd),
      transactions.getTransactionSummary(tenant.id, lastWeekStart, lastWeekEnd),
      transactions.getTransactionSummary(tenant.id, monthStart, monthEnd),
      transactions.getTransactionSummary(tenant.id, lastMonthStart, lastMonthEnd),
    ])

    // Calculate percentage changes
    const todayChange = calculatePercentageChange(
      todaySummary.totalNet,
      yesterdaySummary.totalNet
    )
    const weekChange = calculatePercentageChange(
      weekSummary.totalNet,
      lastWeekSummary.totalNet
    )
    const monthChange = calculatePercentageChange(
      monthSummary.totalNet,
      lastMonthSummary.totalNet
    )

    const stats: RevenueStats = {
      today: todaySummary.totalNet,
      week: weekSummary.totalNet,
      month: monthSummary.totalNet,
      todayChange,
      weekChange,
      monthChange,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    )
  }
}

/**
 * Calculate percentage change between current and previous values
 * Returns 0 if previous is 0 and current is also 0
 * Returns 100 if previous is 0 and current is positive
 * Returns -100 if previous is 0 and current is negative
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0
    return current > 0 ? 100 : -100
  }
  return Math.round(((current - previous) / previous) * 100)
}
