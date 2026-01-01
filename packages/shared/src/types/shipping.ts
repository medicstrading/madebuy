/**
 * Shipping - Types for shipping profiles, carriers, and shipments
 */

import type { Address } from './order'

export type ShippingCarrier = 'sendle' | 'auspost' | 'manual'

export interface ShippingProfile {
  id: string
  tenantId: string
  name: string
  carrier: ShippingCarrier
  isDefault: boolean

  // Rate calculation
  rateType: 'flat' | 'weight' | 'calculated'
  flatRate?: number
  weightRates?: WeightRate[]
  freeShippingThreshold?: number

  // Restrictions
  domesticOnly: boolean
  maxWeight?: number

  createdAt: Date
  updatedAt: Date
}

export interface WeightRate {
  minWeight: number
  maxWeight: number
  rate: number
}

export interface Shipment {
  id: string
  tenantId: string
  orderId: string
  carrier: ShippingCarrier
  trackingNumber?: string
  trackingUrl?: string
  labelUrl?: string
  status: ShipmentStatus

  // Sendle specific
  sendleOrderId?: string

  weight?: number
  dimensions?: ShipmentDimensions

  shippedAt?: Date
  deliveredAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type ShipmentStatus =
  | 'pending'
  | 'label_created'
  | 'in_transit'
  | 'delivered'
  | 'failed'

export interface ShipmentDimensions {
  length: number
  width: number
  height: number
}

// Sendle API types
export interface SendleQuote {
  quote_id: string
  plan_name: string
  price: {
    gross: { amount: number; currency: string }
    net: { amount: number; currency: string }
    tax: { amount: number; currency: string }
  }
  eta: {
    days_range: [number, number]
    date_range: [string, string]
    for_pickup_date: string
  }
  route: {
    type: string
    description: string
  }
}

export interface SendleOrder {
  order_id: string
  order_url: string
  state: string
  tracking_url: string
  labels?: SendleLabel[]
  customer_reference?: string
  sender?: SendleContact
  receiver?: SendleContact
  weight?: {
    value: number
    units: string
  }
}

export interface SendleLabel {
  format: string
  size: string
  url: string
}

export interface SendleContact {
  contact?: {
    name?: string
    phone?: string
    email?: string
    company?: string
  }
  address?: {
    address_line1?: string
    address_line2?: string
    suburb?: string
    postcode?: string
    state_name?: string
    country?: string
  }
}

export interface SendleTracking {
  state: string
  tracking_events: SendleTrackingEvent[]
}

export interface SendleTrackingEvent {
  event_type: string
  scan_time: string
  description: string
  reason?: string
  location?: string
}

// Input types for creating shipments
export interface CreateShipmentInput {
  orderId: string
  carrier: ShippingCarrier
  weight?: number
  dimensions?: ShipmentDimensions
}

export interface CreateLabelInput {
  pickupAddress: Address
  deliveryAddress: Address
  weight: number
  description: string
  customerReference: string
}

export interface ShippingProfileInput {
  name: string
  carrier: ShippingCarrier
  isDefault?: boolean
  rateType: 'flat' | 'weight' | 'calculated'
  flatRate?: number
  weightRates?: WeightRate[]
  freeShippingThreshold?: number
  domesticOnly?: boolean
  maxWeight?: number
}

// Sendle credentials stored in tenant integrations
export interface SendleIntegration {
  apiKey: string
  sendleId: string
  sandbox?: boolean
  connectedAt: Date
}
