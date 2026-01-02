/**
 * Shipping Types
 * Australian-focused shipping with Sendle integration
 */

import type { Address } from './order'

// ============================================================================
// Core Types
// ============================================================================

export type ShippingCarrier = 'sendle' | 'auspost' | 'manual'

export type ShipmentStatus =
  | 'pending'           // Order placed, not yet shipped
  | 'booked'            // Label created, awaiting pickup
  | 'label_created'     // Alias for booked (backwards compat)
  | 'picked_up'         // Carrier has package
  | 'in_transit'        // On the way
  | 'out_for_delivery'  // Final delivery attempt
  | 'delivered'         // Successfully delivered
  | 'failed'            // Delivery failed
  | 'returned'          // Returned to sender

export type ShippingRateType = 'calculated' | 'flat' | 'free'

// ============================================================================
// Shipping Address
// ============================================================================

/**
 * Shipping Address - complete address with contact details
 */
export interface ShippingAddress {
  name: string
  company?: string
  line1: string
  line2?: string
  city: string
  state: string
  postcode: string
  country: string                 // ISO country code (AU, NZ, US, etc.)
  phone?: string
  email?: string
  instructions?: string           // Delivery instructions
}

// ============================================================================
// Shipping Zones
// ============================================================================

/**
 * Shipping Zone - defines rates for geographic regions
 */
export interface ShippingZone {
  id: string
  name: string                    // e.g., "Australia", "New Zealand", "International"
  countries: string[]             // ISO country codes: ['AU'], ['NZ'], ['US', 'CA', 'GB']
  states?: string[]               // Optional state filtering for AU (e.g., ['QLD', 'NSW'])
  postcodes?: string[]            // Optional postcode prefixes (e.g., ['4000', '4001'])
  additionalCharge?: number       // Extra fee in cents (on top of base rate)
  deliveryEstimateDays?: {
    min: number
    max: number
  }
}

// ============================================================================
// Shipping Profile
// ============================================================================

/**
 * Weight-based rate tier
 */
export interface WeightRate {
  minWeight: number               // In grams
  maxWeight: number               // In grams
  rate: number                    // In cents
}

/**
 * Shipping Profile - seller's shipping configuration
 */
export interface ShippingProfile {
  id: string
  tenantId: string
  name: string                    // "Standard Shipping", "Express", "Free Shipping Over $50"
  isDefault: boolean

  // Shipping method
  method?: ShippingRateType
  carrier: ShippingCarrier        // Required for all profiles

  // Flat rate config
  flatRate?: number               // In cents

  // Free shipping config
  freeThreshold?: number          // Free shipping over $X (in cents), 0 = always free

  // Processing time (business days to prepare order before shipping)
  processingDays?: number

  // Zones - geographic rate configuration
  zones?: ShippingZone[]

  // Package defaults for quoting
  defaultPackage?: {
    weightGrams: number
    lengthCm: number
    widthCm: number
    heightCm: number
  }

  // Status
  isActive?: boolean

  // Legacy fields for backwards compatibility
  rateType: 'flat' | 'weight' | 'calculated'
  weightRates?: WeightRate[]
  freeShippingThreshold?: number
  domesticOnly: boolean
  maxWeight?: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Tracking
// ============================================================================

/**
 * Shipment Tracking Event from carrier
 * (Named ShipmentTrackingEvent to avoid conflict with click tracking TrackingEvent)
 */
export interface ShipmentTrackingEvent {
  id?: string
  timestamp: Date
  status: ShipmentStatus | string // Carrier's status code
  description: string             // Human-readable description
  location?: string               // Location if available
  rawEventType?: string           // Original carrier event type
  rawData?: Record<string, unknown> // Original carrier data
}

/**
 * Alias for backwards compatibility
 * @deprecated Use ShipmentTrackingEvent instead
 */
export type TrackingEvent = ShipmentTrackingEvent

// ============================================================================
// Shipment
// ============================================================================

/**
 * Package dimensions for a shipment
 */
export interface ShipmentDimensions {
  length: number
  width: number
  height: number
}

/**
 * Shipment package with weight
 */
export interface ShipmentPackage {
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

/**
 * Shipment - individual shipment record
 */
export interface Shipment {
  id: string
  tenantId: string
  orderId: string
  orderNumber?: string

  // Carrier info
  carrier: ShippingCarrier
  carrierReference?: string       // Carrier's internal ID (e.g., Sendle order ID)
  trackingNumber?: string
  trackingUrl?: string

  // Status
  status: ShipmentStatus
  statusUpdatedAt?: Date

  // Label
  labelUrl?: string
  labelGeneratedAt?: Date

  // Package details - supports both new and legacy formats
  package?: ShipmentPackage
  weight?: number                 // Legacy: weight in grams
  dimensions?: ShipmentDimensions // Legacy: dimensions

  // Addresses
  senderAddress?: ShippingAddress
  recipientAddress?: ShippingAddress

  // Costs (all in cents)
  shippingCost?: number           // What customer paid
  carrierCost?: number            // What we paid carrier (for margin tracking)

  // Tracking history
  trackingEvents?: ShipmentTrackingEvent[]

  // Pickup
  pickupScheduled?: Date
  pickupConfirmed?: Date

  // Delivery estimates
  estimatedDelivery?: Date
  estimatedDeliveryDate?: Date    // Legacy alias
  estimatedDeliveryRange?: [Date, Date]

  // Actual delivery
  actualDelivery?: Date

  // Notes
  sellerNotes?: string

  // Notification preferences
  notifyOnShipped?: boolean
  notifyOnOutForDelivery?: boolean
  notifyOnDelivered?: boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
  shippedAt?: Date
  pickedUpAt?: Date
  outForDeliveryAt?: Date
  deliveredAt?: Date
  failedAt?: Date

  // Legacy fields
  sendleOrderId?: string
}

// ============================================================================
// Shipping Quote
// ============================================================================

/**
 * Shipping Quote - rate from carrier or calculated
 */
export interface ShippingQuote {
  carrier: ShippingCarrier
  service: string                 // "Standard", "Express", "Satchel", etc.
  serviceCode?: string            // Carrier's internal service code
  price: number                   // In cents
  currency: string                // ISO currency code (AUD)
  estimatedDays: {
    min: number
    max: number
  }
  pickupDate?: Date               // Next available pickup
  features?: string[]             // ["tracking", "signature", "insurance"]
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Create shipment input
 */
export interface CreateShipmentInput {
  orderId: string
  orderNumber?: string
  carrier: ShippingCarrier
  package?: ShipmentPackage
  senderAddress?: ShippingAddress
  recipientAddress?: ShippingAddress
  shippingCost?: number
  sellerNotes?: string
  // Legacy fields
  weight?: number
  dimensions?: ShipmentDimensions
}

/**
 * Create shipping profile input
 */
export interface CreateShippingProfileInput {
  name: string
  method?: ShippingRateType
  carrier: ShippingCarrier
  flatRate?: number
  freeThreshold?: number
  processingDays?: number
  zones?: Omit<ShippingZone, 'id'>[]
  defaultPackage?: ShippingProfile['defaultPackage']
  isDefault?: boolean
  // Legacy fields
  rateType?: 'flat' | 'weight' | 'calculated'
  weightRates?: WeightRate[]
  freeShippingThreshold?: number
  domesticOnly?: boolean
  maxWeight?: number
}

/**
 * Update shipping profile input
 */
export interface UpdateShippingProfileInput extends Partial<CreateShippingProfileInput> {
  isActive?: boolean
}

/**
 * Legacy shipping profile input (backwards compatibility)
 */
export interface ShippingProfileInput {
  name: string
  carrier: ShippingCarrier
  isDefault?: boolean
  rateType: 'flat' | 'weight' | 'calculated'
  flatRate?: number
  weightRates?: WeightRate[]
  freeShippingThreshold?: number
  domesticOnly?: boolean
  maxWeight?: number
}

/**
 * Create label input for carrier API
 */
export interface CreateLabelInput {
  pickupAddress: Address | ShippingAddress
  deliveryAddress: Address | ShippingAddress
  weight: number                  // In grams
  dimensions?: ShipmentDimensions
  description: string             // Package contents description
  customerReference: string       // Order number
}

// ============================================================================
// Filters
// ============================================================================

/**
 * Shipment filters for listing
 */
export interface ShipmentFilters {
  status?: ShipmentStatus | ShipmentStatus[]
  carrier?: ShippingCarrier
  dateFrom?: Date
  dateTo?: Date
  search?: string                 // Order number or tracking number
  // Legacy filters
  orderId?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number
  offset?: number
  cursor?: string
}

// ============================================================================
// Stats & Analytics
// ============================================================================

/**
 * Shipment statistics for dashboard
 */
export interface ShipmentStats {
  total: number
  byStatus: Partial<Record<ShipmentStatus, number>>
  byCarrier: Partial<Record<ShippingCarrier, number>>
  avgDeliveryDays: number
  onTimeDeliveryRate: number      // Percentage (0-100)
  totalShippingRevenue: number    // What customers paid (cents)
  totalCarrierCost: number        // What was paid to carriers (cents)
}

// ============================================================================
// Sendle API Types (Australian carrier)
// ============================================================================

export interface SendleQuote {
  quote_id: string
  plan_name: string
  price: {
    gross: { amount: number; currency: string }
    net: { amount: number; currency: string }
    tax: { amount: number; currency: string }
  }
  eta: {
    days_range: [number, number]
    date_range: [string, string]
    for_pickup_date: string
  }
  route: {
    type: string
    description: string
  }
}

export interface SendleOrder {
  order_id: string
  order_url: string
  state: string
  tracking_url: string
  labels?: SendleLabel[]
  customer_reference?: string
  sender?: SendleContact
  receiver?: SendleContact
  weight?: {
    value: number
    units: string
  }
}

export interface SendleLabel {
  format: string                  // "pdf", "zpl"
  size: string                    // "a4", "cropped"
  url: string
}

export interface SendleContact {
  contact?: {
    name?: string
    phone?: string
    email?: string
    company?: string
  }
  address?: {
    address_line1?: string
    address_line2?: string
    suburb?: string
    postcode?: string
    state_name?: string
    country?: string
  }
}

export interface SendleTracking {
  state: string
  tracking_events: SendleTrackingEvent[]
}

export interface SendleTrackingEvent {
  event_type: string
  scan_time: string
  description: string
  reason?: string
  location?: string
}

/**
 * Sendle credentials stored in tenant integrations
 */
export interface SendleIntegration {
  apiKey: string
  sendleId: string
  sandbox?: boolean
  connectedAt: Date
}

/**
 * Sendle webhook payload
 */
export interface SendleWebhookPayload {
  event_type: 'tracking_update' | 'order_update'
  order_id: string
  order_url: string
  state: string
  tracking_url?: string
  description?: string
  delivery_date?: string
  estimated_delivery_date?: string
  scheduling_info?: {
    pickup_date?: string
    delivery_date?: string
    eta?: {
      days_range?: [number, number]
      date_range?: [string, string]
    }
  }
  tracking_events?: SendleTrackingEvent[]
  metadata?: {
    customer_reference?: string
  }
}

// ============================================================================
// Public Tracking
// ============================================================================

/**
 * Public tracking response (privacy-conscious)
 * Only exposes necessary information for tracking
 */
export interface PublicTrackingResponse {
  trackingNumber: string
  carrier: ShippingCarrier
  carrierName: string
  status: ShipmentStatus
  statusMessage: string
  estimatedDelivery?: string
  estimatedDeliveryRange?: [string, string]
  events: Array<{
    timestamp: string
    status: ShipmentStatus
    description: string
    location?: string
  }>
  shop: {
    name: string
    slug: string
  }
  orderNumberLast4: string // Only last 4 chars for privacy
  carrierTrackingUrl?: string
}

// ============================================================================
// Constants & Maps
// ============================================================================

/**
 * Map Sendle states to our shipment statuses
 */
export const SENDLE_STATUS_MAP: Record<string, ShipmentStatus> = {
  'Booked': 'booked',
  'Pickup': 'picked_up',
  'Pickup Attempted': 'picked_up',
  'Transit': 'in_transit',
  'In Transit': 'in_transit',
  'Local Delivery': 'in_transit',
  'Out for Delivery': 'out_for_delivery',
  'Card Left': 'failed',
  'Delivered': 'delivered',
  'Returned': 'returned',
  'Return to Sender': 'returned',
  'Cancelled': 'failed',
}

/**
 * Human-readable status messages
 */
export const SHIPMENT_STATUS_MESSAGES: Record<ShipmentStatus, string> = {
  pending: 'Your order is being prepared',
  booked: 'Shipping label created, awaiting pickup',
  label_created: 'Shipping label created, awaiting pickup',
  picked_up: 'Package picked up by carrier',
  in_transit: 'On the way to you',
  out_for_delivery: 'Out for delivery today!',
  delivered: 'Delivered!',
  failed: 'Delivery unsuccessful - see details',
  returned: 'Package returned to sender',
}

/**
 * Carrier display names
 */
export const CARRIER_NAMES: Record<ShippingCarrier, string> = {
  sendle: 'Sendle',
  auspost: 'Australia Post',
  manual: 'Standard Shipping',
}

/**
 * Australian states and territories
 */
export const AU_STATES = [
  'ACT',  // Australian Capital Territory
  'NSW',  // New South Wales
  'NT',   // Northern Territory
  'QLD',  // Queensland
  'SA',   // South Australia
  'TAS',  // Tasmania
  'VIC',  // Victoria
  'WA',   // Western Australia
] as const

export type AustralianState = typeof AU_STATES[number]

/**
 * Default shipping zones for Australian sellers
 */
export const DEFAULT_AU_ZONES: Omit<ShippingZone, 'id'>[] = [
  {
    name: 'Australia Metro',
    countries: ['AU'],
    deliveryEstimateDays: { min: 2, max: 5 },
  },
  {
    name: 'Australia Regional',
    countries: ['AU'],
    additionalCharge: 500, // $5 extra
    deliveryEstimateDays: { min: 4, max: 8 },
  },
  {
    name: 'New Zealand',
    countries: ['NZ'],
    additionalCharge: 1500, // $15 extra
    deliveryEstimateDays: { min: 5, max: 10 },
  },
  {
    name: 'International',
    countries: ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'SG', 'HK'],
    additionalCharge: 2500, // $25 extra
    deliveryEstimateDays: { min: 7, max: 21 },
  },
]
