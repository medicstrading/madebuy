import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import type { PieceStatus } from '@madebuy/shared'

const VALID_STATUSES: PieceStatus[] = ['draft', 'available', 'reserved', 'sold']

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    const { pieceIds, status } = body

    console.log('Bulk status update request:', { pieceIds, status, tenantId: tenant.id })

    // Validate input
    if (!Array.isArray(pieceIds) || pieceIds.length === 0) {
      return NextResponse.json(
        { error: 'pieceIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Limit batch size to prevent abuse
    if (pieceIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 pieces can be updated at once' },
        { status: 400 }
      )
    }

    // Batch fetch all pieces in one query to verify ownership (prevents N+1)
    console.log(`Starting bulk update of ${pieceIds.length} pieces to status: ${status}`)

    const pieceMap = await pieces.getPiecesByIds(tenant.id, pieceIds)

    // Build results array - identify pieces that don't exist or don't belong to tenant
    const results: Array<{ pieceId: string; success: boolean; error?: string }> = []
    const validPieceIds: string[] = []

    for (const pieceId of pieceIds) {
      const piece = pieceMap.get(pieceId)
      if (!piece) {
        console.log(`  Piece ${pieceId}: NOT FOUND`)
        results.push({ pieceId, success: false, error: 'Piece not found' })
      } else {
        console.log(`  Piece ${pieceId} (${piece.name}): ${piece.status} -> ${status}`)
        validPieceIds.push(pieceId)
      }
    }

    // Update all valid pieces in parallel
    const updatePromises = validPieceIds.map(async (pieceId: string) => {
      try {
        await pieces.updatePiece(tenant.id, pieceId, { status })
        return { pieceId, success: true }
      } catch (err: any) {
        console.log(`  Piece ${pieceId}: ERROR - ${err.message}`)
        return { pieceId, success: false, error: err.message }
      }
    })

    const updateResults = await Promise.all(updatePromises)
    results.push(...updateResults)
    console.log('Bulk update results:', results)

    const successCount = results.filter(r => r.success).length
    const failedResults = results.filter(r => !r.success)

    // Force revalidate the marketplace page to show updated data
    revalidatePath('/dashboard/marketplace/website')
    revalidatePath('/dashboard/inventory')

    return NextResponse.json({
      success: true,
      updated: successCount,
      failed: failedResults.length,
      errors: failedResults.length > 0 ? failedResults : undefined,
    })
  } catch (error) {
    console.error('Bulk status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update pieces' },
      { status: 500 }
    )
  }
}
