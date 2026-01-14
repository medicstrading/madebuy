/**
 * Shared eBay marketplace utilities
 */
import eBayApi from 'ebay-api'

// ============================================================================
// eBay API Client (using ebay-api package)
// ============================================================================

/**
 * Create an eBay API client with proper configuration
 * Uses the ebay-api package which handles headers correctly
 */
export function createEbayClient(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): eBayApi {
  const isProduction = process.env.EBAY_ENVIRONMENT === 'production'

  const client = new eBayApi({
    appId: process.env.EBAY_CLIENT_ID!,
    certId: process.env.EBAY_CLIENT_SECRET!,
    sandbox: !isProduction,
    siteId: eBayApi.SiteId.EBAY_AU,
    marketplaceId: eBayApi.MarketplaceId.EBAY_AU,
    acceptLanguage: eBayApi.Locale.en_AU,
    contentLanguage: eBayApi.Locale.en_AU,
    autoRefreshToken: !!refreshToken, // Only auto-refresh if we have a refresh token
  })

  // Set the user's OAuth token with refresh token if available
  client.OAuth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'User Access Token',
    expires_in: expiresIn || 7200, // Default 2 hours if not specified
  })

  return client
}

/**
 * Get eBay API base URL based on environment
 */
export function getEbayApiUrl(path: string): string {
  const base =
    process.env.EBAY_ENVIRONMENT === 'production'
      ? 'https://api.ebay.com'
      : 'https://api.sandbox.ebay.com'
  return `${base}${path}`
}

/**
 * Common headers for eBay API requests
 * Note: Content-Language uses underscore format (en_AU not en-AU)
 */
export const EBAY_HEADERS = {
  'Content-Language': 'en_AU',
  'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
} as const

/**
 * Get eBay domain based on environment (for building URLs)
 */
export function getEbayDomain(): string {
  return process.env.EBAY_ENVIRONMENT === 'production'
    ? 'www.ebay.com.au'
    : 'sandbox.ebay.com.au'
}

// ============================================================================
// eBay API Types
// ============================================================================

/**
 * Weight specification for eBay inventory items
 */
export interface EbayWeight {
  value: number
  unit: 'OUNCE' | 'POUND' | 'GRAM' | 'KILOGRAM'
}

/**
 * Dimensions specification for eBay inventory items
 */
export interface EbayDimensions {
  length: number
  width: number
  height: number
  unit: 'INCH' | 'FEET' | 'CENTIMETER' | 'METER'
}

/**
 * Package weight and size for eBay inventory items
 */
export interface EbayPackageWeightAndSize {
  weight?: EbayWeight
  dimensions?: EbayDimensions
}

/**
 * Product details for eBay inventory items
 */
export interface EbayProduct {
  title: string
  description: string
  aspects?: Record<string, string[]>
  imageUrls?: string[]
}

/**
 * eBay Inventory Item payload for create/update operations
 */
export interface EbayInventoryItem {
  availability: {
    shipToLocationAvailability: {
      quantity: number
    }
  }
  condition: 'NEW' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'ACCEPTABLE' | 'FOR_PARTS_OR_NOT_WORKING'
  product: EbayProduct
  packageWeightAndSize?: EbayPackageWeightAndSize
}

/**
 * Price specification for eBay offers
 */
export interface EbayPrice {
  value: string
  currency: string
}

/**
 * Listing policies for eBay offers
 */
export interface EbayListingPolicies {
  fulfillmentPolicyId?: string
  paymentPolicyId?: string
  returnPolicyId?: string
}

/**
 * eBay Offer payload for create/update operations
 */
export interface EbayOffer {
  sku: string
  marketplaceId: string
  format: 'FIXED_PRICE' | 'AUCTION'
  categoryId: string
  listingPolicies: EbayListingPolicies
  pricingSummary: {
    price: EbayPrice
  }
  merchantLocationKey?: string
  listingDescription?: string
  availableQuantity?: number
}

/**
 * eBay API error response
 */
export interface EbayApiError {
  errors?: Array<{
    errorId: number
    domain: string
    category: string
    message: string
    longMessage?: string
    parameters?: Array<{ name: string; value: string }>
  }>
}

// ============================================================================
// eBay Order Types
// ============================================================================

/**
 * eBay order line item
 */
export interface EbayLineItem {
  lineItemId: string
  legacyItemId: string
  title: string
  quantity: number
  sku?: string
  lineItemCost?: { value: string }
}

/**
 * eBay order shipping address
 */
export interface EbayShippingAddress {
  fullName?: string
  contactAddress?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    stateOrProvince?: string
    postalCode?: string
    countryCode?: string
  }
}

/**
 * eBay order from Fulfillment API
 */
export interface EbayOrder {
  orderId: string
  creationDate: string
  orderFulfillmentStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'FULFILLED'
  orderPaymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'FULLY_REFUNDED' | 'PARTIALLY_REFUNDED'
  buyer?: {
    username?: string
    buyerRegistrationAddress?: {
      email?: string
    }
  }
  pricingSummary?: {
    total?: { value: string; currency: string }
    deliveryCost?: { value: string }
    tax?: { value: string }
  }
  totalFeeBasisAmount?: { value: string }
  lineItems?: EbayLineItem[]
  fulfillmentStartInstructions?: Array<{
    shippingStep?: {
      shipTo?: EbayShippingAddress
    }
  }>
}
