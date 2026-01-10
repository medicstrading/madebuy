/**
 * Marketplace Integration Types
 *
 * Types for connecting MadeBuy to external marketplaces (eBay, Etsy, etc.)
 * Handles OAuth connections, listing sync, inventory sync, and order import.
 */

/**
 * Supported marketplace platforms
 */
export type MarketplacePlatform = 'ebay' | 'etsy'

/**
 * Status of a marketplace connection
 */
export type MarketplaceConnectionStatus =
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'pending'

/**
 * OAuth connection to a marketplace
 */
export interface MarketplaceConnection {
  id: string
  tenantId: string
  marketplace: MarketplacePlatform

  // OAuth tokens (stored encrypted)
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date

  // Marketplace-specific identifiers
  sellerId?: string // eBay user ID or Etsy shop ID
  shopName?: string // Display name of the connected shop

  // Connection state
  status: MarketplaceConnectionStatus
  lastError?: string
  lastSyncAt?: Date

  // Scopes granted
  scopes?: string[]

  createdAt: Date
  updatedAt: Date
}

/**
 * Status of a marketplace listing
 */
export type MarketplaceListingStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'ended'
  | 'error'
  | 'out_of_stock'

/**
 * A MadeBuy piece listed on an external marketplace
 */
export interface MarketplaceListing {
  id: string
  tenantId: string
  pieceId: string
  marketplace: MarketplacePlatform

  // External listing identifiers
  externalListingId: string
  externalUrl?: string

  // Sync state
  status: MarketplaceListingStatus
  lastSyncedAt?: Date
  syncError?: string

  // Marketplace-specific data
  marketplaceData?: {
    // eBay specific
    ebayItemId?: string
    ebayOfferId?: string
    ebayInventoryItemSku?: string

    // Etsy specific
    etsyListingId?: number
    etsyState?: string

    // Common
    categoryId?: string
    categoryPath?: string[]
    fees?: {
      listingFee?: number
      finalValueFee?: number
      currency?: string
    }
  }

  // Price/inventory at time of last sync
  lastSyncedPrice?: number
  lastSyncedQuantity?: number

  createdAt: Date
  updatedAt: Date
}

/**
 * Status of a marketplace order
 */
export type MarketplaceOrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded'

/**
 * An order imported from a marketplace
 */
export interface MarketplaceOrder {
  id: string
  tenantId: string
  marketplace: MarketplacePlatform

  // External order identifiers
  externalOrderId: string
  externalUrl?: string

  // Order status
  status: MarketplaceOrderStatus
  paymentStatus: 'pending' | 'paid' | 'refunded'

  // Buyer information
  buyer: {
    name: string
    email?: string
    username?: string // Marketplace username
  }

  // Shipping address
  shippingAddress?: {
    name: string
    street1: string
    street2?: string
    city: string
    state?: string
    postalCode: string
    country: string
    phone?: string
  }

  // Order items
  items: MarketplaceOrderItem[]

  // Totals
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  currency: string

  // Marketplace fees
  marketplaceFees?: number

  // Timestamps
  orderDate: Date
  paidAt?: Date
  shippedAt?: Date

  // Link to MadeBuy order (if created)
  linkedOrderId?: string

  // Raw marketplace response (for debugging)
  rawData?: Record<string, unknown>

  // Stock sync errors (if stock couldn't be decremented for linked pieces)
  stockSyncErrors?: Array<{
    pieceId: string
    error: string
  }>

  importedAt: Date
  updatedAt: Date
}

/**
 * An item within a marketplace order
 */
export interface MarketplaceOrderItem {
  id: string
  externalItemId: string

  // Link to MadeBuy entities
  pieceId?: string
  marketplaceListingId?: string

  // Item details
  title: string
  sku?: string
  quantity: number
  unitPrice: number
  totalPrice: number

  // Variation/options selected
  variations?: Array<{
    name: string
    value: string
  }>

  // Personalization
  personalization?: string
}

// =============================================================================
// Input types for creating/updating
// =============================================================================

export interface CreateMarketplaceConnectionInput {
  marketplace: MarketplacePlatform
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  sellerId?: string
  shopName?: string
  scopes?: string[]
}

export interface UpdateMarketplaceConnectionInput {
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  status?: MarketplaceConnectionStatus
  lastError?: string
  lastSyncAt?: Date
}

export interface CreateMarketplaceListingInput {
  pieceId: string
  marketplace: MarketplacePlatform
  externalListingId: string
  externalUrl?: string
  status?: MarketplaceListingStatus
  marketplaceData?: MarketplaceListing['marketplaceData']
}

export interface UpdateMarketplaceListingInput {
  externalUrl?: string
  status?: MarketplaceListingStatus
  syncError?: string
  lastSyncedAt?: Date
  lastSyncedPrice?: number
  lastSyncedQuantity?: number
  marketplaceData?: MarketplaceListing['marketplaceData']
}

export interface CreateMarketplaceOrderInput {
  marketplace: MarketplacePlatform
  externalOrderId: string
  externalUrl?: string
  status: MarketplaceOrderStatus
  paymentStatus: MarketplaceOrder['paymentStatus']
  buyer: MarketplaceOrder['buyer']
  shippingAddress?: MarketplaceOrder['shippingAddress']
  items: Omit<MarketplaceOrderItem, 'id'>[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  marketplaceFees?: number
  orderDate: Date
  paidAt?: Date
  rawData?: Record<string, unknown>
  stockSyncErrors?: MarketplaceOrder['stockSyncErrors']
}

// =============================================================================
// Filter/query types
// =============================================================================

export interface MarketplaceListingFilters {
  marketplace?: MarketplacePlatform
  pieceId?: string
  status?: MarketplaceListingStatus | MarketplaceListingStatus[]
}

export interface MarketplaceOrderFilters {
  marketplace?: MarketplacePlatform
  status?: MarketplaceOrderStatus | MarketplaceOrderStatus[]
  fromDate?: Date
  toDate?: Date
}

// =============================================================================
// OAuth types
// =============================================================================

export interface MarketplaceOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface MarketplaceOAuthState {
  tenantId: string
  marketplace: MarketplacePlatform
  returnUrl?: string
  nonce: string
  createdAt: Date
  /**
   * PKCE code verifier for OAuth flows that require it (e.g., Etsy).
   * Stored securely in the database, NOT in the URL state parameter.
   */
  codeVerifier?: string
}

export interface MarketplaceTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
  scopes?: string[]
}

// =============================================================================
// Sync types
// =============================================================================

export interface ListingSyncResult {
  success: boolean
  listingId?: string
  externalListingId?: string
  externalUrl?: string
  error?: string
}

export interface InventorySyncResult {
  success: boolean
  syncedCount: number
  errors: Array<{
    listingId: string
    error: string
  }>
}

export interface OrderImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errors: Array<{
    externalOrderId: string
    error: string
  }>
}

// =============================================================================
// Platform-specific types
// =============================================================================

/**
 * eBay-specific configuration
 */
export interface EbayConfig {
  environment: 'sandbox' | 'production'
  siteId: string // e.g., 'EBAY_AU' for Australia
  marketplaceId: string // e.g., 'EBAY_AU'
}

/**
 * Etsy-specific configuration
 */
export interface EtsyConfig {
  // Etsy doesn't have environment switching like eBay
  shopId?: number
}

// =============================================================================
// Display labels and helpers
// =============================================================================

export const MARKETPLACE_LABELS: Record<MarketplacePlatform, string> = {
  ebay: 'eBay',
  etsy: 'Etsy',
}

export const MARKETPLACE_LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  ended: 'Ended',
  error: 'Error',
  out_of_stock: 'Out of Stock',
}

export const MARKETPLACE_ORDER_STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

/**
 * Feature availability per marketplace
 */
export const MARKETPLACE_FEATURES: Record<
  MarketplacePlatform,
  {
    available: boolean
    comingSoon: boolean
    supportsVariations: boolean
    supportsDigital: boolean
    supportsPersonalization: boolean
  }
> = {
  ebay: {
    available: true,
    comingSoon: false,
    supportsVariations: true,
    supportsDigital: false,
    supportsPersonalization: false,
  },
  etsy: {
    available: false,
    comingSoon: true,
    supportsVariations: true,
    supportsDigital: true,
    supportsPersonalization: true,
  },
}
