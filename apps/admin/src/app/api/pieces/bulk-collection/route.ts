import { collections } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    const { pieceIds, collectionId, newCollectionName } = body

    // Validate input
    if (!Array.isArray(pieceIds) || pieceIds.length === 0) {
      return NextResponse.json(
        { error: 'pieceIds must be a non-empty array' },
        { status: 400 },
      )
    }

    if (!collectionId && !newCollectionName) {
      return NextResponse.json(
        { error: 'Either collectionId or newCollectionName is required' },
        { status: 400 },
      )
    }

    // Limit batch size
    if (pieceIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 pieces can be added at once' },
        { status: 400 },
      )
    }

    let targetCollectionId = collectionId

    // Create new collection if needed
    if (newCollectionName && !collectionId) {
      const newCollection = await collections.createCollection(tenant.id, {
        name: newCollectionName.trim(),
        isPublished: false,
      })
      targetCollectionId = newCollection.id
    }

    // Verify collection exists
    const collection = await collections.getCollectionById(
      tenant.id,
      targetCollectionId,
    )
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 },
      )
    }

    // Add all pieces to collection, tracking failures
    let addedCount = 0
    const failedPieces: Array<{ pieceId: string; error: string }> = []

    for (const pieceId of pieceIds) {
      try {
        await collections.addPieceToCollection(
          tenant.id,
          targetCollectionId,
          pieceId,
        )
        addedCount++
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error(`Failed to add piece ${pieceId} to collection:`, err)
        failedPieces.push({ pieceId, error: errorMessage })
      }
    }

    return NextResponse.json({
      success: true,
      collectionId: targetCollectionId,
      collectionName: collection.name,
      added: addedCount,
      failed: failedPieces.length,
      total: pieceIds.length,
      errors: failedPieces.length > 0 ? failedPieces : undefined,
    })
  } catch (error) {
    console.error('Bulk collection error:', error)
    return NextResponse.json(
      { error: 'Failed to add pieces to collection' },
      { status: 500 },
    )
  }
}
