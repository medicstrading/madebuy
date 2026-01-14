import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { marketplace, pieces, media, tenants } from '@madebuy/db'
import type { MarketplaceConnection, MarketplaceListing } from '@madebuy/shared'
import { getEbayApiUrl } from '@/lib/marketplace/ebay'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * GET /api/cron/marketplace-sync
 *
 * Syncs inventory levels between MadeBuy and connected marketplaces.
 * Should be scheduled to run every 15 minutes.
 *
 * Vercel cron config: schedule "0,15,30,45 * * * *"
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for processing

interface SyncResult {
  tenantId: string
  marketplace: string
  listingId: string
  success: boolean
  error?: string
  syncedPrice?: number
  syncedQuantity?: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - ALWAYS require auth, even if env var is missing
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting marketplace inventory sync...')

    // Get all tenants with active marketplace features
    const allTenants = await tenants.getAllTenants()
    const results: SyncResult[] = []
    let processedCount = 0
    let errorCount = 0

    for (const tenant of allTenants) {
      // Check if tenant has marketplace feature (Pro+ or Business)
      if (!tenant.features?.marketplaceSync) {
        continue
      }

      // Get active eBay connection
      const ebayConnection = await marketplace.getConnectionByMarketplace(
        tenant.id,
        'ebay'
      )

      if (ebayConnection?.status === 'connected') {
        const ebayResults = await syncEbayListings(tenant.id, ebayConnection)
        results.push(...ebayResults)
        processedCount += ebayResults.filter((r) => r.success).length
        errorCount += ebayResults.filter((r) => !r.success).length
      }

      // Etsy sync would go here when available
      // const etsyConnection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')
      // if (etsyConnection?.status === 'connected') {
      //   const etsyResults = await syncEtsyListings(tenant.id, etsyConnection)
      //   results.push(...etsyResults)
      // }
    }

    console.log(
      `[CRON] Marketplace sync completed: ${processedCount} synced, ${errorCount} errors`
    )

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      results,
    })
  } catch (error) {
    console.error('[CRON] Marketplace sync error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync',
        success: false,
      },
      { status: 500 }
    )
  }
}

/**
 * Sync eBay listings for a tenant
 */
async function syncEbayListings(
  tenantId: string,
  connection: MarketplaceConnection
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  // Get listings that need sync (stale data older than 15 minutes)
  const listingsToSync = await marketplace.getListingsNeedingSync(
    tenantId,
    'ebay',
    15
  )

  if (listingsToSync.length === 0) {
    return results
  }

  console.log(
    `[CRON] Syncing ${listingsToSync.length} eBay listings for tenant ${tenantId}`
  )

  for (const listing of listingsToSync) {
    const result = await syncSingleEbayListing(tenantId, connection, listing)
    results.push(result)

    // Small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return results
}

/**
 * Sync a single eBay listing
 */
async function syncSingleEbayListing(
  tenantId: string,
  connection: MarketplaceConnection,
  listing: MarketplaceListing
): Promise<SyncResult> {
  try {
    // Get the piece
    const piece = await pieces.getPiece(tenantId, listing.pieceId)
    if (!piece) {
      await marketplace.updateListingStatus(
        tenantId,
        listing.id,
        'error',
        'Piece not found'
      )
      return {
        tenantId,
        marketplace: 'ebay',
        listingId: listing.id,
        success: false,
        error: 'Piece not found',
      }
    }

    const sku = listing.marketplaceData?.ebayInventoryItemSku
    const offerId = listing.marketplaceData?.ebayOfferId

    if (!sku || !offerId) {
      return {
        tenantId,
        marketplace: 'ebay',
        listingId: listing.id,
        success: false,
        error: 'Missing eBay inventory data',
      }
    }

    // Check if price/quantity has changed
    const currentPrice = piece.price ?? 0
    const currentQuantity = piece.stock ?? 1

    // Skip if no price set (can't list without price)
    if (currentPrice === 0) {
      return {
        tenantId,
        marketplace: 'ebay',
        listingId: listing.id,
        success: false,
        error: 'Piece has no price set',
      }
    }

    const priceChanged = listing.lastSyncedPrice !== currentPrice
    const quantityChanged = listing.lastSyncedQuantity !== currentQuantity

    if (!priceChanged && !quantityChanged) {
      // Nothing to sync, just update timestamp
      await marketplace.markListingSynced(
        tenantId,
        listing.id,
        currentPrice,
        currentQuantity
      )
      return {
        tenantId,
        marketplace: 'ebay',
        listingId: listing.id,
        success: true,
        syncedPrice: currentPrice,
        syncedQuantity: currentQuantity,
      }
    }

    // Update inventory item (quantity)
    if (quantityChanged) {
      const inventoryPayload = {
        availability: {
          shipToLocationAvailability: {
            quantity: currentQuantity,
          },
        },
      }

      const inventoryResponse = await fetch(
        getEbayApiUrl(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`),
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
            'Content-Language': 'en_AU',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
          },
          body: JSON.stringify(inventoryPayload),
        }
      )

      if (!inventoryResponse.ok) {
        const errorData = await inventoryResponse.json().catch(() => ({}))
        console.error(
          `[CRON] eBay inventory update failed for ${listing.id}:`,
          errorData
        )

        await marketplace.updateListingStatus(
          tenantId,
          listing.id,
          'error',
          `Inventory sync failed: ${JSON.stringify(errorData)}`
        )

        return {
          tenantId,
          marketplace: 'ebay',
          listingId: listing.id,
          success: false,
          error: 'Inventory update failed',
        }
      }
    }

    // Update offer (price)
    if (priceChanged) {
      const offerPayload = {
        pricingSummary: {
          price: {
            value: currentPrice.toFixed(2),
            currency: (piece.currency || 'AUD').toUpperCase(),
          },
        },
      }

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
          body: JSON.stringify(offerPayload),
        }
      )

      if (!offerResponse.ok) {
        const errorData = await offerResponse.json().catch(() => ({}))
        console.error(`[CRON] eBay offer update failed for ${listing.id}:`, errorData)

        await marketplace.updateListingStatus(
          tenantId,
          listing.id,
          'error',
          `Price sync failed: ${JSON.stringify(errorData)}`
        )

        return {
          tenantId,
          marketplace: 'ebay',
          listingId: listing.id,
          success: false,
          error: 'Price update failed',
        }
      }
    }

    // Mark as synced
    await marketplace.markListingSynced(
      tenantId,
      listing.id,
      currentPrice,
      currentQuantity
    )
    await marketplace.updateListingStatus(tenantId, listing.id, 'active')

    return {
      tenantId,
      marketplace: 'ebay',
      listingId: listing.id,
      success: true,
      syncedPrice: currentPrice,
      syncedQuantity: currentQuantity,
    }
  } catch (error) {
    console.error(`[CRON] Error syncing listing ${listing.id}:`, error)
    return {
      tenantId,
      marketplace: 'ebay',
      listingId: listing.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
