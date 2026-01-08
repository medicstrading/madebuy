import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { transactions } from '@madebuy/db'

/**
 * GET /api/ledger/summary
 * Get financial summary for dashboard widgets
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Today's date range
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // This month's date range
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Last month's date range
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Year to date
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Fetch today's transactions
    const todayTransactions = await transactions.listTransactions(tenant.id, {
      filters: {
        startDate: todayStart,
        endDate: todayEnd,
        type: 'sale',
        status: 'completed',
      },
    })

    const todaySales = {
      gross: todayTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
      net: todayTransactions.reduce((sum, tx) => sum + tx.netAmount, 0),
      count: todayTransactions.length,
    }

    // Fetch this month's summary
    const thisMonthSummary = await transactions.getTransactionSummary(
      tenant.id,
      thisMonthStart,
      thisMonthEnd
    )

    // Fetch last month's summary
    const lastMonthSummary = await transactions.getTransactionSummary(
      tenant.id,
      lastMonthStart,
      lastMonthEnd
    )

    // Calculate month-over-month change
    const lastMonthNet = lastMonthSummary.sales.net || 1 // Avoid division by zero
    const monthChange = lastMonthSummary.sales.net > 0
      ? Math.round(((thisMonthSummary.sales.net - lastMonthSummary.sales.net) / lastMonthNet) * 100)
      : 0

    // Fetch pending balance
    const balance = await transactions.getTenantBalance(tenant.id)

    // Calculate YTD fees
    const ytdTransactions = await transactions.listTransactions(tenant.id, {
      filters: {
        startDate: yearStart,
        endDate: now,
        status: 'completed',
      },
      limit: 10000, // Get all for the year
    })

    const feesYTD = ytdTransactions.reduce((sum, tx) => sum + (tx.stripeFee || 0), 0)

    return NextResponse.json({
      todaySales,
      pendingPayout: {
        amount: balance.pendingBalance,
        inTransit: 0, // Would need Stripe API to get actual in-transit
        nextDate: null, // Would need Stripe API for payout schedule
      },
      thisMonth: {
        gross: thisMonthSummary.sales.gross,
        net: thisMonthSummary.sales.net,
        count: thisMonthSummary.sales.count,
        fees: thisMonthSummary.sales.fees,
        refunds: thisMonthSummary.refunds.amount,
      },
      lastMonth: {
        gross: lastMonthSummary.sales.gross,
        net: lastMonthSummary.sales.net,
        count: lastMonthSummary.sales.count,
      },
      monthChange,
      feesYTD,
    })
  } catch (error) {
    console.error('Error fetching ledger summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ledger summary' },
      { status: 500 }
    )
  }
}
