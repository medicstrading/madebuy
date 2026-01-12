import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getCurrentTenant } from '@/lib/session'
import { transactions, pieces, getDatabase } from '@madebuy/db'
import type { Order } from '@madebuy/shared'

/**
 * Get paid orders within a date range
 */
async function getPaidOrdersInRange(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<Order[]> {
  const db = await getDatabase()
  const results = await db.collection('orders')
    .find({
      tenantId,
      paymentStatus: 'paid',
      paidAt: { $gte: startDate, $lte: endDate },
    })
    .toArray()
  return results as unknown as Order[]
}

/**
 * Calculate profitability metrics from orders
 */
async function calculateProfitability(
  tenantId: string,
  currentOrders: Order[],
  previousOrders: Order[]
) {
  // Collect all piece IDs from current orders
  const pieceIds = new Set<string>()
  for (const order of currentOrders) {
    for (const item of order.items || []) {
      pieceIds.add(item.pieceId)
    }
  }
  for (const order of previousOrders) {
    for (const item of order.items || []) {
      pieceIds.add(item.pieceId)
    }
  }

  // Batch fetch all pieces for COGS lookup
  const piecesMap = await pieces.getPiecesByIds(tenantId, Array.from(pieceIds))

  // Calculate current period metrics
  let currentRevenue = 0
  let currentMaterialCosts = 0
  for (const order of currentOrders) {
    for (const item of order.items || []) {
      const revenue = item.price * item.quantity
      currentRevenue += revenue
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) {
        currentMaterialCosts += piece.cogs * item.quantity
      }
    }
  }

  // Calculate previous period metrics for comparison
  let previousRevenue = 0
  let previousMaterialCosts = 0
  for (const order of previousOrders) {
    for (const item of order.items || []) {
      const revenue = item.price * item.quantity
      previousRevenue += revenue
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) {
        previousMaterialCosts += piece.cogs * item.quantity
      }
    }
  }

  const currentProfit = currentRevenue - currentMaterialCosts
  const previousProfit = previousRevenue - previousMaterialCosts
  const currentMargin = currentRevenue > 0 ? Math.round((currentProfit / currentRevenue) * 100) : 0
  const previousMargin = previousRevenue > 0 ? Math.round((previousProfit / previousRevenue) * 100) : 0

  // Calculate changes
  const revenueChange = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    : 0
  const profitChange = previousProfit > 0
    ? Math.round(((currentProfit - previousProfit) / previousProfit) * 100)
    : 0
  const marginChange = previousMargin > 0
    ? currentMargin - previousMargin
    : 0

  return {
    revenue: currentRevenue,
    materialCosts: currentMaterialCosts,
    actualProfit: currentProfit,
    profitMargin: currentMargin,
    revenueChange,
    profitChange,
    marginChange,
  }
}

/**
 * Cached ledger summary fetcher - expensive operation, cache for 60 seconds
 */
const getCachedLedgerSummary = unstable_cache(
  async (tenantId: string) => {
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

    // Fetch all data in parallel where possible
    const [
      todayTransactions,
      thisMonthSummary,
      lastMonthSummary,
      balance,
      ytdTransactions,
      thisMonthOrders,
      lastMonthOrders,
    ] = await Promise.all([
      transactions.listTransactions(tenantId, {
        filters: {
          startDate: todayStart,
          endDate: todayEnd,
          type: 'sale',
          status: 'completed',
        },
      }),
      transactions.getTransactionSummary(tenantId, thisMonthStart, thisMonthEnd),
      transactions.getTransactionSummary(tenantId, lastMonthStart, lastMonthEnd),
      transactions.getTenantBalance(tenantId),
      transactions.listTransactions(tenantId, {
        filters: {
          startDate: yearStart,
          endDate: now,
          status: 'completed',
        },
        limit: 10000,
      }),
      getPaidOrdersInRange(tenantId, thisMonthStart, thisMonthEnd),
      getPaidOrdersInRange(tenantId, lastMonthStart, lastMonthEnd),
    ])

    const todaySales = {
      gross: todayTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
      net: todayTransactions.reduce((sum, tx) => sum + tx.netAmount, 0),
      count: todayTransactions.length,
    }

    // Calculate month-over-month change
    const lastMonthNet = lastMonthSummary.sales.net || 1
    const monthChange = lastMonthSummary.sales.net > 0
      ? Math.round(((thisMonthSummary.sales.net - lastMonthSummary.sales.net) / lastMonthNet) * 100)
      : 0

    const feesYTD = ytdTransactions.reduce((sum, tx) => sum + (tx.stripeFee || 0), 0)

    const profitability = await calculateProfitability(tenantId, thisMonthOrders, lastMonthOrders)

    return {
      todaySales,
      pendingPayout: {
        amount: balance.pendingBalance,
        inTransit: 0,
        nextDate: null,
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
      profitability,
    }
  },
  ['ledger-summary'],
  { revalidate: 60, tags: ['ledger'] } // 60 second cache
)

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

    const summary = await getCachedLedgerSummary(tenant.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching ledger summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ledger summary' },
      { status: 500 }
    )
  }
}
