import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { disputes } from '@madebuy/db'

/**
 * GET /api/disputes
 * List disputes for the current tenant with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const status = searchParams.get('status') || undefined

    // Build filters
    const filters = status ? { status: status as any } : undefined

    // Fetch disputes and stats in parallel
    const [allDisputes, stats, totalCount] = await Promise.all([
      disputes.listDisputes(tenant.id, {
        filters,
        limit,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      disputes.getDisputeStats(tenant.id),
      disputes.countDisputes(tenant.id, filters),
    ])

    return NextResponse.json({
      disputes: allDisputes,
      stats,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + allDisputes.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
