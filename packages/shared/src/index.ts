/**
 * @madebuy/shared
 * Shared types, constants, and utilities for MadeBuy platform
 *
 * ARCHIVED (2026-01-02): Sendle, Xero, Stripe Connect, shipping services
 * See: archive/packages/shared/src/
 */

// Export all types
export * from './types'

// Export error classes
export * from './errors'

// Export sanitization utilities
export * from './lib/sanitize'

// Export cryptographic utilities
export * from './lib/crypto'

// Explicit re-export of value constants from types (needed for bundler resolution)
export {
  // Media constants
  VALID_IMAGE_TYPES,
  VALID_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  MAX_MEDIA_PER_PIECE,
  VIDEO_EXTENSIONS,
  IMAGE_EXTENSIONS,
} from './types'

// Export subscription utilities
export * from './lib/subscription'

// Export Stripe utilities (config only - Connect archived)
export * from './stripe'

// Export validation schemas
export * from './validation'

// Export digital delivery service
export * from './services/digital-delivery'

// Export email templates
export * from './email'

// =============================================================================
// ARCHIVED EXPORTS (removed 2026-01-02)
// =============================================================================
// Sendle API - see archive/packages/shared/src/sendle/
// Xero API - see archive/packages/shared/src/xero/
// Shipping service - see archive/packages/shared/src/services/shipping.ts
// Shipping notifications - see archive/packages/shared/src/services/shipping-notifications.ts
// Stripe Connect - see archive/packages/shared/src/stripe/connect.ts
