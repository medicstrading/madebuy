import { discounts } from '@madebuy/db'
import type {
  CreateDiscountCodeInput,
  DiscountListOptions,
} from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const options: DiscountListOptions = {}

    if (searchParams.get('isActive') !== null) {
      options.isActive = searchParams.get('isActive') === 'true'
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
      ) as DiscountListOptions['sortBy']
    }

    if (searchParams.get('sortOrder')) {
      options.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await discounts.listDiscountCodes(tenant.id, options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching discounts:', error)
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

    const data: CreateDiscountCodeInput = await request.json()

    // Validate required fields
    if (!data.code || !data.type || data.value === undefined) {
      return NextResponse.json(
        { error: 'Code, type, and value are required' },
        { status: 400 },
      )
    }

    const discount = await discounts.createDiscountCode(tenant.id, data)

    return NextResponse.json({ discount }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating discount:', error)

    // Handle duplicate code error
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'A discount with this code already exists' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
