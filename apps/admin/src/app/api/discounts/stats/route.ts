import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { discounts } from '@madebuy/db'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await discounts.getDiscountStats(tenant.id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching discount stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
