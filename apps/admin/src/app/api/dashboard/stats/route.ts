import { getDatabase, analytics, pieces, transactions } from '@madebuy/db'
import type { Order } from '@madebuy/shared'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

// Types for the consolidated response
interface LedgerSummary {
  todaySales: { gross: number; net: number; count: number }
  pendingPayout: { amount: number; inTransit: number; nextDate: string | null }
  thisMonth: { gross: number; net: number; count: number; fees: number; refunds: number }
  lastMonth: { gross: number; net: number; count: number }
  monthChange: number
  feesYTD: number
  profitability: {
    revenue: number
    materialCosts: number
    actualProfit: number
    profitMargin: number
    revenueChange: number
    profitChange: number
    marginChange: number
  }
}

interface FunnelData {
  viewProduct: number
  addToCart: number
  startCheckout: number
  completePurchase: number
  overallConversionRate: number
}

export interface DashboardStats {
  ledgerSummary: LedgerSummary
  funnel: FunnelData
}

async function getYtdFeesSummary(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
  const db = await getDatabase()
  const pipeline = [
    { $match: { tenantId, status: 'completed', createdAt: { $gte: startDate, $lte: endDate }, stripeFee: { $exists: true, $gt: 0 } } },
    { $group: { _id: null, totalFees: { $sum: '$stripeFee' } } },
  ]
  const results = await db.collection('transactions').aggregate(pipeline).toArray()
  return results[0]?.totalFees || 0
}

async function getPaidOrdersInRange(tenantId: string, startDate: Date, endDate: Date): Promise<Order[]> {
  const db = await getDatabase()
  const results = await db.collection('orders').find({
    tenantId, paymentStatus: 'paid', paidAt: { $gte: startDate, $lte: endDate },
  }).toArray()
  return results as unknown as Order[]
}

async function calculateProfitability(tenantId: string, currentOrders: Order[], previousOrders: Order[]) {
  const pieceIds = new Set<string>()
  for (const order of [...currentOrders, ...previousOrders]) {
    for (const item of order.items || []) pieceIds.add(item.pieceId)
  }
  const piecesMap = await pieces.getPiecesByIds(tenantId, Array.from(pieceIds))

  let currentRevenue = 0, currentMaterialCosts = 0
  for (const order of currentOrders) {
    for (const item of order.items || []) {
      currentRevenue += item.price * item.quantity
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) currentMaterialCosts += piece.cogs * item.quantity
    }
  }

  let previousRevenue = 0, previousMaterialCosts = 0
  for (const order of previousOrders) {
    for (const item of order.items || []) {
      previousRevenue += item.price * item.quantity
      const piece = piecesMap.get(item.pieceId)
      if (piece?.cogs) previousMaterialCosts += piece.cogs * item.quantity
    }
  }

  const currentProfit = currentRevenue - currentMaterialCosts
  const previousProfit = previousRevenue - previousMaterialCosts
  const currentMargin = currentRevenue > 0 ? Math.round((currentProfit / currentRevenue) * 100) : 0
  const previousMargin = previousRevenue > 0 ? Math.round((previousProfit / previousRevenue) * 100) : 0

  return {
    revenue: currentRevenue,
    materialCosts: currentMaterialCosts,
    actualProfit: currentProfit,
    profitMargin: currentMargin,
    revenueChange: previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0,
    profitChange: previousProfit > 0 ? Math.round(((currentProfit - previousProfit) / previousProfit) * 100) : 0,
    marginChange: previousMargin > 0 ? currentMargin - previousMargin : 0,
  }
}

const getCachedDashboardStats = unstable_cache(
  async (tenantId: string): Promise<DashboardStats> => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Fetch ALL data in parallel
    const [
      todayTransactions,
      thisMonthSummary,
      lastMonthSummary,
      balance,
      ytdFeesSummary,
      thisMonthOrders,
      lastMonthOrders,
      funnelData,
    ] = await Promise.all([
      transactions.listTransactions(tenantId, { filters: { startDate: todayStart, endDate: todayEnd, type: 'sale', status: 'completed' } }),
      transactions.getTransactionSummary(tenantId, thisMonthStart, thisMonthEnd),
      transactions.getTransactionSummary(tenantId, lastMonthStart, lastMonthEnd),
      transactions.getTenantBalance(tenantId),
      getYtdFeesSummary(tenantId, yearStart, now),
      getPaidOrdersInRange(tenantId, thisMonthStart, thisMonthEnd),
      getPaidOrdersInRange(tenantId, lastMonthStart, lastMonthEnd),
      analytics.getFunnelData(tenantId, thisMonthStart, thisMonthEnd),
    ])

    const todaySales = {
      gross: todayTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0),
      net: todayTransactions.reduce((sum, tx) => sum + tx.netAmount, 0),
      count: todayTransactions.length,
    }

    const lastMonthNet = lastMonthSummary.sales.net || 1
    const monthChange = lastMonthSummary.sales.net > 0
      ? Math.round(((thisMonthSummary.sales.net - lastMonthSummary.sales.net) / lastMonthNet) * 100)
      : 0

    const profitability = await calculateProfitability(tenantId, thisMonthOrders, lastMonthOrders)

    return {
      ledgerSummary: {
        todaySales,
        pendingPayout: { amount: balance.pendingBalance, inTransit: 0, nextDate: null },
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
        feesYTD: ytdFeesSummary,
        profitability,
      },
      funnel: funnelData,
    }
  },
  ['dashboard-stats-consolidated'],
  { revalidate: 60, tags: ['dashboard', 'ledger'] },
)

export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getCachedDashboardStats(tenant.id)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
