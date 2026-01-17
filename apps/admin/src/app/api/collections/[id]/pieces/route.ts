import { collections } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pieceId } = await request.json()

    if (!pieceId) {
      return NextResponse.json(
        { error: 'pieceId is required' },
        { status: 400 },
      )
    }

    const collection = await collections.addPieceToCollection(
      tenant.id,
      params.id,
      pieceId,
    )

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Error adding piece to collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pieceId = searchParams.get('pieceId')

    if (!pieceId) {
      return NextResponse.json(
        { error: 'pieceId query parameter is required' },
        { status: 400 },
      )
    }

    const collection = await collections.removePieceFromCollection(
      tenant.id,
      params.id,
      pieceId,
    )

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Error removing piece from collection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
