import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { payouts, transactions } from '@madebuy/db'

/**
 * GET /api/payouts/summary
 * Get payout summary and pending balance for dashboard
 *
 * Query params:
 * - startDate: ISO date string (optional, defaults to 30 days ago)
 * - endDate: ISO date string (optional, defaults to now)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get payout summary for the period
    const payoutSummary = await payouts.getPayoutSummary(tenant.id, start, end)

    // Get pending payout info
    const pendingSummary = await payouts.getPendingPayoutSummary(tenant.id)

    // Get unpaid transactions (sales completed but not yet paid out)
    const unpaidTransactions = await transactions.getUnpaidTransactions(tenant.id)
    const unpaidAmount = unpaidTransactions.reduce((sum, t) => sum + t.net, 0)

    // Get payout statistics
    const payoutStats = await payouts.getPayoutStats(tenant.id, start, end)

    return NextResponse.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      payouts: {
        totalPaid: payoutSummary.totalPaid,
        totalPending: payoutSummary.totalPending,
        count: payoutSummary.payoutCount,
        averageAmount: payoutStats.averagePayoutAmount,
        failedCount: payoutStats.failedCount,
      },
      balance: {
        pendingPayout: pendingSummary.pendingAmount,
        inTransit: pendingSummary.inTransitAmount,
        nextPayoutDate: pendingSummary.nextPayoutDate,
        unpaidSales: unpaidAmount,
        unpaidCount: unpaidTransactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching payout summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout summary' },
      { status: 500 }
    )
  }
}
