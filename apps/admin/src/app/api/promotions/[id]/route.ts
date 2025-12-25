import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { promotions } from '@madebuy/db'
import { UpdatePromotionInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promotion = await promotions.getPromotion(tenant.id, params.id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ promotion })
  } catch (error) {
    console.error('Error fetching promotion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdatePromotionInput = await request.json()

    // Check if promotion exists
    const existing = await promotions.getPromotion(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Update the promotion
    await promotions.updatePromotion(tenant.id, params.id, data)

    // Fetch updated promotion
    const promotion = await promotions.getPromotion(tenant.id, params.id)

    return NextResponse.json({ promotion })
  } catch (error) {
    console.error('Error updating promotion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if promotion exists
    const existing = await promotions.getPromotion(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    await promotions.deletePromotion(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
