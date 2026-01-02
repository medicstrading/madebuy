/**
 * Sendle Webhooks
 *
 * Handle incoming webhook events from Sendle
 * @see https://api.sendle.com/api/documentation/webhooks
 */

import crypto from 'crypto'

// ============================================================================
// Webhook Event Types
// ============================================================================

export type SendleWebhookEventType =
  | 'order.pickup'
  | 'order.in_transit'
  | 'order.delivered'
  | 'order.card_left'
  | 'order.delivery_attempt_failed'
  | 'order.cancelled'
  | 'order.unable_to_book'
  | 'order.return_to_sender'
  | 'order.lost'

// Simplified event types for application use
export type SendleShipmentEventType =
  | 'pickup'
  | 'in_transit'
  | 'delivered'
  | 'card_left'
  | 'delivery_attempt_failed'
  | 'cancelled'
  | 'unable_to_book'
  | 'return_to_sender'
  | 'lost'

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface SendleWebhookRawPayload {
  /** Webhook event type */
  event: SendleWebhookEventType
  /** Sendle order ID */
  order_id: string
  /** Current order state */
  state: string
  /** Sendle reference number */
  sendle_reference: string
  /** Tracking URL */
  tracking_url: string
  /** Customer reference (our order number) */
  customer_reference?: string
  /** Event timestamp */
  timestamp: string
  /** Pickup date */
  pickup_date?: string
  /** Delivery date */
  delivered_on?: string
  /** Estimated delivery date range */
  estimated_delivery_date_minimum?: string
  estimated_delivery_date_maximum?: string
  /** Reason for failure (if applicable) */
  reason?: string
  /** Description */
  description?: string
  /** Sender info */
  sender?: {
    contact?: {
      name?: string
      email?: string
      phone?: string
    }
  }
  /** Receiver info */
  receiver?: {
    contact?: {
      name?: string
      email?: string
      phone?: string
    }
  }
}

// ============================================================================
// Application Types
// ============================================================================

export interface SendleWebhookEvent {
  type: SendleShipmentEventType
  orderId: string
  state: string
  sendleReference: string
  trackingUrl: string
  customerReference?: string
  timestamp: Date
  pickupDate?: string
  deliveredOn?: string
  estimatedDelivery?: {
    earliest: string
    latest: string
  }
  reason?: string
  description?: string
}

// ============================================================================
// Webhook Handling
// ============================================================================

/**
 * Verify webhook signature from Sendle
 *
 * Sendle uses HMAC-SHA256 to sign webhook payloads.
 * The signature is sent in the `X-Sendle-Signature` header.
 *
 * @param signature - Signature from X-Sendle-Signature header
 * @param body - Raw request body as string
 * @param secret - Your webhook signing secret from Sendle dashboard
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  if (!signature || !body || !secret) {
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Parse and validate webhook payload
 *
 * @param body - Request body (parsed JSON or raw object)
 * @returns Parsed webhook event
 * @throws Error if payload is invalid
 */
export function parseWebhookPayload(body: unknown): SendleWebhookEvent {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid webhook payload: body must be an object')
  }

  const payload = body as SendleWebhookRawPayload

  // Validate required fields
  if (!payload.event) {
    throw new Error('Invalid webhook payload: missing event type')
  }

  if (!payload.order_id) {
    throw new Error('Invalid webhook payload: missing order_id')
  }

  return mapWebhookPayload(payload)
}

/**
 * Parse webhook payload with signature verification
 *
 * @param rawBody - Raw request body as string
 * @param signature - X-Sendle-Signature header value
 * @param secret - Webhook signing secret
 * @returns Parsed webhook event
 * @throws Error if signature is invalid or payload is malformed
 */
export function parseAndVerifyWebhook(
  rawBody: string,
  signature: string,
  secret: string
): SendleWebhookEvent {
  if (!verifyWebhookSignature(signature, rawBody, secret)) {
    throw new Error('Invalid webhook signature')
  }

  const body = JSON.parse(rawBody)
  return parseWebhookPayload(body)
}

// ============================================================================
// Event Type Helpers
// ============================================================================

/**
 * Check if event indicates successful delivery
 */
export function isDeliveryEvent(event: SendleWebhookEvent): boolean {
  return event.type === 'delivered'
}

/**
 * Check if event indicates a problem
 */
export function isProblemEvent(event: SendleWebhookEvent): boolean {
  return [
    'card_left',
    'delivery_attempt_failed',
    'cancelled',
    'unable_to_book',
    'return_to_sender',
    'lost',
  ].includes(event.type)
}

/**
 * Check if event indicates the shipment is in transit
 */
export function isTransitEvent(event: SendleWebhookEvent): boolean {
  return event.type === 'in_transit' || event.type === 'pickup'
}

/**
 * Check if event is terminal (no more updates expected)
 */
export function isTerminalEvent(event: SendleWebhookEvent): boolean {
  return [
    'delivered',
    'cancelled',
    'unable_to_book',
    'lost',
  ].includes(event.type)
}

/**
 * Get a human-readable status message for the event
 */
export function getEventStatusMessage(event: SendleWebhookEvent): string {
  const messages: Record<SendleShipmentEventType, string> = {
    pickup: 'Parcel picked up',
    in_transit: 'Parcel in transit',
    delivered: 'Parcel delivered',
    card_left: 'Delivery attempted - card left',
    delivery_attempt_failed: 'Delivery attempt failed',
    cancelled: 'Shipment cancelled',
    unable_to_book: 'Unable to book shipment',
    return_to_sender: 'Parcel being returned to sender',
    lost: 'Parcel lost',
  }

  return messages[event.type] || 'Status updated'
}

// ============================================================================
// Helpers
// ============================================================================

function mapWebhookPayload(payload: SendleWebhookRawPayload): SendleWebhookEvent {
  return {
    type: normalizeEventType(payload.event),
    orderId: payload.order_id,
    state: payload.state,
    sendleReference: payload.sendle_reference,
    trackingUrl: payload.tracking_url,
    customerReference: payload.customer_reference,
    timestamp: new Date(payload.timestamp),
    pickupDate: payload.pickup_date,
    deliveredOn: payload.delivered_on,
    estimatedDelivery:
      payload.estimated_delivery_date_minimum &&
      payload.estimated_delivery_date_maximum
        ? {
            earliest: payload.estimated_delivery_date_minimum,
            latest: payload.estimated_delivery_date_maximum,
          }
        : undefined,
    reason: payload.reason,
    description: payload.description,
  }
}

function normalizeEventType(event: SendleWebhookEventType): SendleShipmentEventType {
  // Remove 'order.' prefix
  return event.replace('order.', '') as SendleShipmentEventType
}
