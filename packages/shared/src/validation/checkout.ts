import { z } from 'zod'

/**
 * Checkout validation schemas
 * Used to validate checkout requests before processing
 */

// Individual cart item
export const CartItemSchema = z.object({
  pieceId: z.string().min(1, 'Piece ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  price: z.number().positive('Price must be positive'),
  currency: z.string().length(3).optional().default('AUD'),
})

// Customer info
export const CustomerInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
})

// Shipping address
export const ShippingAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().length(2, 'Country must be 2-letter ISO code').default('AU'),
}).optional()

// Full checkout request
export const CheckoutRequestSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  items: z.array(CartItemSchema).min(1, 'At least one item is required').max(50, 'Cannot checkout more than 50 items'),
  customerInfo: CustomerInfoSchema,
  shippingAddress: ShippingAddressSchema,
  notes: z.string().max(500).optional(),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
})

// Inferred types
export type CartItem = z.infer<typeof CartItemSchema>
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>
export type CheckoutShippingAddress = z.infer<typeof ShippingAddressSchema>
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>

/** @deprecated Use CheckoutShippingAddress instead - conflicts with types/shipping.ts */
export type ShippingAddress = CheckoutShippingAddress

/**
 * Validate checkout request
 * Returns parsed data or throws ZodError
 */
export function validateCheckoutRequest(data: unknown): CheckoutRequest {
  return CheckoutRequestSchema.parse(data)
}

/**
 * Safe validate checkout request
 * Returns { success: true, data } or { success: false, error }
 */
export function safeValidateCheckoutRequest(data: unknown) {
  return CheckoutRequestSchema.safeParse(data)
}
