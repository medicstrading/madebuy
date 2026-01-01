import { NextRequest, NextResponse } from 'next/server'
import { shipments, orders, tenants } from '@madebuy/db'
import {
  CARRIER_NAMES,
  SHIPMENT_STATUS_MESSAGES,
  type PublicTrackingResponse,
  type ShipmentStatus,
} from '@madebuy/shared'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

/**
 * GET /api/tracking/[trackingNumber]
 *
 * Public tracking API endpoint
 * No authentication required - anyone with tracking number can view
 * Rate limited to prevent abuse
 *
 * Returns privacy-conscious tracking info:
 * - Tracking number and carrier
 * - Current status and events
 * - Shop name (no sensitive seller data)
 * - Order number (last 4 chars only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params

  // Get IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Check rate limit
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  // Validate tracking number
  if (!trackingNumber || trackingNumber.length < 5) {
    return NextResponse.json(
      { error: 'Invalid tracking number' },
      { status: 400 }
    )
  }

  try {
    // Look up shipment
    const shipment = await shipments.getShipmentByTrackingNumber(trackingNumber)

    if (!shipment) {
      return NextResponse.json(
        { error: 'Tracking number not found' },
        { status: 404 }
      )
    }

    // Get order and tenant
    const order = await orders.getOrder(shipment.tenantId, shipment.orderId)
    const tenant = await tenants.getTenantById(shipment.tenantId)

    if (!order || !tenant) {
      return NextResponse.json(
        { error: 'Order information not available' },
        { status: 404 }
      )
    }

    // Build privacy-conscious response
    const carrierName = CARRIER_NAMES[shipment.carrier] || shipment.carrier
    const status = shipment.status as ShipmentStatus
    const statusMessage = SHIPMENT_STATUS_MESSAGES[status] || 'Status unknown'

    // Format events
    const events = (shipment.trackingEvents || []).map((event) => ({
      timestamp: event.timestamp instanceof Date
        ? event.timestamp.toISOString()
        : String(event.timestamp),
      status: event.status as ShipmentStatus,
      description: event.description,
      location: event.location,
    }))

    // Format estimated delivery
    const estimatedDelivery = shipment.estimatedDeliveryDate || shipment.estimatedDelivery
    const estimatedDeliveryStr = estimatedDelivery
      ? (estimatedDelivery instanceof Date
          ? estimatedDelivery.toISOString()
          : String(estimatedDelivery))
      : undefined

    const estimatedDeliveryRange = shipment.estimatedDeliveryRange
      ? [
          shipment.estimatedDeliveryRange[0] instanceof Date
            ? shipment.estimatedDeliveryRange[0].toISOString()
            : String(shipment.estimatedDeliveryRange[0]),
          shipment.estimatedDeliveryRange[1] instanceof Date
            ? shipment.estimatedDeliveryRange[1].toISOString()
            : String(shipment.estimatedDeliveryRange[1]),
        ] as [string, string]
      : undefined

    const response: PublicTrackingResponse = {
      trackingNumber: shipment.trackingNumber!,
      carrier: shipment.carrier,
      carrierName,
      status,
      statusMessage,
      estimatedDelivery: estimatedDeliveryStr,
      estimatedDeliveryRange,
      events,
      shop: {
        name: tenant.businessName || 'Seller',
        slug: tenant.slug,
      },
      orderNumberLast4: order.orderNumber?.slice(-4) || order.id.slice(-4),
      carrierTrackingUrl: shipment.trackingUrl,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Tracking lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve tracking information' },
      { status: 500 }
    )
  }
}
