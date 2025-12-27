import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { media } from '@madebuy/db'
import { deleteFromR2 } from '@madebuy/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await requireTenant()
    const mediaId = params.id

    // Get media item to access R2 keys
    const mediaItem = await media.getMedia(tenant.id, mediaId)
    if (!mediaItem) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Delete all variants from R2
    const deletePromises = []
    for (const variant of Object.values(mediaItem.variants)) {
      if (variant && variant.key) {
        deletePromises.push(
          deleteFromR2(variant.key).catch(err => {
            console.error(`Failed to delete R2 key ${variant.key}:`, err)
          })
        )
      }
    }

    await Promise.all(deletePromises)

    // Delete from database
    await media.deleteMedia(tenant.id, mediaId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete media error:', error)
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    )
  }
}
