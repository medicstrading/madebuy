import { marketplace, pieces } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

/**
 * GET /api/marketplace/etsy/listings/[listingId]
 *
 * Get details of a specific Etsy listing
 */
export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listingId } = await context.params

    const listing = await marketplace.getListing(tenant.id, listingId)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.marketplace !== 'etsy') {
      return NextResponse.json(
        { error: 'Not an Etsy listing' },
        { status: 400 },
      )
    }

    const piece = await pieces.getPiece(tenant.id, listing.pieceId)

    return NextResponse.json({
      listing: {
        ...listing,
        piece: piece
          ? {
              id: piece.id,
              name: piece.name,
              price: piece.price,
              stock: piece.stock,
              status: piece.status,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error fetching Etsy listing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/marketplace/etsy/listings/[listingId]
 *
 * Remove an Etsy listing
 */
export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listingId } = await context.params

    const listing = await marketplace.getListing(tenant.id, listingId)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.marketplace !== 'etsy') {
      return NextResponse.json(
        { error: 'Not an Etsy listing' },
        { status: 400 },
      )
    }

    // Mark as ended locally (Etsy API integration coming soon)
    await marketplace.updateListingStatus(tenant.id, listingId, 'ended')

    return NextResponse.json({
      success: true,
      message: 'Listing marked as ended',
    })
  } catch (error) {
    console.error('Error deleting Etsy listing:', error)
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 },
    )
  }
}
