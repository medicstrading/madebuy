/**
 * POST /api/shipping/validate-address
 * Validate Australian shipping address format
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/rate-limit'

// Australian state postcode ranges
const STATE_POSTCODE_RANGES: Record<string, { min: number; max: number }[]> = {
  NSW: [
    { min: 1000, max: 1999 }, // Sydney GPO boxes
    { min: 2000, max: 2599 },
    { min: 2619, max: 2899 },
    { min: 2921, max: 2999 },
  ],
  ACT: [
    { min: 200, max: 299 }, // ACT PO boxes
    { min: 2600, max: 2618 },
    { min: 2900, max: 2920 },
  ],
  VIC: [
    { min: 3000, max: 3999 },
    { min: 8000, max: 8999 }, // VIC PO boxes
  ],
  QLD: [
    { min: 4000, max: 4999 },
    { min: 9000, max: 9999 }, // QLD PO boxes
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

// New Zealand postcode validation (4 digits, 0XXX to 9XXX)
const NZ_POSTCODE_RANGE = { min: 10, max: 9999 }

interface ShippingAddress {
  name?: string
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

interface ValidationResult {
  valid: boolean
  suggestions?: Partial<ShippingAddress>[]
  errors?: string[]
  warnings?: string[]
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = rateLimiters.api(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const address: ShippingAddress = await request.json()

    const result = validateAddress(address)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Address validation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate address' },
      { status: 500 }
    )
  }
}

function validateAddress(address: ShippingAddress): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field validation
  if (!address.line1?.trim()) {
    errors.push('Street address is required')
  }

  if (!address.suburb?.trim()) {
    errors.push('Suburb/City is required')
  }

  if (!address.state?.trim()) {
    errors.push('State is required')
  }

  if (!address.postcode?.trim()) {
    errors.push('Postcode is required')
  }

  if (!address.country?.trim()) {
    errors.push('Country is required')
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const country = address.country.toUpperCase()

  // Australian address validation
  if (country === 'AU') {
    const auValidation = validateAustralianAddress(address)
    errors.push(...auValidation.errors)
    warnings.push(...auValidation.warnings)
  }
  // New Zealand validation
  else if (country === 'NZ') {
    const nzValidation = validateNewZealandAddress(address)
    errors.push(...nzValidation.errors)
    warnings.push(...nzValidation.warnings)
  }
  // Other supported countries - basic validation only
  else if (country === 'US' || country === 'GB') {
    // Basic validation - just check postcode format
    if (country === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postcode)) {
      errors.push('Invalid US ZIP code format (should be 12345 or 12345-6789)')
    }
    if (country === 'GB' && !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(address.postcode)) {
      errors.push('Invalid UK postcode format')
    }
  } else {
    errors.push('Unsupported country. We currently ship to AU, NZ, US, and GB.')
  }

  // Address line validations
  if (address.line1.length > 100) {
    warnings.push('Address line 1 is unusually long')
  }

  if (address.line2 && address.line2.length > 100) {
    warnings.push('Address line 2 is unusually long')
  }

  // Phone validation (optional but validate format if provided)
  if (address.phone) {
    const cleanPhone = address.phone.replace(/[\s\-\(\)]/g, '')
    if (country === 'AU' && !/^(?:\+?61|0)[2-9]\d{8}$/.test(cleanPhone)) {
      warnings.push('Phone number format may be incorrect for Australia')
    }
  }

  // Email validation (optional but validate format if provided)
  if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
    warnings.push('Email address format appears invalid')
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

function validateAustralianAddress(address: ShippingAddress): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Postcode must be 4 digits
  const postcode = address.postcode.trim()
  if (!/^\d{4}$/.test(postcode)) {
    errors.push('Australian postcode must be 4 digits')
    return { errors, warnings }
  }

  const postcodeNum = parseInt(postcode, 10)

  // Validate state abbreviation
  const state = address.state.toUpperCase()
  const validStates = Object.keys(STATE_POSTCODE_RANGES)

  if (!validStates.includes(state)) {
    errors.push(`Invalid Australian state. Must be one of: ${validStates.join(', ')}`)
    return { errors, warnings }
  }

  // Check if postcode matches state
  const stateRanges = STATE_POSTCODE_RANGES[state]
  const postcodeMatchesState = stateRanges.some(
    range => postcodeNum >= range.min && postcodeNum <= range.max
  )

  if (!postcodeMatchesState) {
    // Find which state the postcode actually belongs to
    let expectedState: string | null = null
    for (const [stateCode, ranges] of Object.entries(STATE_POSTCODE_RANGES)) {
      if (ranges.some(range => postcodeNum >= range.min && postcodeNum <= range.max)) {
        expectedState = stateCode
        break
      }
    }

    if (expectedState) {
      errors.push(`Postcode ${postcode} is in ${expectedState}, not ${state}`)
    } else {
      errors.push(`Postcode ${postcode} is not a valid Australian postcode`)
    }
  }

  // Suburb validation (basic check - just ensure it's not empty and reasonable length)
  const suburb = address.suburb.trim()
  if (suburb.length < 2) {
    errors.push('Suburb name is too short')
  } else if (suburb.length > 50) {
    warnings.push('Suburb name is unusually long')
  }

  // Check for common PO Box patterns
  if (/^p\.?o\.?\s*box/i.test(address.line1)) {
    warnings.push('PO Box addresses may have delivery restrictions for some items')
  }

  return { errors, warnings }
}

function validateNewZealandAddress(address: ShippingAddress): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // NZ postcode must be 4 digits
  const postcode = address.postcode.trim()
  if (!/^\d{4}$/.test(postcode)) {
    errors.push('New Zealand postcode must be 4 digits')
    return { errors, warnings }
  }

  const postcodeNum = parseInt(postcode, 10)
  if (postcodeNum < NZ_POSTCODE_RANGE.min || postcodeNum > NZ_POSTCODE_RANGE.max) {
    errors.push('Invalid New Zealand postcode')
  }

  // NZ doesn't use states in the same way, but we can validate region
  // For simplicity, just ensure something is provided
  if (address.state.length < 2) {
    warnings.push('Please provide a region or city name')
  }

  return { errors, warnings }
}

// GET endpoint for state lookup by postcode
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postcode = searchParams.get('postcode')
  const country = searchParams.get('country') || 'AU'

  if (!postcode) {
    return NextResponse.json(
      { error: 'Postcode parameter is required' },
      { status: 400 }
    )
  }

  if (country.toUpperCase() === 'AU' && /^\d{4}$/.test(postcode)) {
    const postcodeNum = parseInt(postcode, 10)

    for (const [state, ranges] of Object.entries(STATE_POSTCODE_RANGES)) {
      if (ranges.some(range => postcodeNum >= range.min && postcodeNum <= range.max)) {
        return NextResponse.json({ state, country: 'AU' })
      }
    }
  }

  return NextResponse.json({ state: null, country })
}
