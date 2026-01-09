/**
 * Shipping utilities for checkout
 */

import type { CartItem } from '@/contexts/CartContext'

// Types for shipping
export interface ShippingAddress {
  name: string
  phone?: string
  email?: string
  line1: string
  line2?: string
  suburb: string
  state: string
  postcode: string
  country: string
  deliveryInstructions?: string
}

export interface ShippingQuote {
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

export interface AddressValidationResult {
  valid: boolean
  suggestions?: Partial<ShippingAddress>[]
  errors?: string[]
  warnings?: string[]
}

export interface QuoteResponse {
  quotes: ShippingQuote[]
  freeShippingEligible: boolean
  freeShippingThreshold?: number
  amountUntilFreeShipping?: number
}

// Australian states for dropdown
export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'ACT', name: 'Australian Capital Territory' },
] as const

// Supported countries
export const SUPPORTED_COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
] as const

// Default weight in grams for items without specified weight
const DEFAULT_ITEM_WEIGHT_GRAMS = 250

/**
 * Check if order needs physical shipping
 * Returns false for digital-only orders
 */
export function requiresShipping(items: CartItem[]): boolean {
  // Check if any item is NOT a digital product
  return items.some(item => {
    const isDigital = (item.product as any).isDigital || (item.product as any).digitalConfig
    return !isDigital
  })
}

/**
 * Check if all items in cart are digital products
 */
export function isDigitalOnlyOrder(items: CartItem[]): boolean {
  return items.every(item => {
    const isDigital = (item.product as any).isDigital || (item.product as any).digitalConfig
    return isDigital
  })
}

/**
 * Calculate total weight of cart items in grams
 */
export function calculateTotalWeight(items: CartItem[]): number {
  return items.reduce((total, item) => {
    const weight = (item.product as any).weightGrams ?? DEFAULT_ITEM_WEIGHT_GRAMS
    return total + weight * item.quantity
  }, 0)
}

/**
 * Validate shipping address
 */
export async function validateShippingAddress(
  address: ShippingAddress
): Promise<AddressValidationResult> {
  try {
    const response = await fetch('/api/shipping/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address),
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        valid: false,
        errors: [error.error || 'Failed to validate address'],
      }
    }

    return await response.json()
  } catch (error) {
    console.error('Address validation error:', error)
    return {
      valid: false,
      errors: ['Unable to validate address. Please check your connection and try again.'],
    }
  }
}

/**
 * Get shipping quotes from API
 */
export async function getShippingQuotes(
  tenantId: string,
  items: CartItem[],
  destination: Pick<ShippingAddress, 'postcode' | 'suburb' | 'state' | 'country'>
): Promise<QuoteResponse> {
  try {
    const response = await fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        items: items.map(item => ({
          pieceId: item.product.id,
          quantity: item.quantity,
          weightGrams: (item.product as any).weightGrams,
          price: item.product.price ? Math.round(item.product.price * 100) : undefined, // Price in cents
        })),
        destination: {
          postcode: destination.postcode,
          suburb: destination.suburb,
          state: destination.state,
          country: destination.country,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get shipping quotes')
    }

    return await response.json()
  } catch (error) {
    console.error('Shipping quotes error:', error)
    throw error
  }
}

/**
 * Format delivery estimate as human-readable string
 */
export function formatDeliveryEstimate(quote: ShippingQuote): string {
  const { min, max } = quote.estimatedDays

  if (min === max) {
    return min === 1 ? '1 business day' : `${min} business days`
  }

  // Calculate actual delivery dates
  const today = new Date()
  const minDate = addBusinessDays(today, min)
  const maxDate = addBusinessDays(today, max)

  // If dates are within the same month, format as "Dec 15-18"
  if (minDate.getMonth() === maxDate.getMonth()) {
    const month = minDate.toLocaleDateString('en-AU', { month: 'short' })
    return `${month} ${minDate.getDate()}-${maxDate.getDate()}`
  }

  // Otherwise show range like "Dec 28 - Jan 3"
  const minFormatted = minDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
  const maxFormatted = maxDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
  return `${minFormatted} - ${maxFormatted}`
}

/**
 * Format delivery estimate as simple range
 */
export function formatDeliveryDays(quote: ShippingQuote): string {
  const { min, max } = quote.estimatedDays

  if (min === max) {
    return min === 1 ? '1 day' : `${min} days`
  }

  return `${min}-${max} business days`
}

/**
 * Add business days to a date (skip weekends)
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let daysAdded = 0

  while (daysAdded < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}

/**
 * Format shipping price for display
 */
export function formatShippingPrice(priceInCents: number, currency: string = 'AUD'): string {
  if (priceInCents === 0) {
    return 'FREE'
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(priceInCents / 100)
}

/**
 * Get state name from code
 */
export function getStateName(stateCode: string): string {
  const state = AUSTRALIAN_STATES.find(s => s.code === stateCode)
  return state?.name || stateCode
}

/**
 * Get country name from code
 */
export function getCountryName(countryCode: string): string {
  const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode)
  return country?.name || countryCode
}

/**
 * Validate postcode format for a given country
 */
export function isValidPostcode(postcode: string, country: string): boolean {
  const trimmed = postcode.trim()

  switch (country.toUpperCase()) {
    case 'AU':
    case 'NZ':
      return /^\d{4}$/.test(trimmed)
    case 'US':
      return /^\d{5}(-\d{4})?$/.test(trimmed)
    case 'GB':
      return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(trimmed)
    default:
      return trimmed.length > 0
  }
}

/**
 * Check if postcode matches the selected Australian state
 */
export function isPostcodeInState(postcode: string, stateCode: string): boolean {
  if (!/^\d{4}$/.test(postcode)) return false

  const postcodeNum = parseInt(postcode, 10)

  const stateRanges: Record<string, { min: number; max: number }[]> = {
    NSW: [
      { min: 1000, max: 1999 },
      { min: 2000, max: 2599 },
      { min: 2619, max: 2899 },
      { min: 2921, max: 2999 },
    ],
    ACT: [
      { min: 200, max: 299 },
      { min: 2600, max: 2618 },
      { min: 2900, max: 2920 },
    ],
    VIC: [
      { min: 3000, max: 3999 },
      { min: 8000, max: 8999 },
    ],
    QLD: [
      { min: 4000, max: 4999 },
      { min: 9000, max: 9999 },
    ],
    SA: [
      { min: 5000, max: 5799 },
      { min: 5800, max: 5999 },
    ],
    WA: [
      { min: 6000, max: 6797 },
      { min: 6800, max: 6999 },
    ],
    TAS: [
      { min: 7000, max: 7799 },
      { min: 7800, max: 7999 },
    ],
    NT: [
      { min: 800, max: 899 },
      { min: 900, max: 999 },
    ],
  }

  const ranges = stateRanges[stateCode.toUpperCase()]
  if (!ranges) return true // Unknown state, don't validate

  return ranges.some(range => postcodeNum >= range.min && postcodeNum <= range.max)
}

/**
 * Lookup state from Australian postcode
 */
export function getStateFromPostcode(postcode: string): string | null {
  if (!/^\d{4}$/.test(postcode)) return null

  const postcodeNum = parseInt(postcode, 10)

  const stateRanges: Record<string, { min: number; max: number }[]> = {
    NSW: [
      { min: 1000, max: 1999 },
      { min: 2000, max: 2599 },
      { min: 2619, max: 2899 },
      { min: 2921, max: 2999 },
    ],
    ACT: [
      { min: 200, max: 299 },
      { min: 2600, max: 2618 },
      { min: 2900, max: 2920 },
    ],
    VIC: [
      { min: 3000, max: 3999 },
      { min: 8000, max: 8999 },
    ],
    QLD: [
      { min: 4000, max: 4999 },
      { min: 9000, max: 9999 },
    ],
    SA: [
      { min: 5000, max: 5799 },
      { min: 5800, max: 5999 },
    ],
    WA: [
      { min: 6000, max: 6797 },
      { min: 6800, max: 6999 },
    ],
    TAS: [
      { min: 7000, max: 7799 },
      { min: 7800, max: 7999 },
    ],
    NT: [
      { min: 800, max: 899 },
      { min: 900, max: 999 },
    ],
  }

  for (const [state, ranges] of Object.entries(stateRanges)) {
    if (ranges.some(range => postcodeNum >= range.min && postcodeNum <= range.max)) {
      return state
    }
  }

  return null
}

/**
 * Create empty shipping address
 */
export function createEmptyAddress(): ShippingAddress {
  return {
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'AU',
    deliveryInstructions: '',
  }
}

/**
 * Check if address has minimum required fields
 */
export function hasRequiredAddressFields(address: Partial<ShippingAddress>): boolean {
  return Boolean(
    address.line1?.trim() &&
    address.suburb?.trim() &&
    address.state?.trim() &&
    address.postcode?.trim() &&
    address.country?.trim()
  )
}
