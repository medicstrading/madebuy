/**
 * Order - E-commerce orders for pieces
 */

import type { PersonalizationValue } from './piece'

export interface Order {
  id: string
  tenantId: string
  orderNumber: string // e.g., "MB-2025-0001"

  // Customer
  customerEmail: string
  customerName: string
  customerPhone?: string

  // Items
  items: OrderItem[]

  // Pricing
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string

  // Promotion
  promotionCode?: string
  promotionId?: string

  // Shipping
  shippingAddress: Address
  billingAddress?: Address
  shippingMethod: string
  shippingType: ShippingType

  // Payment
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentIntentId?: string
  stripeSessionId?: string

  // Payment tracking (Stripe references)
  stripePaymentIntentId?: string
  stripeChargeId?: string

  // PayPal references
  paypalOrderId?: string
  paypalCaptureId?: string

  // Fee breakdown (all amounts in cents)
  fees?: {
    stripe: number // Stripe processing fee
    platform: number // Always 0 for MadeBuy - our differentiator
    total: number // Total fees
  }
  netAmount?: number // What seller actually receives (total - fees)

  // Refund tracking
  refundedAmount?: number // Amount refunded in cents
  refundedAt?: Date // When the refund was processed
  refundId?: string // Stripe refund ID
  refundReason?: string // Refund reason from Stripe

  // UTM attribution for analytics
  trafficSource?: string
  trafficMedium?: string
  trafficCampaign?: string

  // Fulfillment
  status: OrderStatus
  trackingNumber?: string
  carrier?: string
  trackingUrl?: string

  // Sendle shipping integration
  sendleOrderId?: string // Sendle's internal order ID
  sendleReference?: string // Sendle tracking reference (e.g., SNDLE123)
  labelUrl?: string // URL to download shipping label PDF

  // Digital product delivery
  hasDigitalItems?: boolean // Order contains at least one digital product
  isDigitalOnly?: boolean // Order contains ONLY digital products (no shipping needed)
  digitalDeliveredAt?: Date // When download links were sent

  // Notes
  customerNotes?: string
  adminNotes?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  cancelledAt?: Date

  // Review request tracking
  reviewRequestSentAt?: Date
}

export interface OrderItem {
  pieceId: string
  name: string
  price: number
  quantity: number // Usually 1 for handmade items
  imageUrl?: string

  // Snapshot at time of order
  description?: string
  category: string

  // Variant info (if applicable)
  variantId?: string
  variantSku?: string
  variantAttributes?: Record<string, string> // e.g., { "Size": "M", "Color": "Blue" }

  // Personalization (for custom/made-to-order products)
  personalizations?: PersonalizationValue[]
  personalizationTotal?: number // Sum of all personalization price adjustments (cents)

  // Digital product fields
  isDigital?: boolean
  downloadRecordId?: string // Reference to download_records collection
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  postcode: string
  country: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentMethod = 'stripe' | 'paypal' | 'bank_transfer'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type ShippingType = 'domestic' | 'international' | 'local_pickup'

export interface CreateOrderInput {
  customerEmail: string
  customerName: string
  customerPhone?: string
  items: OrderItem[]
  shippingAddress: Address
  billingAddress?: Address
  shippingMethod: string
  shippingType: ShippingType
  promotionCode?: string
  customerNotes?: string
}

export interface UpdateOrderInput {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  trackingNumber?: string
  carrier?: string
  adminNotes?: string
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]
  paymentStatus?: PaymentStatus
  customerEmail?: string
  search?: string
  startDate?: Date
  endDate?: Date
}
