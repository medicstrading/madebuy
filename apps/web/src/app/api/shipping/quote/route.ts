import { NextRequest, NextResponse } from 'next/server'
import { tenants, pieces } from '@madebuy/db'
import { createSendleClient } from '@madebuy/shipping'

// Simple unique ID generator using built-in crypto
const generateId = () => crypto.randomUUID().slice(0, 8)

// Old format - single piece lookup
interface QuoteRequestLegacy {
  tenantSlug: string
  originPostcode?: string
  originSuburb?: string
  originState?: string
  destinationPostcode: string
  destinationSuburb: string
  destinationState: string
  destinationCountry?: string
  pieceId?: string
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

// New format - cart items with proper checkout structure
interface CartItemRequest {
  pieceId: string
  quantity: number
  weightGrams?: number
}

interface DestinationRequest {
  postcode: string
  suburb: string
  state: string
  country?: string
}

interface QuoteRequestNew {
  tenantId: string
  items: CartItemRequest[]
  destination: DestinationRequest
}

interface ShippingQuote {
  id: string
  carrier: string
  service: string
  price: number  // Price in cents for consistency
  currency: string
  estimatedDays: {
    min: number
    max: number
  }
  features?: string[]
}

/**
 * POST /api/shipping/quote
 * Get shipping quotes from Sendle based on cart items
 *
 * Supports two request formats:
 * 1. New format (from checkout): { tenantId, items: [...], destination: {...} }
 * 2. Legacy format: { tenantSlug, destinationPostcode, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Detect request format
    const isNewFormat = 'tenantId' in body && 'items' in body && 'destination' in body

    if (isNewFormat) {
      return handleNewFormat(body as QuoteRequestNew)
    } else {
      return handleLegacyFormat(body as QuoteRequestLegacy)
    }
  } catch (error) {
    console.error('Failed to get shipping quotes:', error)
    return NextResponse.json(
      { error: 'Failed to get shipping quotes' },
      { status: 500 }
    )
  }
}

/**
 * Handle new format requests from checkout (tenantId + items array)
 */
async function handleNewFormat(body: QuoteRequestNew) {
  // Validate required fields
  if (!body.tenantId) {
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    )
  }

  if (!body.destination?.postcode || !body.destination?.suburb || !body.destination?.state) {
    return NextResponse.json(
      { error: 'Destination address (postcode, suburb, state) is required' },
      { status: 400 }
    )
  }

  // Get tenant by ID
  const tenant = await tenants.getTenantById(body.tenantId)
  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    )
  }

  // Calculate total weight and dimensions from all items
  let totalWeightGrams = 0
  let maxLength = 0
  let maxWidth = 0
  let totalHeight = 0

  for (const item of body.items || []) {
    const piece = await pieces.getPiece(tenant.id, item.pieceId)
    if (piece) {
      const qty = item.quantity || 1
      const weight = piece.shippingWeight || item.weightGrams || 250 // 250g default per item
      totalWeightGrams += weight * qty

      // For dimensions, use max of length/width, stack height
      maxLength = Math.max(maxLength, piece.shippingLength || 20)
      maxWidth = Math.max(maxWidth, piece.shippingWidth || 15)
      totalHeight += (piece.shippingHeight || 5) * qty
    } else {
      // Default weights if piece not found
      totalWeightGrams += (item.weightGrams || 250) * (item.quantity || 1)
      maxLength = Math.max(maxLength, 20)
      maxWidth = Math.max(maxWidth, 15)
      totalHeight += 5 * (item.quantity || 1)
    }
  }

  // Ensure minimums
  totalWeightGrams = Math.max(totalWeightGrams, 100) // Min 100g
  maxLength = Math.max(maxLength, 10)
  maxWidth = Math.max(maxWidth, 10)
  totalHeight = Math.max(totalHeight, 5)

  return getQuotes(
    tenant,
    body.destination.postcode,
    body.destination.suburb,
    body.destination.state,
    body.destination.country || 'AU',
    totalWeightGrams,
    maxLength,
    maxWidth,
    totalHeight
  )
}

/**
 * Handle legacy format requests (tenantSlug + single pieceId)
 */
async function handleLegacyFormat(body: QuoteRequestLegacy) {
  // Validate required fields
  if (!body.tenantSlug) {
    return NextResponse.json(
      { error: 'tenantSlug is required' },
      { status: 400 }
    )
  }

  if (!body.destinationPostcode || !body.destinationSuburb || !body.destinationState) {
    return NextResponse.json(
      { error: 'Destination address (postcode, suburb, state) is required' },
      { status: 400 }
    )
  }

  // Get tenant by slug
  const tenant = await tenants.getTenantBySlug(body.tenantSlug)
  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    )
  }

  // Get parcel dimensions
  let weightGrams = body.weightGrams
  let lengthCm = body.lengthCm
  let widthCm = body.widthCm
  let heightCm = body.heightCm

  // If pieceId is provided, fetch dimensions from the piece
  if (body.pieceId) {
    const piece = await pieces.getPiece(tenant.id, body.pieceId)
    if (piece) {
      weightGrams = weightGrams ?? piece.shippingWeight
      lengthCm = lengthCm ?? piece.shippingLength
      widthCm = widthCm ?? piece.shippingWidth
      heightCm = heightCm ?? piece.shippingHeight
    }
  }

  // Default dimensions if not provided
  weightGrams = weightGrams ?? 500
  lengthCm = lengthCm ?? 20
  widthCm = widthCm ?? 15
  heightCm = heightCm ?? 10

  return getQuotes(
    tenant,
    body.destinationPostcode,
    body.destinationSuburb,
    body.destinationState,
    body.destinationCountry || 'AU',
    weightGrams,
    lengthCm,
    widthCm,
    heightCm
  )
}

/**
 * Get shipping quotes from Sendle or return fallback rates
 */
async function getQuotes(
  tenant: any,
  destPostcode: string,
  destSuburb: string,
  destState: string,
  destCountry: string,
  weightGrams: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
) {
  // Check if Sendle is configured
  if (!tenant.sendleSettings?.isConnected || !tenant.sendleSettings.apiKey || !tenant.sendleSettings.senderId) {
    // Return fallback flat-rate if Sendle not configured
    return NextResponse.json({
      quotes: createFallbackQuotes(),
      freeShippingEligible: false,
      message: 'Shipping not configured - using standard rates',
    })
  }

  // Get origin from tenant's pickup address (default to Brisbane if not set)
  const pickupAddress = tenant.sendleSettings?.pickupAddress
  const originPostcode = pickupAddress?.postcode || '4000'
  const originSuburb = pickupAddress?.suburb || 'BRISBANE'
  const originState = pickupAddress?.state || 'QLD'

  // Create Sendle client
  const client = createSendleClient({
    apiKey: tenant.sendleSettings.apiKey,
    senderId: tenant.sendleSettings.senderId,
    environment: tenant.sendleSettings.environment,
  })

  try {
    // Get quotes from Sendle
    const sendleResponse = await client.getQuotes({
      sender_address: {
        address_line1: '',
        suburb: originSuburb,
        state_name: originState,
        postcode: originPostcode,
        country: 'AU',
      },
      receiver_address: {
        address_line1: '',
        suburb: destSuburb,
        state_name: destState,
        postcode: destPostcode,
        country: destCountry,
      },
      parcel: {
        weight_value: weightGrams / 1000, // Convert grams to kg
        weight_units: 'kg',
        length_value: lengthCm,
        width_value: widthCm,
        height_value: heightCm,
        dimension_units: 'cm',
      },
    })

    // Transform Sendle quotes to our format
    const quotes: ShippingQuote[] = (sendleResponse.quotes || []).map((q: any, index: number) => ({
      id: `sendle-${index}-${generateId()}`,
      carrier: 'Sendle',
      service: q.plan_name,
      price: q.price_in_cents, // Keep as cents for frontend consistency
      currency: 'AUD',
      estimatedDays: q.estimated_delivery_days || { min: 2, max: 7 },
      features: q.features || [],
    }))

    // Sort by price (cheapest first)
    quotes.sort((a, b) => a.price - b.price)

    return NextResponse.json({
      quotes,
      freeShippingEligible: false, // TODO: Implement free shipping threshold from tenant settings
      freeShippingThreshold: null,
      amountUntilFreeShipping: null,
      parcelDetails: {
        weightGrams,
        lengthCm,
        widthCm,
        heightCm,
      },
    })
  } catch (sendleError) {
    console.error('Sendle API error:', sendleError)

    // Return fallback flat-rate shipping options
    return NextResponse.json({
      quotes: createFallbackQuotes(),
      freeShippingEligible: false,
      message: 'Using fallback shipping rates',
      parcelDetails: {
        weightGrams,
        lengthCm,
        widthCm,
        heightCm,
      },
    })
  }
}

/**
 * Create fallback shipping quotes when Sendle is unavailable
 */
function createFallbackQuotes(): ShippingQuote[] {
  return [
    {
      id: `standard-${generateId()}`,
      carrier: 'Standard Shipping',
      service: 'Standard Delivery',
      price: 995, // $9.95 in cents
      currency: 'AUD',
      estimatedDays: { min: 3, max: 7 },
      features: ['Tracking included'],
    },
    {
      id: `express-${generateId()}`,
      carrier: 'Express Shipping',
      service: 'Express Delivery',
      price: 1495, // $14.95 in cents
      currency: 'AUD',
      estimatedDays: { min: 1, max: 3 },
      features: ['Tracking included', 'Priority handling'],
    },
  ]
}

/**
 * GET /api/shipping/quote
 * Simple GET endpoint for testing - redirects to POST with query params
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Build request body from query params (legacy format)
  const body: QuoteRequestLegacy = {
    tenantSlug: searchParams.get('tenant') || '',
    destinationPostcode: searchParams.get('postcode') || '',
    destinationSuburb: searchParams.get('suburb') || '',
    destinationState: searchParams.get('state') || '',
    pieceId: searchParams.get('pieceId') || undefined,
    weightGrams: searchParams.get('weight') ? parseInt(searchParams.get('weight')!) : undefined,
  }

  // Validate
  if (!body.tenantSlug || !body.destinationPostcode || !body.destinationSuburb || !body.destinationState) {
    return NextResponse.json({
      error: 'Missing required parameters',
      usage: 'GET /api/shipping/quote?tenant=SLUG&postcode=4000&suburb=BRISBANE&state=QLD&pieceId=xxx',
    }, { status: 400 })
  }

  // Forward to legacy handler
  return handleLegacyFormat(body)
}
