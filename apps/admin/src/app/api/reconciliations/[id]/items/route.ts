import { reconciliations } from '@madebuy/db'
import type { AddReconciliationItemInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

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
    const data: AddReconciliationItemInput = await request.json()

    // Validate required fields
    if (!data.itemType || !data.itemId) {
      return NextResponse.json(
        { error: 'itemType and itemId are required' },
        { status: 400 },
      )
    }

    if (!['material', 'piece'].includes(data.itemType)) {
      return NextResponse.json(
        { error: 'itemType must be "material" or "piece"' },
        { status: 400 },
      )
    }

    const item = await reconciliations.addItem(
      tenant.id,
      reconciliationId,
      data,
    )

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error adding reconciliation item:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (
        error.message.includes('Cannot add') ||
        error.message.includes('already added')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
