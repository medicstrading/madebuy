import { media, pieces } from '@madebuy/db'
import { deleteFromR2 } from '@madebuy/storage'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * POST /api/media/bulk-delete
 * Delete multiple media items at once
 *
 * Request body:
 * {
 *   mediaIds: string[]  // Array of media IDs to delete
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mediaIds } = body

    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { error: 'mediaIds array is required' },
        { status: 400 },
      )
    }

    // Verify all media items belong to this tenant
    const mediaItems = await media.getMediaByIds(tenant.id, mediaIds)
    const validIds = mediaItems.map((m) => m.id)
    const invalidIds = mediaIds.filter((id: string) => !validIds.includes(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Media items not found: ${invalidIds.join(', ')}` },
        { status: 404 },
      )
    }

    // Group media by piece for updating piece records
    const mediaByPiece = new Map<string, string[]>()
    for (const item of mediaItems) {
      if (item.pieceId) {
        const existing = mediaByPiece.get(item.pieceId) || []
        existing.push(item.id)
        mediaByPiece.set(item.pieceId, existing)
      }
    }

    // Delete files from R2 storage
    const deletePromises: Promise<void>[] = []

    for (const item of mediaItems) {
      // Delete all variants
      for (const variantKey of Object.keys(item.variants)) {
        const variant = item.variants[variantKey as keyof typeof item.variants]
        if (variant?.key) {
          deletePromises.push(
            deleteFromR2(variant.key).catch((err) => {
              console.error(`Failed to delete ${variant.key} from R2:`, err)
            }),
          )
        }
      }

      // Delete video thumbnails if present
      if (item.video?.thumbnailKey) {
        deletePromises.push(
          deleteFromR2(item.video.thumbnailKey).catch(() => {}),
        )
      }
    }

    // Wait for all storage deletions (don't fail if some fail)
    await Promise.allSettled(deletePromises)

    // Delete media records from database
    const deletedCount = await media.deleteMediaBulk(tenant.id, validIds)

    // Update piece records to remove deleted media
    for (const [pieceId, deletedMediaIds] of mediaByPiece) {
      const piece = await pieces.getPiece(tenant.id, pieceId)
      if (piece) {
        const remainingMediaIds = (piece.mediaIds || []).filter(
          (id: string) => !deletedMediaIds.includes(id),
        )

        const updateData: any = {
          mediaIds: remainingMediaIds,
        }

        // Update primary media if it was deleted
        if (
          piece.primaryMediaId &&
          deletedMediaIds.includes(piece.primaryMediaId)
        ) {
          updateData.primaryMediaId = remainingMediaIds[0] || null
        }

        await pieces.updatePiece(tenant.id, pieceId, updateData)
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} media item(s)`,
    })
  } catch (error) {
    console.error('Error bulk deleting media:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
