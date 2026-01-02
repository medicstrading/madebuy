/**
 * Sendle Quotes API
 *
 * Get shipping quotes from Sendle
 * @see https://api.sendle.com/api/documentation/orders/getting_quotes
 */

import type { SendleClient } from './client'
import { dollarsToCents } from './client'

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SendleQuoteRequest {
  pickup_suburb: string
  pickup_postcode: string
  pickup_country: string // 'AU'
  delivery_suburb: string
  delivery_postcode: string
  delivery_country: string
  weight_value: number // kg
  weight_units: 'kg'
  volume_value?: number // cubic meters or cm3
  volume_units?: 'm3' | 'cm3'
}

export interface SendleQuoteResponse {
  quote_id?: string
  plan_name: string // "Sendle Standard", "Sendle Pro", "Sendle Premium"
  quote: {
    gross: {
      amount: number // dollars
      currency: string
    }
    net: {
      amount: number
      currency: string
    }
    tax: {
      amount: number
      currency: string
    }
  }
  eta: {
    days_range: [number, number]
    date_range: [string, string]
    for_pickup_date: string
  }
  route: {
    type: string // "standard", "metro", "remote"
    description: string
  }
}

// ============================================================================
// Application Types (prices in cents)
// ============================================================================

/**
 * Sendle shipping quote with prices converted to cents
 * Named with Sendle prefix to avoid conflict with generic ShippingQuote type
 */
export interface SendleShippingQuote {
  id?: string
  carrier: 'sendle'
  planName: string
  priceGrossCents: number
  priceNetCents: number
  taxCents: number
  currency: string
  estimatedDays: {
    min: number
    max: number
  }
  estimatedDelivery: {
    earliest: string
    latest: string
  }
  pickupDate: string
  routeType: string
  routeDescription: string
}

// ============================================================================
// Input Types
// ============================================================================

export interface GetQuotesInput {
  /** Origin suburb */
  pickupSuburb: string
  /** Origin postcode */
  pickupPostcode: string
  /** Origin country (default: AU) */
  pickupCountry?: string
  /** Destination suburb */
  deliverySuburb: string
  /** Destination postcode */
  deliveryPostcode: string
  /** Destination country (default: AU) */
  deliveryCountry?: string
  /** Weight in kg */
  weightKg: number
  /** Optional: dimensions in cm for volumetric pricing */
  dimensions?: {
    lengthCm: number
    widthCm: number
    heightCm: number
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get shipping quotes from Sendle
 *
 * @param client - Sendle API client
 * @param input - Quote request parameters
 * @returns Array of shipping quotes with prices in cents
 */
export async function getQuotes(
  client: SendleClient,
  input: GetQuotesInput
): Promise<SendleShippingQuote[]> {
  const params: Record<string, string> = {
    pickup_suburb: input.pickupSuburb,
    pickup_postcode: input.pickupPostcode,
    pickup_country: input.pickupCountry || 'AU',
    delivery_suburb: input.deliverySuburb,
    delivery_postcode: input.deliveryPostcode,
    delivery_country: input.deliveryCountry || 'AU',
    weight_value: input.weightKg.toString(),
    weight_units: 'kg',
  }

  // Add volume if dimensions provided
  if (input.dimensions) {
    const volumeCm3 =
      input.dimensions.lengthCm *
      input.dimensions.widthCm *
      input.dimensions.heightCm
    params.volume_value = volumeCm3.toString()
    params.volume_units = 'cm3'
  }

  const queryString = new URLSearchParams(params).toString()
  const response = await client.request<SendleQuoteResponse[]>(
    `/quote?${queryString}`,
    { method: 'GET' }
  )

  return response.map(mapQuoteResponse)
}

/**
 * Get the cheapest quote from available options
 */
export async function getCheapestQuote(
  client: SendleClient,
  input: GetQuotesInput
): Promise<SendleShippingQuote | null> {
  const quotes = await getQuotes(client, input)

  if (quotes.length === 0) {
    return null
  }

  return quotes.reduce((cheapest, quote) =>
    quote.priceGrossCents < cheapest.priceGrossCents ? quote : cheapest
  )
}

/**
 * Get the fastest quote from available options
 */
export async function getFastestQuote(
  client: SendleClient,
  input: GetQuotesInput
): Promise<SendleShippingQuote | null> {
  const quotes = await getQuotes(client, input)

  if (quotes.length === 0) {
    return null
  }

  return quotes.reduce((fastest, quote) =>
    quote.estimatedDays.max < fastest.estimatedDays.max ? quote : fastest
  )
}

// ============================================================================
// Helpers
// ============================================================================

function mapQuoteResponse(response: SendleQuoteResponse): SendleShippingQuote {
  return {
    id: response.quote_id,
    carrier: 'sendle',
    planName: response.plan_name,
    priceGrossCents: dollarsToCents(response.quote.gross.amount),
    priceNetCents: dollarsToCents(response.quote.net.amount),
    taxCents: dollarsToCents(response.quote.tax.amount),
    currency: response.quote.gross.currency,
    estimatedDays: {
      min: response.eta.days_range[0],
      max: response.eta.days_range[1],
    },
    estimatedDelivery: {
      earliest: response.eta.date_range[0],
      latest: response.eta.date_range[1],
    },
    pickupDate: response.eta.for_pickup_date,
    routeType: response.route.type,
    routeDescription: response.route.description,
  }
}
