import { reconciliations } from '@madebuy/db'
import type { UpdateReconciliationItemInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: reconciliationId, itemId } = await params
    const data: UpdateReconciliationItemInput = await request.json()

    // Validate required fields
    if (data.actualQuantity === undefined || data.actualQuantity < 0) {
      return NextResponse.json(
        { error: 'actualQuantity must be a non-negative number' },
        { status: 400 },
      )
    }

    await reconciliations.updateItem(tenant.id, reconciliationId, itemId, data)

    // Return updated reconciliation
    const reconciliation = await reconciliations.getReconciliation(
      tenant.id,
      reconciliationId,
    )

    return NextResponse.json({ reconciliation })
  } catch (error) {
    console.error('Error updating reconciliation item:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('Cannot update')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
