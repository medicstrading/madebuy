import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'

/**
 * PUT /api/pieces/bulk-thresholds
 * Bulk update low stock thresholds for multiple pieces
 */
export async function PUT(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { updates } = body as {
      updates: Array<{ pieceId: string; threshold: number | null }>
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    // Validate all updates
    for (const update of updates) {
      if (!update.pieceId) {
        return NextResponse.json(
          { error: 'Each update must have a pieceId' },
          { status: 400 }
        )
      }
      if (update.threshold !== null && (typeof update.threshold !== 'number' || update.threshold < 0)) {
        return NextResponse.json(
          { error: 'Threshold must be a non-negative number or null' },
          { status: 400 }
        )
      }
    }

    const modifiedCount = await pieces.bulkUpdateLowStockThresholds(tenant.id, updates)

    return NextResponse.json({ modifiedCount })
  } catch (error) {
    console.error('Failed to bulk update thresholds:', error)
    return NextResponse.json(
      { error: 'Failed to update thresholds' },
      { status: 500 }
    )
  }
}
