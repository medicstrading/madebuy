import { marketplace, media, pieces } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import {
  type EbayInventoryItem,
  type EbayPackageWeightAndSize,
  getEbayApiUrl,
} from '@/lib/marketplace/ebay'
import { getCurrentTenant } from '@/lib/session'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

/**
 * POST /api/marketplace/ebay/listings/[listingId]/sync
 *
 * Force sync a listing with current piece data
 */
export async function POST(_request: NextRequest, context: RouteParams) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listingId } = await context.params

    // Get listing from database
    const listing = await marketplace.getListing(tenant.id, listingId)
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.marketplace !== 'ebay') {
      return NextResponse.json(
        { error: 'Not an eBay listing' },
        { status: 400 },
      )
    }

    // Check eBay connection
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, listing.pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    const listingPrice = piece.price
    const listingQuantity = piece.stock ?? 1
    const sku = listing.marketplaceData?.ebayInventoryItemSku
    const offerId = listing.marketplaceData?.ebayOfferId

    if (!sku || !offerId) {
      return NextResponse.json(
        { error: 'Missing eBay inventory data, please recreate listing' },
        { status: 400 },
      )
    }

    if (!listingPrice) {
      return NextResponse.json(
        { error: 'Piece must have a price to sync to eBay' },
        { status: 400 },
      )
    }

    // Get piece media for images
    const pieceMedia = piece.mediaIds?.length
      ? await media.getMediaByIds(tenant.id, piece.mediaIds)
      : []

    const imageUrls = pieceMedia
      .filter((m) => m.type === 'image')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, 12)
      .map((m) => m.variants.large?.url || m.variants.original.url)
      .filter(Boolean)

    // Build inventory payload
    const inventoryPayload: EbayInventoryItem = {
      availability: {
        shipToLocationAvailability: {
          quantity: listingQuantity,
        },
      },
      condition: 'NEW',
      product: {
        title: piece.name.slice(0, 80),
        description: piece.description || `${piece.name} - Handmade item`,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
    }

    // Add weight if available
    const weightGrams = piece.shippingWeight ?? piece.weight
    if (weightGrams && typeof weightGrams === 'number') {
      const weightInOz = weightGrams * 0.035274
      const packageWeightAndSize: EbayPackageWeightAndSize = {
        weight: {
          value: weightInOz,
          unit: 'OUNCE',
        },
      }

      if (piece.shippingLength && piece.shippingWidth && piece.shippingHeight) {
        packageWeightAndSize.dimensions = {
          length: piece.shippingLength,
          width: piece.shippingWidth,
          height: piece.shippingHeight,
          unit: 'CENTIMETER',
        }
      }

      inventoryPayload.packageWeightAndSize = packageWeightAndSize
    }

    // Update inventory
    const inventoryResponse = await fetch(
      getEbayApiUrl(
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      ),
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en_AU',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
        },
        body: JSON.stringify(inventoryPayload),
      },
    )

    if (!inventoryResponse.ok) {
      const errorData = await inventoryResponse.json().catch(() => ({}))
      console.error('eBay Inventory API error:', errorData)

      await marketplace.updateListingStatus(
        tenant.id,
        listingId,
        'error',
        `Sync failed: ${JSON.stringify(errorData)}`,
      )

      return NextResponse.json(
        { error: 'Failed to sync inventory' },
        { status: inventoryResponse.status },
      )
    }

    // Update offer (price)
    const offerResponse = await fetch(
      getEbayApiUrl(`/sell/inventory/v1/offer/${offerId}`),
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en_AU',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
        },
        body: JSON.stringify({
          pricingSummary: {
            price: {
              value: listingPrice.toFixed(2),
              currency: (piece.currency || 'AUD').toUpperCase(),
            },
          },
        }),
      },
    )

    if (!offerResponse.ok) {
      const errorData = await offerResponse.json().catch(() => ({}))
      console.error('eBay Offer API error:', errorData)

      await marketplace.updateListingStatus(
        tenant.id,
        listingId,
        'error',
        `Price sync failed: ${JSON.stringify(errorData)}`,
      )

      return NextResponse.json(
        { error: 'Inventory synced but price update failed' },
        { status: 207 },
      )
    }

    // Mark as synced
    await marketplace.markListingSynced(
      tenant.id,
      listingId,
      listingPrice,
      listingQuantity,
    )
    await marketplace.updateListingStatus(tenant.id, listingId, 'active')

    return NextResponse.json({
      success: true,
      syncedPrice: listingPrice,
      syncedQuantity: listingQuantity,
    })
  } catch (error) {
    console.error('Error syncing eBay listing:', error)
    return NextResponse.json(
      { error: 'Failed to sync listing' },
      { status: 500 },
    )
  }
}
