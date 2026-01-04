import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { customers } from '@madebuy/db'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [stats, topCustomers, acquisitionSources] = await Promise.all([
      customers.getCustomerStats(tenant.id),
      customers.getTopCustomers(tenant.id, 5),
      customers.getAcquisitionSources(tenant.id),
    ])

    return NextResponse.json({
      stats,
      topCustomers,
      acquisitionSources,
    })
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
