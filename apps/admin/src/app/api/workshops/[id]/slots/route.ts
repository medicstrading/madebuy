import { workshops } from '@madebuy/db'
import type { CreateSlotInput } from '@madebuy/shared'
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
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    const slots = await workshops.getAvailableSlots(
      tenant.id,
      id,
      startDate,
      endDate,
    )

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: workshopId } = await context.params
    const data: CreateSlotInput = await request.json()

    // Validate required fields
    if (!data.startTime) {
      return NextResponse.json(
        { error: 'Start time is required' },
        { status: 400 },
      )
    }

    if (!data.endTime) {
      return NextResponse.json(
        { error: 'End time is required' },
        { status: 400 },
      )
    }

    // Convert to Date objects
    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Validate dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 },
      )
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 },
      )
    }

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: 'Start time cannot be in the past' },
        { status: 400 },
      )
    }

    const slot = await workshops.createSlot(tenant.id, workshopId, {
      ...data,
      startTime,
      endTime,
    })

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating slot:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
