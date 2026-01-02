import type { Piece, Tenant } from '@madebuy/shared'
import { EtsyClient } from './client'
import { pieceToEtsyListingCreate, pieceToEtsyListingUpdate, createInventoryUpdate } from './mapping'
import type { EtsyListing } from './types'

export interface SyncResult {
  success: boolean
  listingId?: string
  listingUrl?: string
  error?: string
}

export interface SyncReport {
  total: number
  created: number
  updated: number
  failed: number
  errors: Array<{ pieceId: string; error: string }>
}

/**
 * Sync a single piece to Etsy
 */
export async function syncPieceToEtsy(
  piece: Piece,
  tenant: Tenant,
  apiKey: string
): Promise<SyncResult> {
  try {
    // Check if tenant has Etsy integration
    if (!tenant.integrations?.etsy) {
      throw new Error('Etsy integration not configured for tenant')
    }

    const { shopId, accessToken } = tenant.integrations.etsy
    const client = new EtsyClient(apiKey, accessToken)

    // Check if piece already has an Etsy listing
    const existingListingId = piece.integrations?.etsy?.listingId

    if (existingListingId) {
      // Update existing listing
      const updateData = pieceToEtsyListingUpdate(piece, tenant)
      const listing = await client.updateListing(shopId, existingListingId, updateData)

      // Update inventory/quantity
      if (piece.price !== undefined && piece.stock !== undefined) {
        const inventoryUpdate = createInventoryUpdate(piece.stock, piece.price)
        await client.updateInventory(existingListingId, inventoryUpdate)
      }

      return {
        success: true,
        listingId: listing.listing_id.toString(),
        listingUrl: listing.url,
      }
    } else {
      // Create new listing
      const createData = pieceToEtsyListingCreate(piece, tenant)
      const listing = await client.createListing(shopId, createData)

      return {
        success: true,
        listingId: listing.listing_id.toString(),
        listingUrl: listing.url,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync inventory quantity only
 */
export async function syncInventoryToEtsy(
  piece: Piece,
  tenant: Tenant,
  apiKey: string
): Promise<SyncResult> {
  try {
    if (!tenant.integrations?.etsy) {
      throw new Error('Etsy integration not configured for tenant')
    }

    const listingId = piece.integrations?.etsy?.listingId
    if (!listingId) {
      throw new Error('Piece is not linked to an Etsy listing')
    }

    if (piece.price === undefined || piece.stock === undefined) {
      throw new Error('Piece is missing price or stock information')
    }

    const { accessToken } = tenant.integrations.etsy
    const client = new EtsyClient(apiKey, accessToken)

    const inventoryUpdate = createInventoryUpdate(piece.stock, piece.price)
    await client.updateInventory(listingId, inventoryUpdate)

    return {
      success: true,
      listingId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync piece images to Etsy
 * Note: This requires downloading images from R2 and uploading to Etsy
 */
export async function syncImagesToEtsy(
  piece: Piece,
  tenant: Tenant,
  apiKey: string,
  imageUrls: string[]
): Promise<SyncResult> {
  try {
    if (!tenant.integrations?.etsy) {
      throw new Error('Etsy integration not configured for tenant')
    }

    const listingId = piece.integrations?.etsy?.listingId
    if (!listingId) {
      throw new Error('Piece is not linked to an Etsy listing')
    }

    const { shopId, accessToken } = tenant.integrations.etsy
    const client = new EtsyClient(apiKey, accessToken)

    // Upload each image
    for (let i = 0; i < imageUrls.length && i < 10; i++) {
      // Etsy allows max 10 images
      const imageUrl = imageUrls[i]

      // Fetch image from URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        console.warn(`Failed to fetch image: ${imageUrl}`)
        continue
      }

      const imageBlob = await imageResponse.blob()

      // Upload to Etsy
      await client.uploadImage(shopId, listingId, imageBlob, {
        rank: i + 1,
        alt_text: piece.name,
      })
    }

    return {
      success: true,
      listingId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete Etsy listing
 */
export async function deleteEtsyListing(
  piece: Piece,
  tenant: Tenant,
  apiKey: string
): Promise<SyncResult> {
  try {
    if (!tenant.integrations?.etsy) {
      throw new Error('Etsy integration not configured for tenant')
    }

    const listingId = piece.integrations?.etsy?.listingId
    if (!listingId) {
      throw new Error('Piece is not linked to an Etsy listing')
    }

    const { accessToken } = tenant.integrations.etsy
    const client = new EtsyClient(apiKey, accessToken)

    await client.deleteListing(listingId)

    return {
      success: true,
      listingId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch Etsy listings for a shop
 */
export async function fetchEtsyListings(
  tenant: Tenant,
  apiKey: string,
  params?: {
    state?: 'active' | 'inactive' | 'draft' | 'sold_out' | 'expired'
    limit?: number
    offset?: number
  }
): Promise<EtsyListing[]> {
  if (!tenant.integrations?.etsy) {
    throw new Error('Etsy integration not configured for tenant')
  }

  const { shopId, accessToken } = tenant.integrations.etsy
  const client = new EtsyClient(apiKey, accessToken)

  const response = await client.getShopListings(shopId, params)
  return response.results
}

/**
 * Check sync status for a piece
 */
export function getSyncStatus(piece: Piece): {
  isSynced: boolean
  syncEnabled: boolean
  lastSyncedAt?: Date
  etsyListingUrl?: string
} {
  const etsyIntegration = piece.integrations?.etsy

  return {
    isSynced: !!etsyIntegration?.listingId,
    syncEnabled: etsyIntegration?.syncEnabled ?? true,
    lastSyncedAt: etsyIntegration?.lastSyncedAt,
    etsyListingUrl: etsyIntegration?.listingUrl,
  }
}
