import { discounts } from '@madebuy/db'
import type { UpdateDiscountCodeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const discount = await discounts.getDiscountCodeById(tenant.id, id)

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    return NextResponse.json({ discount })
  } catch (error) {
    console.error('Error fetching discount:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data: UpdateDiscountCodeInput = await request.json()

    const discount = await discounts.updateDiscountCode(
      tenant.id,
      id,
      data,
    )

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    return NextResponse.json({ discount })
  } catch (error: any) {
    console.error('Error updating discount:', error)

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const deleted = await discounts.deleteDiscountCode(tenant.id, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
