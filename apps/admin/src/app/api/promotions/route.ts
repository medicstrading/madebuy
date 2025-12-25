import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { promotions } from '@madebuy/db'
import { CreatePromotionInput } from '@madebuy/shared'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allPromotions = await promotions.listPromotions(tenant.id)

    return NextResponse.json({ promotions: allPromotions })
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CreatePromotionInput = await request.json()

    const promotion = await promotions.createPromotion(tenant.id, data)

    return NextResponse.json({ promotion }, { status: 201 })
  } catch (error) {
    console.error('Error creating promotion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
