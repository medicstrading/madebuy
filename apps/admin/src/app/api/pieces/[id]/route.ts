import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { UpdatePieceInput } from '@madebuy/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const piece = await pieces.getPiece(tenant.id, params.id)

    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    return NextResponse.json({ piece })
  } catch (error) {
    console.error('Error fetching piece:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: UpdatePieceInput = await request.json()

    // Check if piece exists
    const existing = await pieces.getPiece(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Update the piece
    await pieces.updatePiece(tenant.id, params.id, data)

    // Fetch updated piece
    const piece = await pieces.getPiece(tenant.id, params.id)

    return NextResponse.json({ piece })
  } catch (error) {
    console.error('Error updating piece:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if piece exists
    const existing = await pieces.getPiece(tenant.id, params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    await pieces.deletePiece(tenant.id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting piece:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
