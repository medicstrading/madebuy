/**
 * @madebuy/shared
 * Shared types, constants, and utilities for MadeBuy platform
 *
 * ARCHIVED (2026-01-02): Sendle, Xero, Stripe Connect, shipping services
 * See: archive/packages/shared/src/
 */

// Export country/regional presets
export {
  COUNTRY_PRESETS,
  type CountryPreset,
  DEFAULT_REGIONAL_SETTINGS,
  getCountryByName,
  getCountryPreset,
} from './constants/countryPresets'
// Export maker type presets
export {
  getMakerTypeInfo,
  getTenantCategories,
  getTenantMaterialCategories,
  MAKER_CATEGORY_PRESETS,
  MAKER_MATERIAL_PRESETS,
  MAKER_TYPES,
  type MakerType,
  type MakerTypeInfo,
} from './constants/makerPresets'
// Export typography constants
export { getTypographyConfig, TYPOGRAPHY_PRESETS } from './constants/typography'
// Export email templates
export * from './email'
// Export error classes
export * from './errors'
// Export COGS calculation utilities
export * from './lib/cogs'
// Export cryptographic utilities
export * from './lib/crypto'
// Export sanitization utilities
export * from './lib/sanitize'
// Export subscription utilities
export * from './lib/subscription'
// Export digital delivery service
export * from './services/digital-delivery'
// Export Stripe utilities (config only - Connect archived)
export * from './stripe'
// Export all types
export * from './types'
// Explicit re-export of value constants from types (needed for bundler resolution)
export {
  IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_MEDIA_PER_PIECE,
  MAX_VIDEO_DURATION,
  MAX_VIDEO_SIZE,
  // Media constants
  VALID_IMAGE_TYPES,
  VALID_VIDEO_TYPES,
  VIDEO_EXTENSIONS,
} from './types'
// Export template utilities
export { getDefaultPages, getDefaultSections } from './types/template'
// Export validation schemas
export * from './validation'

// =============================================================================
// ARCHIVED EXPORTS (removed 2026-01-02)
// =============================================================================
// Sendle API - see archive/packages/shared/src/sendle/
// Xero API - see archive/packages/shared/src/xero/
// Shipping service - see archive/packages/shared/src/services/shipping.ts
// Shipping notifications - see archive/packages/shared/src/services/shipping-notifications.ts
// Stripe Connect - see archive/packages/shared/src/stripe/connect.ts
