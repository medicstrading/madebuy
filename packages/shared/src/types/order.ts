/**
 * Order - E-commerce orders for pieces
 */

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

  // Fulfillment
  status: OrderStatus
  trackingNumber?: string
  carrier?: string

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
