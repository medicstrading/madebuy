/**
 * Validation schemas and utilities
 * Uses Zod for runtime validation of API requests
 */

export type {
  CartItem,
  CheckoutRequest,
  CheckoutShippingAddress,
  CustomerInfo,
  // Note: ShippingAddress is deprecated - use CheckoutShippingAddress or types/shipping.ShippingAddress
} from './checkout'
// Checkout validation - explicit exports to avoid conflicts
export {
  CartItemSchema,
  CheckoutRequestSchema,
  CustomerInfoSchema,
  ShippingAddressSchema,
  safeValidateCheckoutRequest,
  validateCheckoutRequest,
} from './checkout'
// Password validation
export * from './password'
// Personalization validation
export * from './personalization'
