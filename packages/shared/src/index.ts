/**
 * @madebuy/shared
 * Shared types, constants, and utilities for MadeBuy platform
 */

// Export all types
export * from './types'

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
  // Shipping constants
  AU_STATES,
  DEFAULT_AU_ZONES,
  SENDLE_STATUS_MAP,
  SHIPMENT_STATUS_MESSAGES,
  CARRIER_NAMES,
  // Marketplace constants
  MARKETPLACE_CATEGORIES,
} from './types'

// Export subscription utilities
export * from './lib/subscription'

// Export Stripe Connect utilities
export * from './stripe'

// Export integrations (legacy - keeping for backwards compatibility)
export { Sendle } from './integrations'

// Export Sendle API (new structured module)
// Re-export specific items to avoid conflicts with types/shipping.ts
export {
  // Client
  createSendleClient,
  verifyCredentials as verifySendleCredentials,
  getNextBusinessDay,
  dollarsToCents,
  centsToDollars,
  SendleError,
  SendleValidationError,
  SendleRateLimitError,
  SendleAuthenticationError,
  SendleNotFoundError,
  // Quotes
  getQuotes as getSendleQuotes,
  getCheapestQuote as getSendleCheapestQuote,
  getFastestQuote as getSendleFastestQuote,
  // Orders
  createOrder as createSendleOrder,
  getOrder as getSendleOrder,
  cancelOrder as cancelSendleOrder,
  getLabel as getSendleLabel,
  listOrders as listSendleOrders,
  // Tracking
  getTracking as getSendleTracking,
  isDelivered as isSendleDelivered,
  getLatestEvent as getSendleLatestEvent,
  getEstimatedDelivery as getSendleEstimatedDelivery,
  // Webhooks
  verifyWebhookSignature as verifySendleWebhookSignature,
  parseWebhookPayload as parseSendleWebhookPayload,
  parseAndVerifyWebhook as parseAndVerifySendleWebhook,
  isDeliveryEvent as isSendleDeliveryEvent,
  isProblemEvent as isSendleProblemEvent,
  isTransitEvent as isSendleTransitEvent,
  isTerminalEvent as isSendleTerminalEvent,
  getEventStatusMessage as getSendleEventStatusMessage,
} from './sendle'

export type {
  SendleConfig,
  SendleClient,
  SendleQuoteRequest,
  SendleQuoteResponse,
  SendleShippingQuote,
  GetQuotesInput,
  SendleOrderRequest,
  SendleOrderResponse,
  SendleOrderState,
  SendleApiLabel,
  SendleApiAddress,
  SendleApiContact,
  SendleBooking,
  SendleCreateOrderInput,
  SendleAddressInput,
  SendleContactInput,
  SendleTrackingResponse,
  SendleTrackingInfo,
  SendleTrackingEventParsed,
  SendleTrackingEventType,
  SendleTrackingState,
  SendleWebhookEventType,
  SendleWebhookRawPayload,
  SendleShipmentEventType,
  SendleWebhookEvent,
} from './sendle'

// Export constants (to be added)
// export * from './constants'

// Export utilities (to be added)
// export * from './utils'

// Export validation schemas
export * from './validation'

// Export Xero integration
export * from './xero'

// Export digital delivery service
export * from './services/digital-delivery'

// Export shipping notifications service
export * from './services/shipping-notifications'

// Export email templates
export * from './email'

// Export shipping service (use specific exports to avoid conflicts)
export {
  createShippingService,
  createShippingServiceFromEnv,
  createTenantShippingService,
} from './services/shipping'

export type {
  ShippingServiceAddress,
  PackageDetails,
  ShippingQuoteResult,
  BookingResult,
  TrackingResult,
  ShippingServiceConfig,
  ShippingService,
} from './services/shipping'
