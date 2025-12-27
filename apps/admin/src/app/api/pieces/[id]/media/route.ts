import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces, media } from '@madebuy/db'

// Link media to a piece
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mediaId } = await request.json()

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId is required' }, { status: 400 })
    }

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, params.id)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Get the media item
    const mediaItem = await media.getMedia(tenant.id, mediaId)
    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Update media to link to piece
    await media.updateMedia(tenant.id, mediaId, {
      pieceId: piece.id,
    })

    // Add media to piece's mediaIds
    const currentMediaIds = piece.mediaIds || []
    if (!currentMediaIds.includes(mediaId)) {
      const newMediaIds = [...currentMediaIds, mediaId]

      // If this is the first media, set it as primary
      const updateData: any = {
        mediaIds: newMediaIds,
      }

      if (!piece.primaryMediaId) {
        updateData.primaryMediaId = mediaId
      }

      await pieces.updatePiece(tenant.id, piece.id, updateData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error linking media to piece:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Unlink media from a piece
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId is required' }, { status: 400 })
    }

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, params.id)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Update media to remove piece link
    await media.updateMedia(tenant.id, mediaId, {
      pieceId: undefined,
    })

    // Remove media from piece's mediaIds
    const currentMediaIds = piece.mediaIds || []
    const newMediaIds = currentMediaIds.filter(id => id !== mediaId)

    const updateData: any = {
      mediaIds: newMediaIds,
    }

    // If this was the primary media, clear it
    if (piece.primaryMediaId === mediaId) {
      updateData.primaryMediaId = newMediaIds[0] || undefined
    }

    await pieces.updatePiece(tenant.id, piece.id, updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking media from piece:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
