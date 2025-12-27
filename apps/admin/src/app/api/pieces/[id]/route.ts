import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Check if piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json(
        { error: 'Piece not found' },
        { status: 404 }
      )
    }

    // Delete the piece
    await pieces.deletePiece(tenant.id, pieceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete piece error:', error)
    return NextResponse.json(
      { error: 'Failed to delete piece' },
      { status: 500 }
    )
  }
}
