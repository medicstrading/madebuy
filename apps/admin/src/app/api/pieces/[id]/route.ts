import { pieces } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id
    const updates = await request.json()

    // Check if piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Whitelist allowed fields
    const allowedFields = [
      'name',
      'description',
      'category',
      'status',
      'price',
      'stock',
      'lowStockThreshold',
      'shippingWeight',
      'shippingLength',
      'shippingWidth',
      'shippingHeight',
      'isFeatured',
    ]

    const filteredUpdates: Record<string, any> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      )
    }

    // Update the piece
    await pieces.updatePiece(tenant.id, pieceId, filteredUpdates)

    // Get updated piece
    const updatedPiece = await pieces.getPiece(tenant.id, pieceId)

    return NextResponse.json({ piece: updatedPiece })
  } catch (error) {
    console.error('Update piece error:', error)
    return NextResponse.json(
      { error: 'Failed to update piece' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Check if piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Delete the piece
    await pieces.deletePiece(tenant.id, pieceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete piece error:', error)
    return NextResponse.json(
      { error: 'Failed to delete piece' },
      { status: 500 },
    )
  }
}
