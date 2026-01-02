/**
 * Sendle API Integration
 *
 * Australian shipping carrier for small business
 * Carbon-neutral, no minimum volume, simple REST API
 *
 * @see https://api.sendle.com/api/documentation
 */

// ============================================================================
// Client
// ============================================================================

export {
  createSendleClient,
  verifyCredentials,
  getNextBusinessDay,
  dollarsToCents,
  centsToDollars,
} from './client'

export type {
  SendleConfig,
  SendleClient,
} from './client'

export {
  SendleError,
  SendleValidationError,
  SendleRateLimitError,
  SendleAuthenticationError,
  SendleNotFoundError,
} from './client'

// ============================================================================
// Quotes
// ============================================================================

export {
  getQuotes,
  getCheapestQuote,
  getFastestQuote,
} from './quotes'

export type {
  SendleQuoteRequest,
  SendleQuoteResponse,
  SendleShippingQuote,
  GetQuotesInput,
} from './quotes'

// ============================================================================
// Orders
// ============================================================================

export {
  createOrder,
  getOrder,
  cancelOrder,
  getLabel,
  listOrders,
} from './orders'

export type {
  SendleOrderRequest,
  SendleOrderResponse,
  SendleOrderState,
  SendleApiLabel,
  SendleApiAddress,
  SendleApiContact,
  SendleBooking,
  CreateOrderInput as SendleCreateOrderInput,
  AddressInput as SendleAddressInput,
  ContactInput as SendleContactInput,
} from './orders'

// ============================================================================
// Tracking
// ============================================================================

export {
  getTracking,
  isDelivered,
  getLatestEvent,
  getEstimatedDelivery,
} from './tracking'

export type {
  SendleTrackingResponse,
  SendleTrackingInfo,
  SendleTrackingEventParsed,
  SendleTrackingEventType,
  SendleTrackingState,
} from './tracking'

// ============================================================================
// Webhooks
// ============================================================================

export {
  verifyWebhookSignature,
  parseWebhookPayload,
  parseAndVerifyWebhook,
  isDeliveryEvent,
  isProblemEvent,
  isTransitEvent,
  isTerminalEvent,
  getEventStatusMessage,
} from './webhooks'

export type {
  SendleWebhookEventType,
  SendleWebhookRawPayload,
  SendleShipmentEventType,
  SendleWebhookEvent,
} from './webhooks'
