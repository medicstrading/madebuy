import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentTenant } from '@/lib/session'
import { marketplace, pieces, media } from '@madebuy/db'
import type { MarketplaceListing } from '@madebuy/shared'
import {
  createEbayClient,
  getEbayDomain,
  type EbayInventoryItem,
} from '@/lib/marketplace/ebay'

/**
 * Validation schema for creating eBay listings
 */
const createListingSchema = z.object({
  pieceId: z.string().min(1, 'pieceId is required'),
  categoryId: z.string().optional(),
  price: z.number().positive('price must be positive').optional(),
  quantity: z
    .number()
    .int('quantity must be an integer')
    .positive('quantity must be positive')
    .optional(),
})

/**
 * Generate a unique SKU for eBay inventory
 */
function generateSku(tenantId: string, pieceId: string): string {
  return `MB-${tenantId.slice(0, 6)}-${pieceId}`
}

/**
 * Build eBay Inventory Item payload from MadeBuy piece
 */
async function buildInventoryItemPayload(
  tenantId: string,
  piece: NonNullable<Awaited<ReturnType<typeof pieces.getPiece>>>,
  overridePrice?: number,
  overrideQuantity?: number
) {
  // Get piece media for images
  const pieceMedia = piece.mediaIds?.length
    ? await media.getMediaByIds(tenantId, piece.mediaIds)
    : []

  // Get image URLs (use large variant if available, otherwise original)
  const imageUrls = pieceMedia
    .filter((m) => m.type === 'image')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 12) // eBay allows up to 12 images
    .map((m) => m.variants.large?.url || m.variants.original.url)
    .filter(Boolean)

  // Build description (use piece description or generate from details)
  const description = piece.description || `${piece.name} - Handmade item`

  // Add product aspects (item specifics)
  const aspects: Record<string, string[]> = {}

  if (piece.materials && piece.materials.length > 0) {
    aspects['Material'] = piece.materials
  }
  if (piece.techniques && piece.techniques.length > 0) {
    aspects['Handmade'] = ['Yes']
    aspects['Technique'] = piece.techniques
  }
  if (piece.category) {
    aspects['Type'] = [piece.category]
  }

  // Build typed inventory item payload
  const payload: EbayInventoryItem = {
    availability: {
      shipToLocationAvailability: {
        quantity: overrideQuantity ?? piece.stock ?? 1,
      },
    },
    condition: 'NEW', // Handmade items are typically new
    product: {
      title: piece.name.slice(0, 80), // eBay title limit
      description: description,
      aspects: Object.keys(aspects).length > 0 ? aspects : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    },
  }

  // Add weight if available (eBay uses ounces for weight)
  const weightGrams = piece.shippingWeight ?? piece.weight
  if (weightGrams && typeof weightGrams === 'number') {
    const weightInOz = weightGrams * 0.035274 // grams to oz
    payload.packageWeightAndSize = {
      weight: {
        value: weightInOz,
        unit: 'OUNCE',
      },
    }

    // Add dimensions if available
    if (piece.shippingLength && piece.shippingWidth && piece.shippingHeight) {
      payload.packageWeightAndSize.dimensions = {
        length: piece.shippingLength,
        width: piece.shippingWidth,
        height: piece.shippingHeight,
        unit: 'CENTIMETER',
      }
    }
  }

  return payload
}

/**
 * Build eBay Offer payload for ebay-api package
 */
function buildOfferPayload(
  sku: string,
  price: number,
  currency: string,
  categoryId: string,
  marketplaceId: string = 'EBAY_AU'
) {
  return {
    sku,
    marketplaceId,
    format: 'FIXED_PRICE',
    categoryId,
    listingPolicies: {
      fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
      paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
      returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
    },
    pricingSummary: {
      price: {
        value: price.toFixed(2),
        currency: currency.toUpperCase(),
      },
    },
    merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY,
  }
}

/**
 * GET /api/marketplace/ebay/listings
 *
 * List all eBay listings for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check eBay connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const pieceId = searchParams.get('pieceId')

    // Get listings from database
    const listings = await marketplace.listListings(tenant.id, {
      marketplace: 'ebay',
      status: status as MarketplaceListing['status'] | undefined,
      pieceId: pieceId || undefined,
    })

    // Enrich listings with piece data
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const piece = await pieces.getPiece(tenant.id, listing.pieceId)
        return {
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
        }
      })
    )

    return NextResponse.json({ listings: enrichedListings })
  } catch (error) {
    console.error('Error fetching eBay listings:', error)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}

/**
 * Check if required eBay configuration is present
 */
function checkEbayConfig(): { ok: boolean; missing: string[] } {
  const required = [
    { key: 'EBAY_FULFILLMENT_POLICY_ID', name: 'Fulfillment Policy' },
    { key: 'EBAY_PAYMENT_POLICY_ID', name: 'Payment Policy' },
    { key: 'EBAY_RETURN_POLICY_ID', name: 'Return Policy' },
    { key: 'EBAY_MERCHANT_LOCATION_KEY', name: 'Merchant Location' },
  ]

  const missing = required
    .filter(r => !process.env[r.key])
    .map(r => r.name)

  return { ok: missing.length === 0, missing }
}

/**
 * POST /api/marketplace/ebay/listings
 *
 * Create a new eBay listing from a MadeBuy piece
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check eBay connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // Check required eBay configuration
    const configCheck = checkEbayConfig()
    if (!configCheck.ok) {
      console.error('[eBay Listings] Missing configuration:', configCheck.missing)
      return NextResponse.json(
        {
          error: 'eBay listing configuration incomplete',
          details: `Missing: ${configCheck.missing.join(', ')}. Please set up Business Policies in eBay Seller Hub.`,
          missing: configCheck.missing,
        },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createListingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { pieceId, categoryId, price, quantity } = validation.data

    // Get the piece
    const piece = await pieces.getPiece(tenant.id, pieceId)
    if (!piece) {
      return NextResponse.json({ error: 'Piece not found' }, { status: 404 })
    }

    // Check if listing already exists
    const existingListing = await marketplace.getListingByPiece(tenant.id, pieceId, 'ebay')
    if (existingListing && existingListing.status !== 'ended') {
      return NextResponse.json(
        { error: 'Piece is already listed on eBay', listing: existingListing },
        { status: 409 }
      )
    }

    // Determine price and category
    const listingPrice = price ?? piece.price
    const listingCategory = categoryId ?? process.env.EBAY_DEFAULT_CATEGORY_ID ?? '281'
    const currency = piece.currency || 'AUD'
    const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_AU'

    if (!listingPrice || listingPrice <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    // Generate SKU
    const sku = generateSku(tenant.id, pieceId)

    // Create eBay API client (handles headers correctly)
    const ebay = createEbayClient(
      connection.accessToken!,
      connection.refreshToken || undefined
    )
    console.log('[eBay] Using ebay-api package for listing creation')

    // Build inventory item payload
    const inventoryPayload = await buildInventoryItemPayload(
      tenant.id,
      piece,
      listingPrice,
      quantity
    )

    // Step 1: Create/Update Inventory Item using ebay-api package
    let inventoryResult
    try {
      inventoryResult = await ebay.sell.inventory.createOrReplaceInventoryItem(
        sku,
        inventoryPayload
      )
      console.log('[eBay] Inventory item created successfully')
    } catch (inventoryError: any) {
      console.error('eBay Inventory API error:', inventoryError?.message || inventoryError)
      const errorDetails = inventoryError?.meta?.res?.data || inventoryError?.message
      return NextResponse.json(
        {
          error: 'Failed to create eBay inventory item. Please try again.',
          details: errorDetails,
        },
        { status: 400 }
      )
    }

    // Step 2: Create Offer using ebay-api package
    const offerPayload = buildOfferPayload(
      sku,
      listingPrice,
      currency,
      listingCategory,
      marketplaceId
    )

    let offerResult
    try {
      offerResult = await ebay.sell.inventory.createOffer(offerPayload)
      console.log('[eBay] Offer created successfully:', offerResult.offerId)
    } catch (offerError: any) {
      console.error('eBay Offer API error:', offerError?.message || offerError)
      const errorDetails = offerError?.meta?.res?.data || offerError?.message
      return NextResponse.json(
        {
          error: 'Failed to create eBay offer. Please try again.',
          details: errorDetails,
        },
        { status: 400 }
      )
    }

    const offerId = offerResult.offerId

    // Step 3: Publish Offer using ebay-api package
    let publishResult
    try {
      publishResult = await ebay.sell.inventory.publishOffer(offerId)
      console.log('[eBay] Offer published successfully:', publishResult.listingId)
    } catch (publishError: any) {
      console.error('eBay Publish API error:', publishError?.message || publishError)

      // Still save the listing as pending since offer was created
      const listing = await marketplace.createListing(tenant.id, {
        pieceId,
        marketplace: 'ebay',
        externalListingId: offerId,
        status: 'pending',
        marketplaceData: {
          ebayOfferId: offerId,
          ebayInventoryItemSku: sku,
          categoryId: listingCategory,
        },
      })

      const errorDetails = publishError?.meta?.res?.data || publishError?.message
      return NextResponse.json(
        {
          success: false,
          error: 'Offer created but failed to publish. Please try again.',
          details: errorDetails,
          listing,
        },
        { status: 207 }
      )
    }

    const listingId = publishResult.listingId

    // Build eBay listing URL
    const externalUrl = `https://${getEbayDomain()}/itm/${listingId}`

    // Save listing to database
    const listing = await marketplace.createListing(tenant.id, {
      pieceId,
      marketplace: 'ebay',
      externalListingId: listingId,
      externalUrl,
      status: 'active',
      marketplaceData: {
        ebayItemId: listingId,
        ebayOfferId: offerId,
        ebayInventoryItemSku: sku,
        categoryId: listingCategory,
      },
    })

    // Mark listing as synced with current price/quantity
    await marketplace.markListingSynced(
      tenant.id,
      listing.id,
      listingPrice,
      quantity ?? piece.stock ?? 1
    )

    return NextResponse.json({
      success: true,
      listing,
      ebayListingId: listingId,
      ebayUrl: externalUrl,
    })
  } catch (error) {
    console.error('Error creating eBay listing:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
