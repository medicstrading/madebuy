import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { keyDates } from '@madebuy/db'
import type { CreateKeyDateInput, KeyDateListOptions } from '@madebuy/shared'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: KeyDateListOptions = {}

    if (searchParams.get('startDate')) {
      options.startDate = new Date(searchParams.get('startDate')!)
    }

    if (searchParams.get('endDate')) {
      options.endDate = new Date(searchParams.get('endDate')!)
    }

    if (searchParams.get('repeat')) {
      options.repeat = searchParams.get('repeat') as KeyDateListOptions['repeat']
    }

    if (searchParams.get('limit')) {
      options.limit = parseInt(searchParams.get('limit')!, 10)
    }

    if (searchParams.get('offset')) {
      options.offset = parseInt(searchParams.get('offset')!, 10)
    }

    if (searchParams.get('sortBy')) {
      options.sortBy = searchParams.get('sortBy') as 'date' | 'createdAt'
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await keyDates.listKeyDates(tenant.id, options)

    return NextResponse.json({ keyDates: result })
  } catch (error) {
    console.error('Error fetching key dates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreateKeyDateInput = await request.json()

    if (!data.title || !data.date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    const keyDate = await keyDates.createKeyDate(tenant.id, data)

    return NextResponse.json({ keyDate }, { status: 201 })
  } catch (error) {
    console.error('Error creating key date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
