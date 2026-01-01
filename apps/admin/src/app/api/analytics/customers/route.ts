import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { customers } from '@madebuy/db'

/**
 * GET /api/analytics/customers
 * Get customer analytics: LTV, segments, and top customers
 *
 * Query params:
 * - type: 'stats' | 'top' | 'ltv' | 'sources' (default: 'stats')
 * - limit: number (for top customers, default: 10)
 * - period: '7d' | '30d' | '90d' | 'year' (default: '30d')
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '10')
    const period = searchParams.get('period') || '30d'

    // Calculate date range
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
      case 'stats': {
        const stats = await customers.getCustomerStats(tenant.id, startDate, endDate)
        return NextResponse.json({
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          stats,
        })
      }

      case 'top': {
        const topCustomers = await customers.getTopCustomers(tenant.id, limit)
        return NextResponse.json({
          period,
          customers: topCustomers,
        })
      }

      case 'ltv': {
        const customerId = searchParams.get('customerId')
        if (!customerId) {
          return NextResponse.json({ error: 'customerId required' }, { status: 400 })
        }

        const ltv = await customers.getCustomerLifetimeValue(tenant.id, customerId)
        if (!ltv) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json({ ltv })
      }

      case 'sources': {
        const sources = await customers.getAcquisitionSources(tenant.id)
        return NextResponse.json({ sources })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer analytics' },
      { status: 500 }
    )
  }
}
