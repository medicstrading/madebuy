import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions, payouts } from '@madebuy/db'

/**
 * GET /api/ledger/summary
 * Get summary statistics for dashboard widgets
 *
 * Returns:
 * - todaySales: { gross, net, count }
 * - pendingPayout: { amount, nextDate, inTransit }
 * - thisMonth: { gross, net, count }
 * - lastMonth: { gross, net, count }
 * - feesYTD: total fees paid year-to-date
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Today's date range (start of day to now)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // This month's date range
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Last month's date range
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Year-to-date start
    const ytdStart = new Date(now.getFullYear(), 0, 1)

    // Fetch all data in parallel
    const [
      todaySummary,
      thisMonthSummary,
      lastMonthSummary,
      ytdSummary,
      pendingPayoutData,
    ] = await Promise.all([
      // Today's sales
      transactions.getTransactionSummary(tenant.id, todayStart, now),

      // This month's sales
      transactions.getTransactionSummary(tenant.id, thisMonthStart, now),

      // Last month's sales
      transactions.getTransactionSummary(tenant.id, lastMonthStart, lastMonthEnd),

      // Year-to-date for fees
      transactions.getTransactionSummary(tenant.id, ytdStart, now),

      // Pending payout info
      payouts.getPendingPayoutSummary(tenant.id),
    ])

    // Calculate month-over-month change
    const monthChange = lastMonthSummary.totalGross > 0
      ? Math.round(((thisMonthSummary.totalGross - lastMonthSummary.totalGross) / lastMonthSummary.totalGross) * 100)
      : thisMonthSummary.totalGross > 0 ? 100 : 0

    return NextResponse.json({
      todaySales: {
        gross: todaySummary.totalGross,
        net: todaySummary.totalNet,
        count: todaySummary.salesCount,
      },
      pendingPayout: {
        amount: pendingPayoutData.pendingAmount,
        inTransit: pendingPayoutData.inTransitAmount,
        nextDate: pendingPayoutData.nextPayoutDate,
      },
      thisMonth: {
        gross: thisMonthSummary.totalGross,
        net: thisMonthSummary.totalNet,
        count: thisMonthSummary.salesCount,
        fees: thisMonthSummary.totalFees,
        refunds: thisMonthSummary.refundAmount,
      },
      lastMonth: {
        gross: lastMonthSummary.totalGross,
        net: lastMonthSummary.totalNet,
        count: lastMonthSummary.salesCount,
      },
      monthChange,
      feesYTD: ytdSummary.totalFees,
    })
  } catch (error) {
    console.error('Error fetching ledger summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ledger summary' },
      { status: 500 }
    )
  }
}
