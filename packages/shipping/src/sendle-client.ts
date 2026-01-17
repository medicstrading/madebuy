/**
 * Sendle API Client
 *
 * Sendle is an Australian shipping carrier that provides competitive rates
 * for small businesses. This client handles API authentication and requests.
 *
 * API Documentation: https://developers.sendle.com/
 */

export interface SendleConfig {
  apiKey: string
  senderId: string
  environment: 'sandbox' | 'production'
}

export interface SendleAddress {
  address_line1: string
  address_line2?: string
  suburb: string
  state_name: string
  postcode: string
  country: string
}

export interface SendleParcel {
  weight_value: number // in kg
  weight_units: 'kg' | 'lb'
  length_value?: number // in cm
  width_value?: number // in cm
  height_value?: number // in cm
  dimension_units?: 'cm' | 'in'
  description?: string
}

export interface SendleQuoteRequest {
  sender_address: SendleAddress
  receiver_address: SendleAddress
  parcel: SendleParcel
}

export interface SendleQuote {
  quote_id: string
  plan_name: string
  price_in_cents: number
  currency: string
  tax_in_cents: number
  estimated_delivery_days: {
    min: number
    max: number
  }
}

export interface SendleQuoteResponse {
  quotes: SendleQuote[]
}

export interface SendleOrderRequest {
  sender_address: SendleAddress
  receiver_address: SendleAddress
  parcel: SendleParcel
  sender_contact: {
    name: string
    email?: string
    phone?: string
    company?: string
  }
  receiver_contact: {
    name: string
    email?: string
    phone?: string
    company?: string
  }
  description?: string
  customer_reference?: string
  metadata?: Record<string, string>
}

export interface SendleOrder {
  order_id: string
  order_url: string
  sendle_reference: string
  tracking_url: string
  labels: {
    pdf_url: string
    zpl_url?: string
  }
  state:
    | 'pending'
    | 'pickup_scheduled'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled'
  price: {
    gross: { amount: number; currency: string }
    net: { amount: number; currency: string }
    tax: { amount: number; currency: string }
  }
}

export interface SendleTrackingEvent {
  timestamp: string
  event_type: string
  description: string
  location?: string
}

export class SendleClient {
  private readonly baseUrl: string
  private readonly headers: HeadersInit

  constructor(config: SendleConfig) {
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.sendle.com/api'
        : 'https://sandbox.sendle.com/api'

    // Sendle uses HTTP Basic Auth with senderId:apiKey
    const credentials = Buffer.from(
      `${config.senderId}:${config.apiKey}`,
    ).toString('base64')
    this.headers = {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  /**
   * Verify API credentials by making a test request
   * Returns true if credentials are valid
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      // Use the ping endpoint to verify credentials
      const response = await fetch(`${this.baseUrl}/ping`, {
        method: 'GET',
        headers: this.headers,
      })
      return response.status === 200
    } catch (error) {
      console.error('Sendle credential verification failed:', error)
      return false
    }
  }

  /**
   * Get shipping quotes for a parcel
   */
  async getQuotes(request: SendleQuoteRequest): Promise<SendleQuoteResponse> {
    const response = await fetch(`${this.baseUrl}/quote`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        pickup_suburb: request.sender_address.suburb,
        pickup_postcode: request.sender_address.postcode,
        pickup_country: request.sender_address.country,
        delivery_suburb: request.receiver_address.suburb,
        delivery_postcode: request.receiver_address.postcode,
        delivery_country: request.receiver_address.country,
        weight_value: request.parcel.weight_value,
        weight_units: request.parcel.weight_units,
        length_value: request.parcel.length_value,
        width_value: request.parcel.width_value,
        height_value: request.parcel.height_value,
        dimension_units: request.parcel.dimension_units,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new SendleError(
        `Failed to get quotes: ${error.message || response.statusText}`,
        response.status,
        error,
      )
    }

    return response.json()
  }

  /**
   * Create a shipping order and get label
   */
  async createOrder(request: SendleOrderRequest): Promise<SendleOrder> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        pickup_date: this.getNextBusinessDay(),
        first_mile_option: 'pickup',
        sender: {
          contact: request.sender_contact,
          address: {
            address_line1: request.sender_address.address_line1,
            address_line2: request.sender_address.address_line2,
            suburb: request.sender_address.suburb,
            state_name: request.sender_address.state_name,
            postcode: request.sender_address.postcode,
            country: request.sender_address.country,
          },
        },
        receiver: {
          contact: request.receiver_contact,
          address: {
            address_line1: request.receiver_address.address_line1,
            address_line2: request.receiver_address.address_line2,
            suburb: request.receiver_address.suburb,
            state_name: request.receiver_address.state_name,
            postcode: request.receiver_address.postcode,
            country: request.receiver_address.country,
          },
        },
        parcel_contents: [
          {
            description: request.parcel.description || 'Package',
            value: 0, // Will be set by caller if needed
            quantity: 1,
            weight_value: request.parcel.weight_value,
            weight_units: request.parcel.weight_units,
          },
        ],
        weight: {
          value: request.parcel.weight_value,
          units: request.parcel.weight_units,
        },
        dimensions: request.parcel.length_value
          ? {
              length: request.parcel.length_value,
              width: request.parcel.width_value,
              height: request.parcel.height_value,
              units: request.parcel.dimension_units,
            }
          : undefined,
        customer_reference: request.customer_reference,
        metadata: request.metadata,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new SendleError(
        `Failed to create order: ${error.message || response.statusText}`,
        response.status,
        error,
      )
    }

    return response.json()
  }

  /**
   * Get order details and tracking info
   */
  async getOrder(orderId: string): Promise<SendleOrder> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new SendleError(
        `Failed to get order: ${error.message || response.statusText}`,
        response.status,
        error,
      )
    }

    return response.json()
  }

  /**
   * Get tracking events for an order
   */
  async getTracking(orderId: string): Promise<SendleTrackingEvent[]> {
    const response = await fetch(`${this.baseUrl}/tracking/${orderId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new SendleError(
        `Failed to get tracking: ${error.message || response.statusText}`,
        response.status,
        error,
      )
    }

    const data = await response.json()
    return data.tracking_events || []
  }

  /**
   * Cancel an order (if not yet picked up)
   */
  async cancelOrder(orderId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new SendleError(
        `Failed to cancel order: ${error.message || response.statusText}`,
        response.status,
        error,
      )
    }
  }

  /**
   * Get the next business day for pickup (skip weekends)
   */
  private getNextBusinessDay(): string {
    const date = new Date()
    date.setDate(date.getDate() + 1) // Start from tomorrow

    // Skip weekend
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1)
    }

    return date.toISOString().split('T')[0]
  }
}

export class SendleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'SendleError'
  }
}

/**
 * Create a Sendle client from tenant settings
 */
export function createSendleClient(config: SendleConfig): SendleClient {
  return new SendleClient(config)
}
