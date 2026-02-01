import { workshops } from '@madebuy/db'
import type { BookingFilters } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workshopId } = await context.params
    const { searchParams } = new URL(request.url)

    const filters: BookingFilters = {
      workshopId,
    }

    if (searchParams.get('slotId')) {
      filters.slotId = searchParams.get('slotId')!
    }

    const status = searchParams.get('status')
    if (status) {
      if (status.includes(',')) {
        filters.status = status.split(',') as BookingFilters['status']
      } else {
        filters.status = status as BookingFilters['status']
      }
    }

    if (searchParams.get('paymentStatus')) {
      filters.paymentStatus = searchParams.get(
        'paymentStatus',
      ) as BookingFilters['paymentStatus']
    }

    if (searchParams.get('customerEmail')) {
      filters.customerEmail = searchParams.get('customerEmail')!
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!)
    }

    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!)
    }

    const pagination = {
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : 0,
      sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    }

    const result = await workshops.listBookings(tenant.id, filters, pagination)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
