/**
 * Shipping Service
 *
 * High-level shipping service that abstracts carrier-specific implementations.
 * Currently supports Sendle for Australian domestic shipping.
 */

import {
  createSendleClient,
  getQuotes as sendleGetQuotes,
  createOrder as sendleCreateOrder,
  getOrder as sendleGetOrder,
  cancelOrder as sendleCancelOrder,
  getTracking as sendleGetTracking,
  getLabel as sendleGetLabel,
  verifyCredentials as sendleVerifyCredentials,
  SendleError,
} from '../sendle'

import type {
  SendleClient,
  SendleConfig,
  SendleShippingQuote,
  SendleBooking,
  SendleTrackingInfo,
} from '../sendle'

// ============================================================================
// Service Types
// ============================================================================

export interface ShippingServiceAddress {
  name: string
  email?: string
  phone?: string
  company?: string
  line1: string
  line2?: string
  suburb: string
  postcode: string
  state: string
  country?: string // Default: AU
}

export interface PackageDetails {
  /** Weight in kg */
  weightKg: number
  /** Optional dimensions in cm */
  dimensions?: {
    lengthCm: number
    widthCm: number
    heightCm: number
  }
  /** Package contents description */
  description: string
}

export interface ShippingQuoteResult {
  carrier: 'sendle'
  quotes: SendleShippingQuote[]
  cheapest?: SendleShippingQuote
}

export interface BookingResult {
  success: boolean
  carrier: 'sendle'
  orderId: string
  trackingNumber: string
  trackingUrl: string
  labelUrl?: string
  pickupDate: string
  estimatedDelivery?: {
    earliest: string
    latest: string
  }
  priceGrossCents: number
  error?: string
}

export interface TrackingResult {
  carrier: 'sendle'
  orderId: string
  state: string
  stateNormalized: string
  isDelivered: boolean
  isCancelled: boolean
  trackingUrl?: string
  events: {
    type: string
    timestamp: Date
    description: string
  }[]
  estimatedDelivery?: {
    earliest: string
    latest: string
  }
}

export interface ShippingServiceConfig {
  sendleId: string
  apiKey: string
  sandbox?: boolean
}

// ============================================================================
// Shipping Service Interface
// ============================================================================

export interface ShippingService {
  /**
   * Get shipping quotes from all configured carriers
   */
  getQuotes(
    from: ShippingServiceAddress,
    to: ShippingServiceAddress,
    packageDetails: PackageDetails
  ): Promise<ShippingQuoteResult>

  /**
   * Book a shipment with the default/cheapest carrier
   */
  bookShipment(
    from: ShippingServiceAddress,
    to: ShippingServiceAddress,
    packageDetails: PackageDetails,
    orderRef: string
  ): Promise<BookingResult>

  /**
   * Get tracking information for a shipment
   */
  getTracking(shipmentId: string): Promise<TrackingResult>

  /**
   * Cancel a shipment
   */
  cancelShipment(shipmentId: string): Promise<void>

  /**
   * Get shipping label URL
   */
  getLabelUrl(
    shipmentId: string,
    format?: 'pdf' | 'png'
  ): Promise<string | null>

  /**
   * Verify carrier credentials are valid
   */
  verifyCredentials(): Promise<boolean>
}

// ============================================================================
// Shipping Service Implementation
// ============================================================================

export function createShippingService(config: ShippingServiceConfig): ShippingService {
  const sendleConfig: SendleConfig = {
    sendleId: config.sendleId,
    apiKey: config.apiKey,
    sandbox: config.sandbox,
  }

  const sendleClient: SendleClient = createSendleClient(sendleConfig)

  return {
    async getQuotes(
      from: ShippingServiceAddress,
      to: ShippingServiceAddress,
      packageDetails: PackageDetails
    ): Promise<ShippingQuoteResult> {
      const quotes = await sendleGetQuotes(sendleClient, {
        pickupSuburb: from.suburb,
        pickupPostcode: from.postcode,
        pickupCountry: from.country || 'AU',
        deliverySuburb: to.suburb,
        deliveryPostcode: to.postcode,
        deliveryCountry: to.country || 'AU',
        weightKg: packageDetails.weightKg,
        dimensions: packageDetails.dimensions,
      })

      return {
        carrier: 'sendle',
        quotes,
        cheapest: quotes.length > 0
          ? quotes.reduce((min, q) =>
              q.priceGrossCents < min.priceGrossCents ? q : min
            )
          : undefined,
      }
    },

    async bookShipment(
      from: ShippingServiceAddress,
      to: ShippingServiceAddress,
      packageDetails: PackageDetails,
      orderRef: string
    ): Promise<BookingResult> {
      try {
        const booking: SendleBooking = await sendleCreateOrder(sendleClient, {
          sender: {
            contact: {
              name: from.name,
              email: from.email,
              phone: from.phone,
              company: from.company,
            },
            address: {
              line1: from.line1,
              line2: from.line2,
              suburb: from.suburb,
              postcode: from.postcode,
              state: from.state,
              country: from.country || 'AU',
            },
          },
          receiver: {
            contact: {
              name: to.name,
              email: to.email,
              phone: to.phone,
              company: to.company,
            },
            address: {
              line1: to.line1,
              line2: to.line2,
              suburb: to.suburb,
              postcode: to.postcode,
              state: to.state,
              country: to.country || 'AU',
            },
          },
          description: packageDetails.description,
          weightKg: packageDetails.weightKg,
          dimensions: packageDetails.dimensions,
          customerReference: orderRef,
        })

        // Get the PDF label URL
        const pdfLabel = booking.labels.find((l) => l.format === 'pdf')

        return {
          success: true,
          carrier: 'sendle',
          orderId: booking.orderId,
          trackingNumber: booking.sendleReference,
          trackingUrl: booking.trackingUrl,
          labelUrl: pdfLabel?.url,
          pickupDate: booking.scheduling.pickupDate,
          estimatedDelivery:
            booking.scheduling.estimatedDeliveryMin &&
            booking.scheduling.estimatedDeliveryMax
              ? {
                  earliest: booking.scheduling.estimatedDeliveryMin,
                  latest: booking.scheduling.estimatedDeliveryMax,
                }
              : undefined,
          priceGrossCents: booking.priceGrossCents,
        }
      } catch (error) {
        if (error instanceof SendleError) {
          return {
            success: false,
            carrier: 'sendle',
            orderId: '',
            trackingNumber: '',
            trackingUrl: '',
            pickupDate: '',
            priceGrossCents: 0,
            error: error.message,
          }
        }
        throw error
      }
    },

    async getTracking(shipmentId: string): Promise<TrackingResult> {
      const tracking: SendleTrackingInfo = await sendleGetTracking(sendleClient, shipmentId)

      // Get the booking to get tracking URL
      const booking = await sendleGetOrder(sendleClient, shipmentId)

      return {
        carrier: 'sendle',
        orderId: shipmentId,
        state: tracking.state,
        stateNormalized: tracking.stateNormalized,
        isDelivered: tracking.isDelivered,
        isCancelled: tracking.isCancelled,
        trackingUrl: booking.trackingUrl,
        events: tracking.events.map((e) => ({
          type: e.type,
          timestamp: e.timestamp,
          description: e.description,
        })),
        estimatedDelivery: tracking.estimatedDelivery,
      }
    },

    async cancelShipment(shipmentId: string): Promise<void> {
      await sendleCancelOrder(sendleClient, shipmentId)
    },

    async getLabelUrl(
      shipmentId: string,
      format: 'pdf' | 'png' = 'pdf'
    ): Promise<string | null> {
      return sendleGetLabel(sendleClient, shipmentId, format)
    },

    async verifyCredentials(): Promise<boolean> {
      return sendleVerifyCredentials(sendleClient)
    },
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a shipping service from environment variables
 *
 * Required env vars:
 * - SENDLE_ID
 * - SENDLE_API_KEY
 *
 * Optional:
 * - SENDLE_SANDBOX (defaults to false in production)
 */
export function createShippingServiceFromEnv(): ShippingService {
  const sendleId = process.env.SENDLE_ID
  const apiKey = process.env.SENDLE_API_KEY

  if (!sendleId || !apiKey) {
    throw new Error('Missing Sendle credentials. Set SENDLE_ID and SENDLE_API_KEY environment variables.')
  }

  const sandbox = process.env.SENDLE_SANDBOX === 'true' ||
                  process.env.NODE_ENV === 'development'

  return createShippingService({
    sendleId,
    apiKey,
    sandbox,
  })
}

/**
 * Create a shipping service for a specific tenant
 *
 * @param tenantSendleConfig - Sendle credentials from tenant settings
 */
export function createTenantShippingService(tenantSendleConfig: {
  sendleId: string
  apiKey: string
  sandbox?: boolean
}): ShippingService {
  return createShippingService(tenantSendleConfig)
}
