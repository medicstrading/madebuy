/**
 * Sendle Orders API
 *
 * Create and manage Sendle orders (shipping bookings)
 * @see https://api.sendle.com/api/documentation/orders
 */

import type { SendleClient } from './client'
import { dollarsToCents, getNextBusinessDay } from './client'

// ============================================================================
// API Request Types
// ============================================================================

export interface SendleApiAddress {
  address_line1: string
  address_line2?: string
  suburb: string
  postcode: string
  state_name: string
  country: string
}

export interface SendleApiContact {
  name: string
  email?: string
  phone?: string
  company?: string
}

export interface SendleOrderRequest {
  sender: {
    contact: SendleApiContact
    address: SendleApiAddress
    instructions?: string
  }
  receiver: {
    contact: SendleApiContact
    address: SendleApiAddress
    instructions?: string
  }
  description: string // Package contents
  weight: {
    value: number
    units: 'kg' | 'g' | 'lb' | 'oz'
  }
  dimensions?: {
    length: number
    width: number
    height: number
    units: 'cm' | 'mm' | 'in'
  }
  customer_reference?: string // Our order number
  metadata?: Record<string, string>
  hide_sender_details?: boolean
  pickup_date?: string // YYYY-MM-DD
  first_mile_option?: 'pickup' | 'drop off'
  product_code?: string // e.g., 'STANDARD-PICKUP', 'PREMIUM-PICKUP'
}

// ============================================================================
// API Response Types
// ============================================================================

export type SendleOrderState =
  | 'Booking'
  | 'Pickup'
  | 'Transit'
  | 'Delivered'
  | 'Cancelled'
  | 'Unable to Book'
  | 'Lost'
  | 'Return to Sender'

export interface SendleApiLabel {
  format: 'pdf' | 'png' | 'zpl'
  size: 'a4' | 'cropped' | '4x6'
  url: string
}

export interface SendleOrderScheduling {
  is_cancellable: boolean
  pickup_date: string
  picked_up_on?: string
  delivered_on?: string
  estimated_delivery_date_minimum?: string
  estimated_delivery_date_maximum?: string
}

export interface SendleOrderResponse {
  order_id: string
  state: SendleOrderState
  order_url: string
  sendle_reference: string
  tracking_url: string
  labels: SendleApiLabel[]
  scheduling: SendleOrderScheduling
  price: {
    gross: {
      amount: number
      currency: string
    }
    net: {
      amount: number
      currency: string
    }
    tax: {
      amount: number
      currency: string
    }
  }
  sender?: {
    contact: SendleApiContact
    address: SendleApiAddress
    instructions?: string
  }
  receiver?: {
    contact: SendleApiContact
    address: SendleApiAddress
    instructions?: string
  }
  description?: string
  weight?: {
    value: number
    units: string
  }
  customer_reference?: string
}

// ============================================================================
// Application Types
// ============================================================================

export interface SendleBooking {
  orderId: string
  state: SendleOrderState
  orderUrl: string
  sendleReference: string
  trackingUrl: string
  labels: {
    format: string
    size: string
    url: string
  }[]
  scheduling: {
    isCancellable: boolean
    pickupDate: string
    pickedUpOn?: string
    deliveredOn?: string
    estimatedDeliveryMin?: string
    estimatedDeliveryMax?: string
  }
  priceGrossCents: number
  priceNetCents: number
  taxCents: number
  currency: string
  customerReference?: string
}

// ============================================================================
// Input Types
// ============================================================================

export interface AddressInput {
  line1: string
  line2?: string
  suburb: string
  postcode: string
  state: string
  country?: string // Default: AU
}

export interface ContactInput {
  name: string
  email?: string
  phone?: string
  company?: string
}

export interface CreateOrderInput {
  sender: {
    contact: ContactInput
    address: AddressInput
    instructions?: string
  }
  receiver: {
    contact: ContactInput
    address: AddressInput
    instructions?: string
  }
  /** Package contents description */
  description: string
  /** Weight in kg */
  weightKg: number
  /** Optional dimensions in cm */
  dimensions?: {
    lengthCm: number
    widthCm: number
    heightCm: number
  }
  /** Our order reference number */
  customerReference?: string
  /** Custom metadata */
  metadata?: Record<string, string>
  /** Hide sender details on label */
  hideSenderDetails?: boolean
  /** Pickup date (defaults to next business day) */
  pickupDate?: string
  /** First mile option */
  firstMileOption?: 'pickup' | 'drop off'
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a shipping order with Sendle
 *
 * @param client - Sendle API client
 * @param input - Order creation parameters
 * @returns Sendle booking with tracking info and label URLs
 */
export async function createOrder(
  client: SendleClient,
  input: CreateOrderInput
): Promise<SendleBooking> {
  const orderData: SendleOrderRequest = {
    sender: {
      contact: mapContactInput(input.sender.contact),
      address: mapAddressInput(input.sender.address),
      instructions: input.sender.instructions,
    },
    receiver: {
      contact: mapContactInput(input.receiver.contact),
      address: mapAddressInput(input.receiver.address),
      instructions: input.receiver.instructions,
    },
    description: input.description,
    weight: {
      value: input.weightKg,
      units: 'kg',
    },
    customer_reference: input.customerReference,
    metadata: input.metadata,
    hide_sender_details: input.hideSenderDetails,
    pickup_date: input.pickupDate || getNextBusinessDay(),
    first_mile_option: input.firstMileOption,
  }

  // Add dimensions if provided
  if (input.dimensions) {
    orderData.dimensions = {
      length: input.dimensions.lengthCm,
      width: input.dimensions.widthCm,
      height: input.dimensions.heightCm,
      units: 'cm',
    }
  }

  const response = await client.post<SendleOrderResponse>('/orders', orderData)
  return mapOrderResponse(response)
}

/**
 * Get order details by ID
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @returns Order details
 */
export async function getOrder(
  client: SendleClient,
  orderId: string
): Promise<SendleBooking> {
  const response = await client.get<SendleOrderResponse>(`/orders/${orderId}`)
  return mapOrderResponse(response)
}

/**
 * Cancel a Sendle order
 *
 * Orders can only be cancelled before pickup. Check `scheduling.isCancellable`
 * to determine if the order can still be cancelled.
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 */
export async function cancelOrder(
  client: SendleClient,
  orderId: string
): Promise<void> {
  await client.delete(`/orders/${orderId}`)
}

/**
 * Get the label URL for an order
 *
 * @param client - Sendle API client
 * @param orderId - Sendle order ID
 * @param format - Label format (default: pdf)
 * @param size - Label size (default: a4)
 * @returns Label URL or null if not found
 */
export async function getLabel(
  client: SendleClient,
  orderId: string,
  format: 'pdf' | 'png' | 'zpl' = 'pdf',
  size: 'a4' | 'cropped' | '4x6' = 'a4'
): Promise<string | null> {
  const order = await getOrder(client, orderId)

  // Find matching label
  const label = order.labels.find(
    (l) => l.format === format && l.size === size
  )

  if (label) {
    return label.url
  }

  // Fallback: find any label with matching format
  const anyFormatMatch = order.labels.find((l) => l.format === format)
  if (anyFormatMatch) {
    return anyFormatMatch.url
  }

  // Fallback: return first available label
  return order.labels[0]?.url || null
}

/**
 * List recent orders
 *
 * @param client - Sendle API client
 * @param limit - Maximum number of orders to return (default: 50)
 * @returns Array of orders
 */
export async function listOrders(
  client: SendleClient,
  limit: number = 50
): Promise<SendleBooking[]> {
  const response = await client.get<SendleOrderResponse[]>('/orders', {
    per_page: limit.toString(),
  })

  return response.map(mapOrderResponse)
}

// ============================================================================
// Helpers
// ============================================================================

function mapContactInput(contact: ContactInput): SendleApiContact {
  return {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
  }
}

function mapAddressInput(address: AddressInput): SendleApiAddress {
  return {
    address_line1: address.line1,
    address_line2: address.line2,
    suburb: address.suburb,
    postcode: address.postcode,
    state_name: address.state,
    country: address.country || 'AU',
  }
}

function mapOrderResponse(response: SendleOrderResponse): SendleBooking {
  return {
    orderId: response.order_id,
    state: response.state,
    orderUrl: response.order_url,
    sendleReference: response.sendle_reference,
    trackingUrl: response.tracking_url,
    labels: response.labels.map((l) => ({
      format: l.format,
      size: l.size,
      url: l.url,
    })),
    scheduling: {
      isCancellable: response.scheduling.is_cancellable,
      pickupDate: response.scheduling.pickup_date,
      pickedUpOn: response.scheduling.picked_up_on,
      deliveredOn: response.scheduling.delivered_on,
      estimatedDeliveryMin: response.scheduling.estimated_delivery_date_minimum,
      estimatedDeliveryMax: response.scheduling.estimated_delivery_date_maximum,
    },
    priceGrossCents: dollarsToCents(response.price.gross.amount),
    priceNetCents: dollarsToCents(response.price.net.amount),
    taxCents: dollarsToCents(response.price.tax.amount),
    currency: response.price.gross.currency,
    customerReference: response.customer_reference,
  }
}
