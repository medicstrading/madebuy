import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { analytics } from '@madebuy/db'

/**
 * GET /api/analytics
 * Get comprehensive analytics for the current tenant
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' | 'year' (default: '30d')
 * - type: 'overview' | 'sales' | 'products' | 'customers' | 'inventory' (default: 'overview')
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const type = searchParams.get('type') || 'overview'

    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(startDate.getDate() - 30)
    }

    switch (type) {
      case 'overview': {
        // Get comprehensive overview
        const [
          periodComparison,
          dailySales,
          topProducts,
          categoryBreakdown,
          inventoryStats,
          conversionRate,
        ] = await Promise.all([
          analytics.getPeriodComparison(tenant.id, startDate, endDate),
          analytics.getDailySales(tenant.id, startDate, endDate),
          analytics.getTopProducts(tenant.id, startDate, endDate, 5),
          analytics.getCategoryBreakdown(tenant.id, startDate, endDate),
          analytics.getInventoryStats(tenant.id),
          analytics.getConversionRate(tenant.id, startDate, endDate),
        ])

        return NextResponse.json({
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          summary: periodComparison,
          dailySales,
          topProducts,
          categoryBreakdown,
          inventoryStats,
          conversionRate,
        })
      }

      case 'sales': {
        const [periodComparison, dailySales] = await Promise.all([
          analytics.getPeriodComparison(tenant.id, startDate, endDate),
          analytics.getDailySales(tenant.id, startDate, endDate),
        ])

        return NextResponse.json({
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          summary: periodComparison,
          dailySales,
        })
      }

      case 'products': {
        const [topProducts, categoryBreakdown] = await Promise.all([
          analytics.getTopProducts(tenant.id, startDate, endDate, 20),
          analytics.getCategoryBreakdown(tenant.id, startDate, endDate),
        ])

        return NextResponse.json({
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          topProducts,
          categoryBreakdown,
        })
      }

      case 'customers': {
        const customerStats = await analytics.getCustomerStats(tenant.id, startDate, endDate)

        return NextResponse.json({
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          customerStats,
        })
      }

      case 'inventory': {
        const inventoryStats = await analytics.getInventoryStats(tenant.id)

        return NextResponse.json({
          inventoryStats,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
