import { marketplace, pieces } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

/**
 * POST /api/marketplace/etsy/listings/[listingId]/sync
 *
 * Sync an Etsy listing - Coming Soon
 * For now, just updates local lastSyncedAt timestamp
 */
export async function POST(_request: NextRequest, context: RouteParams) {
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

    // Get piece for current price/stock
    const piece = await pieces.getPiece(tenant.id, listing.pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Mark as synced with current values (no actual Etsy API call yet)
    await marketplace.markListingSynced(
      tenant.id,
      listingId,
      piece.price,
      piece.stock ?? 1,
    )

    return NextResponse.json({
      success: true,
      message: 'Etsy sync coming soon - local data updated',
      syncedPrice: piece.price,
      syncedQuantity: piece.stock ?? 1,
    })
  } catch (error) {
    console.error('Error syncing Etsy listing:', error)
    return NextResponse.json(
      { error: 'Failed to sync listing' },
      { status: 500 },
    )
  }
}
