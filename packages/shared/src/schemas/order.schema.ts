import { z } from 'zod'
import {
  CurrencyCodeSchema,
  EmailSchema,
  NonNegativeNumberSchema,
  ObjectIdSchema,
  PhoneSchema,
  PositiveNumberSchema,
  ShortTextSchema,
} from './common.schema'

/**
 * Order validation schemas
 */

// Order status enum
export const OrderStatusSchema = z.enum([
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'completed',
])

// Payment status enum
export const PaymentStatusSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
])

// Shipping address
export const ShippingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).toUpperCase(),
})

// Order item
export const OrderItemSchema = z.object({
  pieceId: ObjectIdSchema,
  pieceName: z.string().min(1).max(200),
  variantId: z.string().optional(),
  variantName: ShortTextSchema.optional(),
  quantity: z.number().int().min(1).max(100),
  price: PositiveNumberSchema,
  subtotal: PositiveNumberSchema,
  sku: ShortTextSchema.optional(),
  imageUrl: z.string().url().optional(),
  personalization: z
    .array(
      z.object({
        fieldName: ShortTextSchema,
        value: z.string().max(1000),
      }),
    )
    .optional(),
  personalizationTotal: NonNegativeNumberSchema.optional(),
})

// Shipping details
export const ShippingDetailsSchema = z.object({
  method: ShortTextSchema,
  cost: NonNegativeNumberSchema,
  carrier: ShortTextSchema.optional(),
  trackingNumber: ShortTextSchema.optional(),
  estimatedDelivery: z.date().optional(),
  actualDelivery: z.date().optional(),
})

// Payment details
export const PaymentDetailsSchema = z.object({
  method: z.enum(['card', 'paypal', 'bank_transfer', 'cash', 'other']),
  transactionId: ShortTextSchema.optional(),
  last4: z.string().length(4).optional(),
  brand: ShortTextSchema.optional(),
})

// Order pricing breakdown
export const OrderPricingSchema = z.object({
  subtotal: PositiveNumberSchema,
  shipping: NonNegativeNumberSchema,
  tax: NonNegativeNumberSchema.optional(),
  discount: NonNegativeNumberSchema.optional(),
  total: PositiveNumberSchema,
  currency: CurrencyCodeSchema,
})

// Create order input
export const CreateOrderSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerEmail: EmailSchema,
  customerPhone: PhoneSchema,
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(),
  items: z.array(OrderItemSchema).min(1).max(100),
  pricing: OrderPricingSchema,
  shipping: ShippingDetailsSchema.optional(),
  payment: PaymentDetailsSchema.optional(),
  notes: z.string().max(1000).optional(),
  source: z
    .enum(['shop', 'custom_domain', 'admin', 'marketplace'])
    .default('shop'),
  stripeSessionId: ShortTextSchema.optional(),
  stripePaymentIntentId: ShortTextSchema.optional(),
})

// Update order input
export const UpdateOrderSchema = z.object({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  shipping: ShippingDetailsSchema.partial().optional(),
  trackingNumber: ShortTextSchema.optional(),
  notes: z.string().max(1000).optional(),
})

// Ship order input
export const ShipOrderSchema = z.object({
  carrier: z.string().min(1).max(100),
  trackingNumber: z.string().min(1).max(200),
  estimatedDelivery: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

// Refund order input
export const RefundOrderSchema = z.object({
  amount: PositiveNumberSchema,
  reason: z.string().min(1).max(500),
  refundShipping: z.boolean().default(false),
})

// Order filters
export const OrderFiltersSchema = z.object({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
})

// Inferred types
export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>
export type OrderItem = z.infer<typeof OrderItemSchema>
export type ShippingDetails = z.infer<typeof ShippingDetailsSchema>
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>
export type OrderPricing = z.infer<typeof OrderPricingSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>
export type ShipOrderInput = z.infer<typeof ShipOrderSchema>
export type RefundOrderInput = z.infer<typeof RefundOrderSchema>
export type OrderFilters = z.infer<typeof OrderFiltersSchema>

// Validation helpers
export function validateCreateOrder(data: unknown): CreateOrderInput {
  return CreateOrderSchema.parse(data)
}

export function safeValidateCreateOrder(data: unknown) {
  return CreateOrderSchema.safeParse(data)
}

export function validateUpdateOrder(data: unknown): UpdateOrderInput {
  return UpdateOrderSchema.parse(data)
}

export function safeValidateUpdateOrder(data: unknown) {
  return UpdateOrderSchema.safeParse(data)
}

export function validateShipOrder(data: unknown): ShipOrderInput {
  return ShipOrderSchema.parse(data)
}

export function safeValidateShipOrder(data: unknown) {
  return ShipOrderSchema.safeParse(data)
}
