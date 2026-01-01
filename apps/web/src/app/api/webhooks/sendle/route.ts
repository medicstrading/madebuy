import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { shipments, orders, tenants } from '@madebuy/db'
import {
  SENDLE_STATUS_MAP,
  type SendleWebhookPayload,
  type SendleTrackingEvent,
  type ShipmentStatus,
} from '@madebuy/shared'

// Webhook secret for signature verification
const SENDLE_WEBHOOK_SECRET = process.env.SENDLE_WEBHOOK_SECRET

/**
 * Verify Sendle webhook signature
 * Sendle uses HMAC-SHA256 for webhook signature verification
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!SENDLE_WEBHOOK_SECRET || !signature) {
    console.warn('Sendle webhook secret not configured or signature missing')
    // In development, allow unverified webhooks
    return process.env.NODE_ENV === 'development'
  }

  try {
    const expectedSignature = createHmac('sha256', SENDLE_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Map Sendle state to our shipment status
 */
function mapSendleState(state: string): ShipmentStatus {
  return SENDLE_STATUS_MAP[state] || 'in_transit'
}

/**
 * Convert Sendle tracking event to our format
 */
function convertTrackingEvent(
  event: SendleTrackingEvent,
  state: string
): Omit<TrackingEvent, 'id'> {
  return {
    timestamp: new Date(event.scan_time),
    status: mapSendleState(state) as ShipmentStatus,
    description: event.description,
    location: event.location,
    rawEventType: event.event_type,
  }
}

interface TrackingEvent {
  id?: string
  timestamp: Date
  status: ShipmentStatus | string
  description: string
  location?: string
  rawEventType?: string
}

/**
 * POST /api/webhooks/sendle
 *
 * Handle tracking updates from Sendle
 *
 * Sendle sends webhooks for:
 * - tracking_update: Package status changes
 * - order_update: Order-level changes (rarely used)
 *
 * Webhook payload includes:
 * - order_id: Sendle order reference
 * - state: Current status (Booked, Transit, Delivered, etc.)
 * - tracking_events: Array of tracking updates
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-sendle-signature')

  // Verify webhook signature
  if (!verifySignature(body, signature)) {
    console.error('Sendle webhook signature verification failed')
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  }

  let payload: SendleWebhookPayload

  try {
    payload = JSON.parse(body)
  } catch (error) {
    console.error('Failed to parse Sendle webhook payload:', error)
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  console.log('Sendle webhook received:', {
    event_type: payload.event_type,
    order_id: payload.order_id,
    state: payload.state,
  })

  try {
    // Find shipment by Sendle order ID
    const shipment = await shipments.getShipmentBySendleOrderId(payload.order_id)

    if (!shipment) {
      console.warn(`Shipment not found for Sendle order: ${payload.order_id}`)
      // Return success to prevent retries - shipment might have been deleted
      return NextResponse.json({ received: true, status: 'shipment_not_found' })
    }

    // Map Sendle state to our status
    const newStatus = mapSendleState(payload.state)

    // Only update if status has changed
    if (shipment.status !== newStatus) {
      // Get the latest tracking event
      const latestEvent = payload.tracking_events?.[0]
      const trackingEvent = latestEvent
        ? convertTrackingEvent(latestEvent, payload.state)
        : {
            timestamp: new Date(),
            status: newStatus,
            description: payload.description || `Status updated to ${payload.state}`,
          }

      // Update shipment status
      await shipments.updateShipmentStatus(
        shipment.tenantId,
        shipment.id,
        newStatus,
        undefined,
        trackingEvent
      )

      console.log(`Updated shipment ${shipment.id} to status: ${newStatus}`)

      // Update estimated delivery if provided
      if (payload.scheduling_info?.eta?.date_range) {
        const [startDate, endDate] = payload.scheduling_info.eta.date_range
        await shipments.updateEstimatedDelivery(
          shipment.tenantId,
          shipment.id,
          new Date(endDate), // Use end date as primary estimate
          [new Date(startDate), new Date(endDate)]
        )
      } else if (payload.estimated_delivery_date) {
        await shipments.updateEstimatedDelivery(
          shipment.tenantId,
          shipment.id,
          new Date(payload.estimated_delivery_date)
        )
      }

      // Trigger notification based on status change
      await triggerNotification(shipment.tenantId, shipment.id, newStatus)
    }

    return NextResponse.json({ received: true, status: newStatus })
  } catch (error) {
    console.error('Sendle webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Trigger notification based on status change
 * This is a placeholder - actual implementation in notification service
 */
async function triggerNotification(
  tenantId: string,
  shipmentId: string,
  status: ShipmentStatus
): Promise<void> {
  // Get shipment for notification preferences
  const shipment = await shipments.getShipment(tenantId, shipmentId)
  if (!shipment) return

  // Get order for customer details
  const order = await orders.getOrder(tenantId, shipment.orderId)
  if (!order) return

  // Check notification preferences
  const shouldNotify =
    (status === 'in_transit' || status === 'picked_up') && shipment.notifyOnShipped !== false ||
    status === 'out_for_delivery' && shipment.notifyOnOutForDelivery !== false ||
    status === 'delivered' && shipment.notifyOnDelivered !== false ||
    status === 'failed' // Always notify on failure

  if (!shouldNotify) return

  // Get tenant for shop info
  const tenant = await tenants.getTenantById(tenantId)
  if (!tenant) return

  // TODO: Import and call shipping notification service
  // For now, log that we would send a notification
  console.log('Would send notification:', {
    status,
    customerEmail: order.customerEmail,
    orderNumber: order.orderNumber,
    shopName: tenant.businessName,
    trackingNumber: shipment.trackingNumber,
  })

  // Example of how this would be called:
  // await sendShippingNotification(shipment, order, tenant, status)
}

/**
 * Handle GET requests for webhook verification
 * Some webhook systems require endpoint verification
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')

  if (challenge) {
    // Echo back the challenge for verification
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Sendle webhook endpoint active',
  })
}
