import { platformAnalytics } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()

    const [
      mrrBreakdown,
      todayStats,
      mrrTimeSeries,
      revenueByTier,
      topSellers,
      revenueTimeSeries,
      marketplaceStats,
    ] = await Promise.all([
      platformAnalytics.getMRRBreakdown(),
      platformAnalytics.getRevenueTimeSeries('day', 1),
      platformAnalytics.getMRRTimeSeries(12),
      platformAnalytics.getRevenueByTier(),
      platformAnalytics.getTopSellersByRevenue(10),
      platformAnalytics.getRevenueTimeSeries('day', 30),
      platformAnalytics.getMarketplaceStats(),
    ])

    const today = todayStats[0] || { revenue: 0, orderCount: 0, avgOrderValue: 0 }

    return NextResponse.json({
      mrr: mrrBreakdown.totalMrr,
      previousMrr: mrrBreakdown.totalMrr * 0.95, // Placeholder for previous month
      totalRevenue: marketplaceStats.totalRevenue,
      ordersToday: today.orderCount,
      avgOrderValue: marketplaceStats.avgOrderValue,

      mrrTimeSeries: mrrTimeSeries.map((point) => ({
        date: point.date,
        mrr: point.mrr,
      })),

      revenueByTier: revenueByTier.map((tier) => ({
        tier: tier.tier,
        revenue: tier.revenue,
        count: tier.count,
        percentage: tier.percentage,
      })),

      topSellers: topSellers.map((seller) => ({
        tenantId: seller.tenantId,
        businessName: seller.businessName,
        totalRevenue: seller.totalRevenue,
        orderCount: seller.orderCount,
        avgOrderValue: seller.avgOrderValue,
        plan: seller.plan,
      })),

      revenueTimeSeries: revenueTimeSeries.map((point) => ({
        date: point.date,
        revenue: point.revenue,
        orderCount: point.orderCount,
      })),
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 },
    )
  }
}
