/**
 * Sendle API Integration
 * Australian shipping carrier for small business
 * https://api.sendle.com/api/documentation
 */

/* eslint-disable no-undef */

import type { Address } from '../types/order'
import type { SendleQuote, SendleOrder, SendleTracking, SendleLabel } from '../types/shipping'

const SENDLE_API_URL = 'https://api.sendle.com/api'
const SENDLE_SANDBOX_URL = 'https://sandbox.sendle.com/api'

export interface SendleConfig {
  apiKey: string
  sendleId: string
  sandbox?: boolean
}

function getBaseUrl(config: SendleConfig): string {
  return config.sandbox ? SENDLE_SANDBOX_URL : SENDLE_API_URL
}

function getAuthHeader(config: SendleConfig): string {
  const credentials = Buffer.from(`${config.sendleId}:${config.apiKey}`).toString('base64')
  return `Basic ${credentials}`
}

async function sendleRequest<T>(
  config: SendleConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl(config)
  const url = `${baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(config),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.message || error.error || `Sendle API error: ${response.status}`)
  }

  return response.json()
}

export interface QuoteParams {
  pickupSuburb: string
  pickupPostcode: string
  deliverySuburb: string
  deliveryPostcode: string
  weight: number // in kg
  volume?: {
    length: number
    width: number
    height: number
  }
}

/**
 * Get shipping quotes from Sendle
 */
export async function getQuote(
  config: SendleConfig,
  params: QuoteParams
): Promise<SendleQuote[]> {
  const queryParams = new URLSearchParams({
    pickup_suburb: params.pickupSuburb,
    pickup_postcode: params.pickupPostcode,
    delivery_suburb: params.deliverySuburb,
    delivery_postcode: params.deliveryPostcode,
    weight_value: params.weight.toString(),
    weight_units: 'kg',
  })

  if (params.volume) {
    queryParams.append('volume_value', (
      params.volume.length * params.volume.width * params.volume.height
    ).toString())
    queryParams.append('volume_units', 'cm3')
  }

  return sendleRequest<SendleQuote[]>(
    config,
    `/quote?${queryParams.toString()}`,
    { method: 'GET' }
  )
}

export interface CreateOrderParams {
  pickupAddress: Address
  deliveryAddress: Address
  weight: number // in kg
  description: string
  customerReference: string
  senderName?: string
  senderPhone?: string
  senderEmail?: string
  senderCompany?: string
}

/**
 * Create a shipping order with Sendle
 */
export async function createOrder(
  config: SendleConfig,
  params: CreateOrderParams
): Promise<SendleOrder> {
  const orderData = {
    sender: {
      contact: {
        name: params.senderName || 'Seller',
        phone: params.senderPhone,
        email: params.senderEmail,
        company: params.senderCompany,
      },
      address: {
        address_line1: params.pickupAddress.line1,
        address_line2: params.pickupAddress.line2,
        suburb: params.pickupAddress.city,
        postcode: params.pickupAddress.postcode,
        state_name: params.pickupAddress.state,
        country: params.pickupAddress.country || 'AU',
      },
    },
    receiver: {
      contact: {
        name: params.customerReference,
      },
      address: {
        address_line1: params.deliveryAddress.line1,
        address_line2: params.deliveryAddress.line2,
        suburb: params.deliveryAddress.city,
        postcode: params.deliveryAddress.postcode,
        state_name: params.deliveryAddress.state,
        country: params.deliveryAddress.country || 'AU',
      },
    },
    description: params.description,
    customer_reference: params.customerReference,
    weight: {
      value: params.weight,
      units: 'kg',
    },
    // Auto-book pickup
    pickup_date: getNextBusinessDay(),
  }

  return sendleRequest<SendleOrder>(
    config,
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify(orderData),
    }
  )
}

/**
 * Get shipping label for an order
 */
export async function getLabel(
  config: SendleConfig,
  orderId: string,
  format: 'pdf' | 'png' = 'pdf',
  size: 'a4' | 'cropped' = 'a4'
): Promise<string> {
  const order = await sendleRequest<SendleOrder>(
    config,
    `/orders/${orderId}`,
    { method: 'GET' }
  )

  // Find the label URL matching requested format and size
  const label = order.labels?.find(
    (l: SendleLabel) => l.format === format && l.size === size
  )

  if (!label) {
    // Fallback to any available label
    const anyLabel = order.labels?.[0]
    if (!anyLabel) {
      throw new Error('No label available for this order')
    }
    return anyLabel.url
  }

  return label.url
}

/**
 * Cancel a shipping order
 */
export async function cancelOrder(
  config: SendleConfig,
  orderId: string
): Promise<void> {
  await sendleRequest<void>(
    config,
    `/orders/${orderId}`,
    { method: 'DELETE' }
  )
}

/**
 * Get tracking information for an order
 */
export async function trackOrder(
  config: SendleConfig,
  orderId: string
): Promise<SendleTracking> {
  return sendleRequest<SendleTracking>(
    config,
    `/orders/${orderId}/tracking`,
    { method: 'GET' }
  )
}

/**
 * Get order details
 */
export async function getOrder(
  config: SendleConfig,
  orderId: string
): Promise<SendleOrder> {
  return sendleRequest<SendleOrder>(
    config,
    `/orders/${orderId}`,
    { method: 'GET' }
  )
}

/**
 * Verify Sendle credentials
 */
export async function verifyCredentials(config: SendleConfig): Promise<boolean> {
  try {
    // Try to get account info
    await sendleRequest(config, '/ping', { method: 'GET' })
    return true
  } catch {
    return false
  }
}

// Helper function to get next business day for pickup
function getNextBusinessDay(): string {
  const date = new Date()
  const dayOfWeek = date.getDay()

  // Skip weekends
  if (dayOfWeek === 5) {
    // Friday -> Monday
    date.setDate(date.getDate() + 3)
  } else if (dayOfWeek === 6) {
    // Saturday -> Monday
    date.setDate(date.getDate() + 2)
  } else {
    // Next day
    date.setDate(date.getDate() + 1)
  }

  return date.toISOString().split('T')[0]
}

// Export all functions
export const Sendle = {
  getQuote,
  createOrder,
  getLabel,
  cancelOrder,
  trackOrder,
  getOrder,
  verifyCredentials,
}

export default Sendle
