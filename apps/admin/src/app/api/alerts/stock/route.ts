import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threshold = searchParams.get('threshold')

    const alerts = await pieces.getStockAlerts(
      tenant.id,
      threshold ? parseInt(threshold, 10) : 5
    )

    return NextResponse.json({
      alerts,
      summary: {
        outOfStock: alerts.filter(a => a.alertType === 'out_of_stock').length,
        lowStock: alerts.filter(a => a.alertType === 'low_stock').length,
        total: alerts.length,
      },
    })
  } catch (error) {
    console.error('Error fetching stock alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
