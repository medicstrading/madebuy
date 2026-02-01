import { workshops } from '@madebuy/db'
import type { CreateWorkshopInput, WorkshopListOptions } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: WorkshopListOptions = {}

    const status = searchParams.get('status')
    if (status) {
      if (status.includes(',')) {
        options.status = status.split(',') as WorkshopListOptions['status']
      } else {
        options.status = status as WorkshopListOptions['status']
      }
    }

    if (searchParams.get('category')) {
      options.category = searchParams.get('category')!
    }

    if (searchParams.get('locationType')) {
      options.locationType = searchParams.get(
        'locationType',
      ) as WorkshopListOptions['locationType']
    }

    if (searchParams.get('skillLevel')) {
      options.skillLevel = searchParams.get(
        'skillLevel',
      ) as WorkshopListOptions['skillLevel']
    }

    if (searchParams.get('search')) {
      options.search = searchParams.get('search')!
    }

    if (searchParams.get('limit')) {
      options.limit = parseInt(searchParams.get('limit')!, 10)
    }

    if (searchParams.get('offset')) {
      options.offset = parseInt(searchParams.get('offset')!, 10)
    }

    if (searchParams.get('sortBy')) {
      options.sortBy = searchParams.get(
        'sortBy',
      ) as WorkshopListOptions['sortBy']
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await workshops.listWorkshops(tenant.id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching workshops:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateWorkshopInput = await request.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!data.description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 },
      )
    }

    if (data.price === undefined || data.price < 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 },
      )
    }

    if (!data.durationMinutes || data.durationMinutes < 1) {
      return NextResponse.json(
        { error: 'Duration must be at least 1 minute' },
        { status: 400 },
      )
    }

    if (!data.capacity || data.capacity < 1) {
      return NextResponse.json(
        { error: 'Capacity must be at least 1' },
        { status: 400 },
      )
    }

    if (!data.locationType) {
      return NextResponse.json(
        { error: 'Location type is required' },
        { status: 400 },
      )
    }

    const workshop = await workshops.createWorkshop(tenant.id, data)

    return NextResponse.json({ workshop }, { status: 201 })
  } catch (error) {
    console.error('Error creating workshop:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
