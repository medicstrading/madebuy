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

    // Fetch pieces in parallel using Promise.all (instead of sequential loop)
    const piecePromises = collection.pieceIds.map(pieceId =>
      pieces.getPiece(tenant.id, pieceId)
    )
    const pieceResults = await Promise.all(piecePromises)

    // Filter available pieces and collect media IDs
    const availablePieces = pieceResults.filter(
      (piece): piece is NonNullable<typeof piece> =>
        piece !== null && piece.status === 'available'
    )

    // Batch fetch all media in parallel
    const mediaIds = availablePieces.map(piece =>
      piece.primaryMediaId || piece.mediaIds[0]
    ).filter(Boolean) as string[]

    // Add cover media to the batch
    if (collection.coverMediaId) {
      mediaIds.push(collection.coverMediaId)
    }

    // Fetch all media in one batch call
    const allMedia = mediaIds.length > 0
      ? await media.getMediaByIds(tenant.id, mediaIds)
      : []
    const mediaMap = new Map(allMedia.map(m => [m.id, m]))

    // Build collection pieces with their media
    const collectionPieces = availablePieces.map(piece => ({
      ...piece,
      primaryMedia: mediaMap.get(piece.primaryMediaId || piece.mediaIds[0]) || null,
    }))

    const coverMedia = collection.coverMediaId
      ? mediaMap.get(collection.coverMediaId) || null
      : null

    const response = NextResponse.json({
      collection: {
        ...collection,
        coverMedia,
        pieces: collectionPieces,
      },
    })

    // Add cache headers for public collection data
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')

    return response
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
