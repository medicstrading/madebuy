import { workshops } from '@madebuy/db'
import type { UpdateWorkshopInput } from '@madebuy/shared'
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

    const { id } = await context.params
    const workshop = await workshops.getWorkshopById(tenant.id, id)

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    return NextResponse.json({ workshop })
  } catch (error) {
    console.error('Error fetching workshop:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const data: UpdateWorkshopInput = await request.json()

    // Validate if price is provided
    if (data.price !== undefined && data.price < 0) {
      return NextResponse.json(
        { error: 'Price must be non-negative' },
        { status: 400 },
      )
    }

    // Validate if duration is provided
    if (data.durationMinutes !== undefined && data.durationMinutes < 1) {
      return NextResponse.json(
        { error: 'Duration must be at least 1 minute' },
        { status: 400 },
      )
    }

    // Validate if capacity is provided
    if (data.capacity !== undefined && data.capacity < 1) {
      return NextResponse.json(
        { error: 'Capacity must be at least 1' },
        { status: 400 },
      )
    }

    const workshop = await workshops.updateWorkshop(tenant.id, id, data)

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    return NextResponse.json({ workshop })
  } catch (error) {
    console.error('Error updating workshop:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const deleted = await workshops.deleteWorkshop(tenant.id, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting workshop:', error)

    // Handle specific error for active bookings
    if (error.message?.includes('active bookings')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
