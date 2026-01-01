import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces, media } from '@madebuy/db'
import type { ReorderMediaInput } from '@madebuy/shared'

/**
 * PUT /api/pieces/[id]/media/reorder
 * Reorder media items for a piece
 *
 * Request body:
 * {
 *   mediaIds: string[]  // Array of media IDs in desired order
 * }
 *
 * This will:
 * 1. Validate all mediaIds belong to the piece
 * 2. Update displayOrder for each media item atomically
 * 3. Set first item as primary if no primary is set
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pieceId } = await params
    const body: ReorderMediaInput = await request.json()
    const { mediaIds } = body

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: 'mediaIds array is required' },
        { status: 400 }
      )
    }

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Get all media items for this piece
    const pieceMedia = await media.listMedia(tenant.id, { pieceId })
    const pieceMediaIds = new Set(pieceMedia.map((m) => m.id))

    // Validate all provided IDs belong to this piece
    const invalidIds = mediaIds.filter((id) => !pieceMediaIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Media IDs not found for this piece: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(mediaIds)
    if (uniqueIds.size !== mediaIds.length) {
      return NextResponse.json(
        { error: 'Duplicate media IDs provided' },
        { status: 400 }
      )
    }

    // Update display order for all media items
    const updateResult = await media.updateDisplayOrder(tenant.id, pieceId, mediaIds)

    // Set the first item as primary
    if (mediaIds.length > 0) {
      await media.setPrimaryMedia(tenant.id, pieceId, mediaIds[0])

      // Also update the piece's primaryMediaId
      await pieces.updatePiece(tenant.id, pieceId, {
        primaryMediaId: mediaIds[0],
        mediaIds, // Update order in piece record too
      })
    }

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.updatedCount,
      primaryMediaId: mediaIds[0],
    })
  } catch (error) {
    console.error('Error reordering media:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pieces/[id]/media/reorder
 * Alternative endpoint for reordering (for clients that don't support PUT)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
}
