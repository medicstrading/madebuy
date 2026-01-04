import { NextRequest, NextResponse } from 'next/server'
import { collections, tenants, pieces, media } from '@madebuy/db'

/**
 * GET /api/collections/[slug]
 * Get a single collection by slug with its pieces (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Validate tenant exists
    const tenant = await tenants.getTenantById(tenantId) || await tenants.getTenantBySlug(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get collection by slug
    const collection = await collections.getCollectionBySlug(tenant.id, params.slug)

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Only return published collections
    if (!collection.isPublished) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Fetch pieces for this collection
    const collectionPieces = []
    for (const pieceId of collection.pieceIds) {
      const piece = await pieces.getPiece(tenant.id, pieceId)
      if (piece && piece.status === 'available') {
        // Get primary media for the piece
        let primaryMedia = null
        if (piece.primaryMediaId) {
          primaryMedia = await media.getMedia(tenant.id, piece.primaryMediaId)
        } else if (piece.mediaIds.length > 0) {
          primaryMedia = await media.getMedia(tenant.id, piece.mediaIds[0])
        }

        collectionPieces.push({
          ...piece,
          primaryMedia,
        })
      }
    }

    // Get cover media if set
    let coverMedia = null
    if (collection.coverMediaId) {
      coverMedia = await media.getMedia(tenant.id, collection.coverMediaId)
    }

    return NextResponse.json({
      collection: {
        ...collection,
        coverMedia,
        pieces: collectionPieces,
      },
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
