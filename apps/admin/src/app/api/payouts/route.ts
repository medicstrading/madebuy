import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { payouts } from '@madebuy/db'
import type { PayoutStatus } from '@madebuy/shared'

/**
 * GET /api/payouts
 * List payouts with filtering and pagination
 *
 * Query params:
 * - status: PayoutStatus (pending, in_transit, paid, failed, cancelled)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as PayoutStatus | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await payouts.listPayouts(tenant.id, {
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    )
  }
}
