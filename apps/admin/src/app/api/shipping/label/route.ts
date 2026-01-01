import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { Sendle } from '@madebuy/shared/src/integrations'
import { orders, shipments } from '@madebuy/db'
import type { SendleIntegration, Address } from '@madebuy/shared'

/**
 * POST /api/shipping/label
 * Create shipping label via Sendle
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    // Check if Sendle is configured
    const sendleConfig = (tenant.integrations as { sendle?: SendleIntegration })?.sendle
    if (!sendleConfig) {
      return NextResponse.json(
        { error: 'Sendle integration not configured' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { orderId, weight, description } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await orders.getOrder(tenant.id, orderId)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if shipment already exists
    let shipment = await shipments.getShipmentByOrder(tenant.id, orderId)
    if (shipment?.status === 'label_created' || shipment?.status === 'in_transit') {
      return NextResponse.json(
        { error: 'Shipping label already created for this order' },
        { status: 400 }
      )
    }

    // Get pickup address from tenant's shipping config or use a default
    const pickupAddress: Address = tenant.shippingConfig?.localPickupAddress
      ? parsePickupAddress(tenant.shippingConfig.localPickupAddress)
      : {
          line1: 'Not configured',
          city: 'Brisbane',
          state: 'QLD',
          postcode: '4000',
          country: 'AU',
        }

    // Create Sendle order
    const sendleOrder = await Sendle.createOrder(
      {
        apiKey: sendleConfig.apiKey,
        sendleId: sendleConfig.sendleId,
        sandbox: sendleConfig.sandbox,
      },
      {
        pickupAddress,
        deliveryAddress: order.shippingAddress,
        weight: weight || 1, // Default 1kg if not specified
        description: description || `Order ${order.orderNumber}`,
        customerReference: order.orderNumber,
        senderName: tenant.businessName,
        senderEmail: tenant.email,
      }
    )

    // Create or update shipment record
    if (!shipment) {
      shipment = await shipments.createShipment(tenant.id, orderId, {
        carrier: 'sendle',
        weight: weight || 1,
      })
    }

    // Update shipment with label info
    const labelUrl = sendleOrder.labels?.[0]?.url || ''
    await shipments.updateShipmentLabel(tenant.id, shipment.id, {
      trackingNumber: sendleOrder.order_id,
      trackingUrl: sendleOrder.tracking_url,
      labelUrl,
      sendleOrderId: sendleOrder.order_id,
    })

    // Update order with tracking info
    await orders.updateOrder(tenant.id, orderId, {
      trackingNumber: sendleOrder.order_id,
      carrier: 'sendle',
      status: 'processing',
    })

    return NextResponse.json({
      success: true,
      shipment: {
        id: shipment.id,
        orderId,
        trackingNumber: sendleOrder.order_id,
        trackingUrl: sendleOrder.tracking_url,
        labelUrl,
        status: 'label_created',
      },
    })
  } catch (error) {
    console.error('Shipping label error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create shipping label',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shipping/label?orderId=xxx
 * Get shipping label URL for an order
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant()

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const shipment = await shipments.getShipmentByOrder(tenant.id, orderId)
    if (!shipment) {
      return NextResponse.json(
        { error: 'No shipment found for this order' },
        { status: 404 }
      )
    }

    if (!shipment.labelUrl) {
      return NextResponse.json(
        { error: 'No label available for this shipment' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      labelUrl: shipment.labelUrl,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
    })
  } catch (error) {
    console.error('Get label error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get shipping label',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Helper to parse pickup address string into Address object
function parsePickupAddress(addressString: string): Address {
  // Simple parsing - in production you'd want more robust parsing
  const parts = addressString.split(',').map(s => s.trim())
  return {
    line1: parts[0] || '',
    city: parts[1] || '',
    state: parts[2] || 'QLD',
    postcode: parts[3] || '',
    country: 'AU',
  }
}
