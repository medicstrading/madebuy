import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { pieces, collections } from '@madebuy/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id
    const body = await request.json()

    const { collectionId, action } = body

    if (!collectionId || !action) {
      return NextResponse.json(
        { error: 'collectionId and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json(
        { error: 'action must be "add" or "remove"' },
        { status: 400 }
      )
    }

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json(
        { error: 'Piece not found' },
        { status: 404 }
      )
    }

    // Verify collection exists
    const collection = await collections.getCollectionById(tenant.id, collectionId)
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Add or remove piece from collection
    if (action === 'add') {
      await collections.addPieceToCollection(tenant.id, collectionId, pieceId)
    } else {
      await collections.removePieceFromCollection(tenant.id, collectionId, pieceId)
    }

    // Get updated collections for this piece
    const updatedCollections = await collections.getCollectionsForPiece(tenant.id, pieceId)

    return NextResponse.json({
      success: true,
      collections: updatedCollections.map(c => ({ id: c.id, name: c.name })),
    })
  } catch (error) {
    console.error('Update piece collections error:', error)
    return NextResponse.json(
      { error: 'Failed to update collections' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await requireTenant()
    const pieceId = params.id

    // Verify piece exists
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json(
        { error: 'Piece not found' },
        { status: 404 }
      )
    }

    // Get collections for this piece
    const pieceCollections = await collections.getCollectionsForPiece(tenant.id, pieceId)

    return NextResponse.json({
      collections: pieceCollections.map(c => ({ id: c.id, name: c.name })),
    })
  } catch (error) {
    console.error('Get piece collections error:', error)
    return NextResponse.json(
      { error: 'Failed to get collections' },
      { status: 500 }
    )
  }
}
