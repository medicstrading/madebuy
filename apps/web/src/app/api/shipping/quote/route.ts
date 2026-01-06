import { NextRequest, NextResponse } from 'next/server'
import { tenants, pieces } from '@madebuy/db'
import { createSendleClient } from '@madebuy/shipping'

interface QuoteRequest {
  tenantSlug: string
  // Origin (seller) - will be fetched from tenant if not provided
  originPostcode?: string
  originSuburb?: string
  originState?: string
  // Destination (customer)
  destinationPostcode: string
  destinationSuburb: string
  destinationState: string
  destinationCountry?: string
  // Parcel (can provide directly or pieceId to fetch)
  pieceId?: string
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

interface ShippingQuote {
  carrier: string
  service: string
  price: number
  currency: string
  estimatedDays: {
    min: number
    max: number
  }
}

/**
 * POST /api/shipping/quote
 * Get shipping quotes from Sendle based on parcel dimensions
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json()

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

    // Get tenant
    const tenant = await tenants.getTenantBySlug(body.tenantSlug)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Check if Sendle is configured
    if (!tenant.sendleSettings?.isConnected || !tenant.sendleSettings.apiKey || !tenant.sendleSettings.senderId) {
      // Return empty array if Sendle is not configured (seller hasn't set up shipping)
      return NextResponse.json({ quotes: [], message: 'Shipping not configured for this seller' })
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
    weightGrams = weightGrams ?? 500 // 500g default
    lengthCm = lengthCm ?? 20
    widthCm = widthCm ?? 15
    heightCm = heightCm ?? 10

    // Get origin from tenant's location or use defaults
    // In a real implementation, you'd store the seller's address in tenant settings
    const originPostcode = body.originPostcode ?? '4000' // Brisbane CBD default
    const originSuburb = body.originSuburb ?? 'BRISBANE'
    const originState = body.originState ?? 'QLD'

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
          suburb: body.destinationSuburb,
          state_name: body.destinationState,
          postcode: body.destinationPostcode,
          country: body.destinationCountry ?? 'AU',
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
      const quotes: ShippingQuote[] = (sendleResponse.quotes || []).map(q => ({
        carrier: 'Sendle',
        service: q.plan_name,
        price: q.price_in_cents / 100, // Convert cents to dollars
        currency: 'AUD',
        estimatedDays: q.estimated_delivery_days || { min: 2, max: 7 },
      }))

      return NextResponse.json({
        quotes,
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
        quotes: [
          {
            carrier: 'Standard Shipping',
            service: 'Flat Rate',
            price: 9.95,
            currency: 'AUD',
            estimatedDays: { min: 3, max: 7 },
          },
          {
            carrier: 'Express Shipping',
            service: 'Flat Rate Express',
            price: 14.95,
            currency: 'AUD',
            estimatedDays: { min: 1, max: 3 },
          },
        ],
        message: 'Using fallback shipping rates',
        parcelDetails: {
          weightGrams,
          lengthCm,
          widthCm,
          heightCm,
        },
      })
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
 * GET /api/shipping/quote
 * Simple GET endpoint for testing - redirects to POST with query params
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Build request body from query params
  const body: QuoteRequest = {
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

  // Forward to POST handler logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}
