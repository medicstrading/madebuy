import { workshops } from '@madebuy/db'
import type { UpdateSlotInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

type RouteContext = {
  params: Promise<{ id: string; slotId: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workshopId, slotId } = await context.params
    const data: UpdateSlotInput = await request.json()

    // Convert date strings to Date objects if provided
    if (data.startTime) {
      data.startTime = new Date(data.startTime)
      if (isNaN(data.startTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start time' },
          { status: 400 },
        )
      }
    }

    if (data.endTime) {
      data.endTime = new Date(data.endTime)
      if (isNaN(data.endTime.getTime())) {
        return NextResponse.json({ error: 'Invalid end time' }, { status: 400 })
      }
    }

    // Validate dates if both provided
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 },
      )
    }

    const slot = await workshops.updateSlot(tenant.id, workshopId, slotId, data)

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    return NextResponse.json({ slot })
  } catch (error) {
    console.error('Error updating slot:', error)
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

    const { id: workshopId, slotId } = await context.params
    const deleted = await workshops.deleteSlot(tenant.id, workshopId, slotId)

    if (!deleted) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting slot:', error)

    if (error.message?.includes('active bookings')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
