/**
 * @madebuy/shared
 * Shared types, constants, and utilities for MadeBuy platform
 *
 * ARCHIVED (2026-01-02): Sendle, Xero, Stripe Connect, shipping services
 * See: archive/packages/shared/src/
 */

// Export analytics utilities
export * from './analytics'
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
export {
  getDefaultWebsiteDesign,
  getGoogleFontsUrl,
  getTypographyConfig,
  type TypographyConfig,
  type TypographyPreset,
  TYPOGRAPHY_PRESETS,
} from './constants/typography'
// Export banner presets
export { BANNER_PRESETS, type BannerPreset } from './constants/bannerPresets'
// Export email templates
export * from './email'
// Export error classes
export * from './errors'
// Export accessibility hooks
export { useFocusTrap } from './hooks/useFocusTrap'
// Export COGS calculation utilities
export * from './lib/cogs'
// Export cryptographic utilities
export * from './lib/crypto'
export type { Logger } from './lib/logger'
// Export logger utilities
export { createLogger, getRequestContext, logger } from './lib/logger'
export type { RateLimitConfig, RateLimitResult } from './lib/rate-limit'
// Export rate limiting utilities
export { createRateLimiter } from './lib/rate-limit'
// Export sanitization utilities
// Pure JS functions (safe for API routes and server components)
export {
  escapeHtml,
  sanitizeHtmlServer,
  sanitizeInput,
  stripHtml,
} from './lib/sanitize-input'
// NOTE: sanitizeHtml is NOT exported here because it uses DOMPurify/jsdom
// which breaks Next.js server-side builds. Import it directly from:
// import { sanitizeHtml } from '@madebuy/shared/lib/sanitize'
// Export subscription utilities
export * from './lib/subscription'
// Export Zod validation schemas
export * from './schemas'
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
export {
  createCustomPage,
  type FAQItem,
  type FeatureItem,
  generatePageId,
  generateSectionId,
  getDefaultPages,
  getDefaultSections,
  type PageSection,
  type PageSectionSettings,
  type PageSectionType,
  type PageType,
  SECTION_TYPE_LABELS,
  TEMPLATE_DEFINITIONS,
  type TestimonialItem,
  type WebsitePage,
  type WebsiteTemplate,
} from './types/template'
// Export retry utilities
export * from './utils/retry'
// Export Stripe helpers
export * from './utils/stripe-helpers'
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
