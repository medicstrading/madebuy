import { marketplace, media, pieces } from '@madebuy/db'
import type { MarketplaceListing } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createEbayClient,
  type EbayInventoryItem,
  getEbayDomain,
} from '@/lib/marketplace/ebay'
import { getCurrentTenant } from '@/lib/session'

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
  _overridePrice?: number,
  overrideQuantity?: number,
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
    aspects.Material = piece.materials
  }
  if (piece.techniques && piece.techniques.length > 0) {
    aspects.Handmade = ['Yes']
    aspects.Technique = piece.techniques
  }
  if (piece.category) {
    aspects.Type = [piece.category]
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
  marketplaceId: string = 'EBAY_AU',
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
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const pieceId = searchParams.get('pieceId')

    // Get listings from database
    // Default to showing active/pending/error listings, exclude ended unless specifically requested
    const effectiveStatus = status
      ? (status as MarketplaceListing['status'])
      : (['active', 'pending', 'error'] as MarketplaceListing['status'][])
    const listings = await marketplace.listListings(tenant.id, {
      marketplace: 'ebay',
      status: effectiveStatus,
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
      }),
    )

    return NextResponse.json({ listings: enrichedListings })
  } catch (error) {
    console.error('Error fetching eBay listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 },
    )
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

  const missing = required.filter((r) => !process.env[r.key]).map((r) => r.name)

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
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'ebay',
    )
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'eBay not connected' }, { status: 400 })
    }

    // eBay sync deferred to Q2 2026
    // All implementation code commented out until Q2 2026 roadmap
    return NextResponse.json(
      {
        error:
          'eBay sync coming Q2 2026. For now, manage your eBay listings directly on ebay.com.au.',
      },
      { status: 501 },
    )
  } catch (error) {
    console.error('Error creating eBay listing:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 },
    )
  }
}
