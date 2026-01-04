/**
 * Validation schemas and utilities
 * Uses Zod for runtime validation of API requests
 */

// Checkout validation - explicit exports to avoid conflicts
export {
  CartItemSchema,
  CustomerInfoSchema,
  ShippingAddressSchema,
  CheckoutRequestSchema,
  validateCheckoutRequest,
  safeValidateCheckoutRequest,
} from './checkout'

export type {
  CartItem,
  CustomerInfo,
  CheckoutShippingAddress,
  CheckoutRequest,
  // Note: ShippingAddress is deprecated - use CheckoutShippingAddress or types/shipping.ShippingAddress
} from './checkout'

// Personalization validation
export * from './personalization'

// Password validation
export * from './password'
