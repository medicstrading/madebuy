/**
 * POST /api/shipping/quote
 * Get shipping rates for cart items
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenants, shippingProfiles, pieces } from '@madebuy/db'
import { Sendle } from '@madebuy/shared'
import { rateLimiters } from '@/lib/rate-limit'
import type { Tenant, SendleQuote, SendleConfig } from '@madebuy/shared'

// Quote params for legacy Sendle integration
interface QuoteParams {
  pickupSuburb: string
  pickupPostcode: string
  deliverySuburb: string
  deliveryPostcode: string
  weight: number // in kg
}

// Default weight in grams for items without weight specified
const DEFAULT_ITEM_WEIGHT_GRAMS = 250

// Cache for shipping quotes (5 minutes TTL)
const quoteCache = new Map<string, { quotes: ShippingQuoteResponse[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface ShippingQuoteRequest {
  tenantId: string
  items: Array<{
    pieceId: string
    quantity: number
    weightGrams?: number
  }>
  destination: {
    postcode: string
    suburb: string
    state: string
    country: string
  }
}

export interface ShippingQuoteResponse {
  id: string
  carrier: string
  service: string
  price: number // in cents
  currency: string
  estimatedDays: {
    min: number
    max: number
  }
  features?: string[]
}

interface QuoteResponse {
  quotes: ShippingQuoteResponse[]
  freeShippingEligible: boolean
  freeShippingThreshold?: number
  amountUntilFreeShipping?: number
}

function getCacheKey(tenantId: string, destination: ShippingQuoteRequest['destination'], weightKg: number): string {
  return `${tenantId}:${destination.postcode}:${destination.country}:${weightKg.toFixed(2)}`
}

export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute for quote lookups
  const rateLimitResponse = rateLimiters.search(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body: ShippingQuoteRequest = await request.json()
    const { tenantId, items, destination } = body

    // Validate required fields
    if (!tenantId || !items || items.length === 0 || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, items, and destination are required' },
        { status: 400 }
      )
    }

    if (!destination.postcode || !destination.country) {
      return NextResponse.json(
        { error: 'Destination postcode and country are required' },
        { status: 400 }
      )
    }

    // Get tenant data
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    // Calculate total weight and subtotal
    let totalWeightGrams = 0
    let subtotalCents = 0

    for (const item of items) {
      // Try to get piece data for accurate weight
      const piece = await pieces.getPiece(tenantId, item.pieceId)

      if (piece) {
        // Use piece weight if available, otherwise use provided weight or default
        const pieceData = piece as any // Type assertion for optional weight field
        const itemWeight = pieceData.weightGrams ?? item.weightGrams ?? DEFAULT_ITEM_WEIGHT_GRAMS
        totalWeightGrams += itemWeight * item.quantity
        subtotalCents += (piece.price ?? 0) * 100 * item.quantity
      } else {
        // Use provided weight or default
        totalWeightGrams += (item.weightGrams ?? DEFAULT_ITEM_WEIGHT_GRAMS) * item.quantity
      }
    }

    const totalWeightKg = totalWeightGrams / 1000

    // Check cache
    const cacheKey = getCacheKey(tenantId, destination, totalWeightKg)
    const cached = quoteCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const response = buildQuoteResponse(cached.quotes, tenant, subtotalCents)
      return NextResponse.json(response)
    }

    // Get shipping quotes
    const quotes = await getShippingQuotes(tenant, destination, totalWeightKg)

    // Cache the quotes
    quoteCache.set(cacheKey, { quotes, timestamp: Date.now() })

    // Build response with free shipping info
    const response = buildQuoteResponse(quotes, tenant, subtotalCents)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Shipping quote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get shipping quotes' },
      { status: 500 }
    )
  }
}

function buildQuoteResponse(
  quotes: ShippingQuoteResponse[],
  tenant: Tenant,
  subtotalCents: number
): QuoteResponse {
  const freeShippingThreshold = tenant.shippingConfig?.freeShippingThreshold
  const freeShippingEligible = freeShippingThreshold
    ? subtotalCents >= freeShippingThreshold * 100
    : false

  // If eligible for free shipping, set all shipping prices to 0
  const adjustedQuotes = freeShippingEligible
    ? quotes.map(q => ({ ...q, price: 0 }))
    : quotes

  return {
    quotes: adjustedQuotes.sort((a, b) => a.price - b.price), // Sort by price
    freeShippingEligible,
    freeShippingThreshold: freeShippingThreshold ? freeShippingThreshold * 100 : undefined,
    amountUntilFreeShipping: freeShippingThreshold && !freeShippingEligible
      ? Math.max(0, freeShippingThreshold * 100 - subtotalCents)
      : undefined,
  }
}

async function getShippingQuotes(
  tenant: Tenant,
  destination: ShippingQuoteRequest['destination'],
  weightKg: number
): Promise<ShippingQuoteResponse[]> {
  const quotes: ShippingQuoteResponse[] = []

  // Get tenant's shipping profiles
  const profiles = await shippingProfiles.listProfiles(tenant.id)

  // If tenant has Sendle integration, get calculated rates
  const tenantWithIntegrations = tenant as any
  const sendleIntegration = tenantWithIntegrations.sendleIntegration
  if (sendleIntegration?.apiKey && sendleIntegration?.sendleId) {
    try {
      const sendleQuotes = await fetchSendleQuotes(
        sendleIntegration,
        tenant.location || 'Sydney', // Default pickup location
        destination,
        weightKg
      )
      quotes.push(...sendleQuotes)
    } catch (error) {
      console.error('Sendle quote error:', error)
      // Fall back to flat rates
    }
  }

  // Add flat rate options from shipping config or profiles
  if (tenant.shippingConfig?.methods) {
    for (const method of tenant.shippingConfig.methods) {
      if (!method.enabled) continue

      // Check country restriction
      if (method.countries.length > 0 && !method.countries.includes(destination.country)) {
        continue
      }

      quotes.push({
        id: method.id,
        carrier: 'store',
        service: method.name,
        price: Math.round(method.price * 100), // Convert to cents
        currency: method.currency || 'AUD',
        estimatedDays: method.estimatedDays,
      })
    }
  }

  // Add rates from shipping profiles (flat and weight-based)
  for (const profile of profiles) {
    if (profile.domesticOnly && destination.country !== 'AU') continue

    if (profile.maxWeight && weightKg > profile.maxWeight) continue

    let price: number | null = null

    if (profile.rateType === 'flat' && profile.flatRate !== undefined) {
      price = Math.round(profile.flatRate * 100)
    } else if (profile.rateType === 'weight' && profile.weightRates) {
      // Find matching weight tier
      const tier = profile.weightRates.find(
        r => weightKg >= r.minWeight && weightKg <= r.maxWeight
      )
      if (tier) {
        price = Math.round(tier.rate * 100)
      }
    }

    if (price !== null) {
      quotes.push({
        id: profile.id,
        carrier: profile.carrier,
        service: profile.name,
        price,
        currency: 'AUD',
        estimatedDays: { min: 3, max: 7 }, // Default estimate for manual profiles
      })
    }
  }

  // Add local pickup if enabled
  if (tenant.shippingConfig?.localPickupEnabled) {
    quotes.push({
      id: 'local-pickup',
      carrier: 'store',
      service: 'Local Pickup',
      price: 0,
      currency: 'AUD',
      estimatedDays: { min: 1, max: 2 },
      features: ['Free', 'No delivery required'],
    })
  }

  // If no quotes available, add default options
  if (quotes.length === 0) {
    quotes.push(
      {
        id: 'default-standard',
        carrier: 'store',
        service: 'Standard Shipping',
        price: 995, // $9.95
        currency: 'AUD',
        estimatedDays: { min: 5, max: 10 },
      },
      {
        id: 'default-express',
        carrier: 'store',
        service: 'Express Shipping',
        price: 1995, // $19.95
        currency: 'AUD',
        estimatedDays: { min: 2, max: 3 },
        features: ['Priority handling', 'Faster delivery'],
      }
    )
  }

  return quotes
}

async function fetchSendleQuotes(
  integration: { apiKey: string; sendleId: string; sandbox?: boolean },
  pickupLocation: string,
  destination: ShippingQuoteRequest['destination'],
  weightKg: number
): Promise<ShippingQuoteResponse[]> {
  // Parse pickup location - this is a simplified approach
  // In production, you'd want to store structured pickup address
  const pickupPostcode = pickupLocation.match(/\d{4}/)?.[0] || '2000'
  const pickupSuburb = pickupLocation.replace(/\d{4}/, '').trim() || 'Sydney'

  // Create Sendle config
  const config: SendleConfig = {
    sendleId: integration.sendleId,
    apiKey: integration.apiKey,
    sandbox: integration.sandbox,
  }

  const params: QuoteParams = {
    pickupSuburb,
    pickupPostcode,
    deliverySuburb: destination.suburb,
    deliveryPostcode: destination.postcode,
    weight: weightKg,
  }

  const sendleQuotes = await Sendle.getQuote(config, params)

  return sendleQuotes.map((quote: SendleQuote) => ({
    id: quote.quote_id || `sendle-${quote.plan_name}`,
    carrier: 'sendle',
    service: quote.plan_name,
    price: Math.round(quote.price.gross.amount * 100), // Convert to cents
    currency: quote.price.gross.currency,
    estimatedDays: {
      min: quote.eta.days_range[0],
      max: quote.eta.days_range[1],
    },
    features: [quote.route.description],
  }))
}
