import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace, pieces, media } from '@madebuy/db'
import {
  createEbayClient,
  getEbayApiUrl,
  type EbayInventoryItem,
  type EbayPackageWeightAndSize,
} from '@/lib/marketplace/ebay'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

/**
 * GET /api/marketplace/ebay/listings/[listingId]
 *
 * Get details of a specific eBay listing
 */
export async function GET(request: NextRequest, context: RouteParams) {
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
      return NextResponse.json({ error: 'Not an eBay listing' }, { status: 400 })
    }

    // Get associated piece
    const piece = await pieces.getPiece(tenant.id, listing.pieceId)

    // Get eBay connection for fetching live data
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')

    let ebayData = null
    if (connection?.status === 'connected' && listing.marketplaceData?.ebayOfferId) {
      // Fetch current offer data from eBay
      try {
        const offerResponse = await fetch(
          getEbayApiUrl(`/sell/inventory/v1/offer/${listing.marketplaceData.ebayOfferId}`),
          {
            headers: {
              Authorization: `Bearer ${connection.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (offerResponse.ok) {
          ebayData = await offerResponse.json()
        }
      } catch (err) {
        console.error('Error fetching eBay offer data:', err)
      }
    }

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
              description: piece.description,
            }
          : null,
      },
      ebayData,
    })
  } catch (error) {
    console.error('Error fetching eBay listing:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

/**
 * PATCH /api/marketplace/ebay/listings/[listingId]
 *
 * Update/sync an eBay listing with changes from MadeBuy piece
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
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
      return NextResponse.json({ error: 'Not an eBay listing' }, { status: 400 })
    }

    // Check eBay connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, listing.pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Parse optional overrides from request body
    const body = await request.json().catch(() => ({}))
    const { price, quantity, categoryId } = body

    const listingPrice = price ?? piece.price
    const listingQuantity = quantity ?? piece.stock ?? 1
    const sku = listing.marketplaceData?.ebayInventoryItemSku
    const offerId = listing.marketplaceData?.ebayOfferId

    if (!sku || !offerId) {
      return NextResponse.json(
        { error: 'Missing eBay inventory data, please recreate listing' },
        { status: 400 }
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

    // Step 1: Update Inventory Item
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

    // Create eBay API client
    const ebay = createEbayClient(
      connection.accessToken!,
      connection.refreshToken || undefined
    )

    // Step 1: Update Inventory Item using ebay-api package
    try {
      await ebay.sell.inventory.createOrReplaceInventoryItem(sku, inventoryPayload)
      console.log('[eBay] Inventory item updated successfully')
    } catch (inventoryError: any) {
      console.error('eBay Inventory API error:', inventoryError?.message || inventoryError)

      await marketplace.updateListingStatus(
        tenant.id,
        listingId,
        'error',
        `Inventory update failed: ${inventoryError?.message || 'Unknown error'}`
      )

      return NextResponse.json(
        { error: 'Failed to update eBay inventory. Please try again.' },
        { status: 400 }
      )
    }

    // Step 2: Update Offer (for price changes)
    const offerPayload: Record<string, unknown> = {
      pricingSummary: {
        price: {
          value: listingPrice.toFixed(2),
          currency: (piece.currency || 'AUD').toUpperCase(),
        },
      },
    }

    // Update category if provided
    if (categoryId) {
      offerPayload.categoryId = categoryId
    }

    // Update offer using ebay-api package
    try {
      await ebay.sell.inventory.updateOffer(offerId, offerPayload)
      console.log('[eBay] Offer updated successfully')
    } catch (offerError: any) {
      console.error('eBay Offer API error:', offerError?.message || offerError)

      // Inventory was updated, but offer failed - still mark as synced with warning
      await marketplace.updateListingStatus(
        tenant.id,
        listingId,
        'error',
        `Offer update failed: ${offerError?.message || 'Unknown error'}`
      )

      return NextResponse.json(
        {
          success: false,
          warning: 'Inventory updated but offer update failed. Please try again.',
        },
        { status: 207 }
      )
    }

    // Update marketplace data if category changed
    if (categoryId && categoryId !== listing.marketplaceData?.categoryId) {
      await marketplace.updateListing(tenant.id, listingId, {
        marketplaceData: {
          ...listing.marketplaceData,
          categoryId,
        },
      })
    }

    // Mark as synced
    await marketplace.markListingSynced(tenant.id, listingId, listingPrice, listingQuantity)
    await marketplace.updateListingStatus(tenant.id, listingId, 'active')

    // Get updated listing
    const updatedListing = await marketplace.getListing(tenant.id, listingId)

    return NextResponse.json({
      success: true,
      listing: updatedListing,
      syncedPrice: listingPrice,
      syncedQuantity: listingQuantity,
    })
  } catch (error) {
    console.error('Error updating eBay listing:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

/**
 * DELETE /api/marketplace/ebay/listings/[listingId]
 *
 * End/remove an eBay listing
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
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
      return NextResponse.json({ error: 'Not an eBay listing' }, { status: 400 })
    }

    // Check eBay connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    if (!connection || connection.status !== 'connected') {
      // Can't end on eBay, but mark as ended locally
      await marketplace.updateListingStatus(tenant.id, listingId, 'ended')
      return NextResponse.json({
        success: true,
        warning: 'eBay not connected, listing marked as ended locally only',
      })
    }

    const offerId = listing.marketplaceData?.ebayOfferId
    const sku = listing.marketplaceData?.ebayInventoryItemSku

    // Create eBay API client
    const ebay = createEbayClient(
      connection.accessToken!,
      connection.refreshToken || undefined
    )

    // Step 1: Withdraw the offer (unpublish the listing)
    if (offerId) {
      try {
        await ebay.sell.inventory.withdrawOffer(offerId)
        console.log('[eBay] Offer withdrawn successfully')
      } catch (withdrawError: any) {
        // 404 means already withdrawn/doesn't exist
        if (withdrawError?.meta?.res?.status !== 404) {
          console.error('eBay Withdraw API error:', withdrawError?.message || withdrawError)
          // Don't fail entirely, still try to clean up
          console.warn('Failed to withdraw offer, continuing with cleanup')
        }
      }

      // Step 2: Delete the offer
      try {
        await ebay.sell.inventory.deleteOffer(offerId)
        console.log('[eBay] Offer deleted successfully')
      } catch (deleteOfferError: any) {
        if (deleteOfferError?.meta?.res?.status !== 404) {
          console.warn('Failed to delete offer:', deleteOfferError?.message)
        }
      }
    }

    // Step 3: Delete the inventory item
    if (sku) {
      try {
        await ebay.sell.inventory.deleteInventoryItem(sku)
        console.log('[eBay] Inventory item deleted successfully')
      } catch (deleteInventoryError: any) {
        if (deleteInventoryError?.meta?.res?.status !== 404) {
          console.warn('Failed to delete inventory item:', deleteInventoryError?.message)
        }
      }
    }

    // Mark listing as ended in database
    await marketplace.updateListingStatus(tenant.id, listingId, 'ended')

    return NextResponse.json({
      success: true,
      message: 'eBay listing ended and removed',
    })
  } catch (error) {
    console.error('Error deleting eBay listing:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}
