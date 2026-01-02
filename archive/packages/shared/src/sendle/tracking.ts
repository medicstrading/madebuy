/**
 * Sendle Tracking API
 *
 * Track shipment status and events
 * @see https://api.sendle.com/api/documentation/orders/tracking
 */

import type { SendleClient } from './client'

// ============================================================================
// API Response Types
// ============================================================================

export interface SendleTrackingEventRaw {
  event_type: string
  scan_time: string
  description: string
  origin_location?: string
  destination_location?: string
  reason?: string
  requester_name?: string
  local_time_zone?: string
}

export interface SendleTrackingResponse {
  state: string
  tracking_events: SendleTrackingEventRaw[]
  origin: {
    country: string
  }
  destination: {
    country: string
  }
  estimated_delivery_date_minimum?: string
  estimated_delivery_date_maximum?: string
}

// ============================================================================
// Application Types
// ============================================================================

export type SendleTrackingEventType =
  | 'pickup_scheduled'
  | 'pickup'
  | 'info'
  | 'in_transit'
  | 'out_for_delivery'
  | 'card_left'
  | 'delivery_attempt_failed'
  | 'delivered'
  | 'cancelled'
  | 'return_to_sender'
  | 'lost'
  | 'unable_to_book'
  | 'unknown'

export interface SendleTrackingEventParsed {
  type: SendleTrackingEventType
  timestamp: Date
  description: string
  originLocation?: string
  destinationLocation?: string
  reason?: string
  timezone?: string
}

export interface SendleTrackingInfo {
  state: string
  stateNormalized: SendleTrackingState
  events: SendleTrackingEventParsed[]
  origin: {
    country: string
  }
  destination: {
    country: string
  }
  estimatedDelivery?: {
    earliest: string
    latest: string
  }
  isDelivered: boolean
  isCancelled: boolean
  lastEvent?: SendleTrackingEventParsed
}

export type SendleTrackingState =
  | 'pending'
  | 'pickup_scheduled'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'returning'
  | 'lost'

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get tracking information for a Sendle order
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @returns Tracking info with events
 */
export async function getTracking(
  client: SendleClient,
  orderId: string
): Promise<SendleTrackingInfo> {
  const response = await client.get<SendleTrackingResponse>(
    `/orders/${orderId}/tracking`
  )

  return mapTrackingResponse(response)
}

/**
 * Check if an order has been delivered
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @returns true if delivered
 */
export async function isDelivered(
  client: SendleClient,
  orderId: string
): Promise<boolean> {
  const tracking = await getTracking(client, orderId)
  return tracking.isDelivered
}

/**
 * Get the latest tracking event
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @returns Latest tracking event or null
 */
export async function getLatestEvent(
  client: SendleClient,
  orderId: string
): Promise<SendleTrackingEventParsed | null> {
  const tracking = await getTracking(client, orderId)
  return tracking.lastEvent || null
}

/**
 * Get estimated delivery dates
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @returns Estimated delivery date range or null
 */
export async function getEstimatedDelivery(
  client: SendleClient,
  orderId: string
): Promise<{ earliest: string; latest: string } | null> {
  const tracking = await getTracking(client, orderId)
  return tracking.estimatedDelivery || null
}

// ============================================================================
// Helpers
// ============================================================================

function mapTrackingResponse(response: SendleTrackingResponse): SendleTrackingInfo {
  const events = response.tracking_events.map(mapTrackingEvent)
  const sortedEvents = events.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  )

  const stateNormalized: SendleTrackingState = normalizeState(response.state)

  return {
    state: response.state,
    stateNormalized,
    events: sortedEvents,
    origin: response.origin,
    destination: response.destination,
    estimatedDelivery:
      response.estimated_delivery_date_minimum &&
      response.estimated_delivery_date_maximum
        ? {
            earliest: response.estimated_delivery_date_minimum,
            latest: response.estimated_delivery_date_maximum,
          }
        : undefined,
    isDelivered: stateNormalized === 'delivered',
    isCancelled: stateNormalized === 'cancelled',
    lastEvent: sortedEvents[0],
  }
}

function mapTrackingEvent(event: SendleTrackingEventRaw): SendleTrackingEventParsed {
  return {
    type: normalizeEventType(event.event_type),
    timestamp: new Date(event.scan_time),
    description: event.description,
    originLocation: event.origin_location,
    destinationLocation: event.destination_location,
    reason: event.reason,
    timezone: event.local_time_zone,
  }
}

function normalizeEventType(eventType: string): SendleTrackingEventType {
  const typeMap: Record<string, SendleTrackingEventType> = {
    'Pickup Scheduled': 'pickup_scheduled',
    'Pickup': 'pickup',
    'Picked Up': 'pickup',
    'Info': 'info',
    'Information': 'info',
    'In Transit': 'in_transit',
    'Transit': 'in_transit',
    'Out for Delivery': 'out_for_delivery',
    'Card Left': 'card_left',
    'Carded': 'card_left',
    'Delivery Attempt Failed': 'delivery_attempt_failed',
    'Unable to Deliver': 'delivery_attempt_failed',
    'Delivered': 'delivered',
    'Dropped Off': 'delivered',
    'Cancelled': 'cancelled',
    'Return to Sender': 'return_to_sender',
    'Returning': 'return_to_sender',
    'Lost': 'lost',
    'Unable to Book': 'unable_to_book',
  }

  return typeMap[eventType] || 'unknown'
}

function normalizeState(state: string): SendleTrackingState {
  const stateMap: Record<string, SendleTrackingState> = {
    'Booking': 'pending',
    'Pickup': 'pickup_scheduled',
    'Transit': 'in_transit',
    'In Transit': 'in_transit',
    'Out for Delivery': 'out_for_delivery',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
    'Unable to Book': 'failed',
    'Return to Sender': 'returning',
    'Lost': 'lost',
  }

  return stateMap[state] || 'pending'
}
