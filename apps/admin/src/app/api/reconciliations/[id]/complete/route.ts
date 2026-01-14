import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { reconciliations } from '@madebuy/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: reconciliationId } = await params

    await reconciliations.completeReconciliation(tenant.id, reconciliationId)

    // Return updated reconciliation
    const reconciliation = await reconciliations.getReconciliation(tenant.id, reconciliationId)

    return NextResponse.json({ reconciliation, message: 'Stock levels have been updated' })
  } catch (error) {
    console.error('Error completing reconciliation:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('not in progress')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
