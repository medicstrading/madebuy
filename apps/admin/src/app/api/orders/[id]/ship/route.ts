import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders, pieces, tenants } from '@madebuy/db'
import { createSendleClient, SendleError } from '@madebuy/shipping'

interface ShipOrderRequest {
  // Optional overrides for parcel dimensions
  weightGrams?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  description?: string
}

/**
 * POST /api/orders/[id]/ship
 * Generate a shipping label for an order via Sendle
 *
 * Creates a Sendle shipping order and returns the label PDF URL.
 * Updates the order with tracking information.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the order
    const order = await orders.getOrder(tenant.id, params.id)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order is already shipped
    if (order.sendleOrderId) {
      return NextResponse.json(
        {
          error: 'Shipping label already generated',
          labelUrl: order.labelUrl,
          trackingNumber: order.sendleReference,
          trackingUrl: order.trackingUrl,
        },
        { status: 400 }
      )
    }

    // Check if order is paid
    if (order.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Cannot ship unpaid order' },
        { status: 400 }
      )
    }

    // Check if digital-only order
    if (order.isDigitalOnly) {
      return NextResponse.json(
        { error: 'Cannot ship digital-only order' },
        { status: 400 }
      )
    }

    // Check if Sendle is configured
    const fullTenant = await tenants.getTenantById(tenant.id)
    if (!fullTenant?.sendleSettings?.isConnected || !fullTenant.sendleSettings.apiKey) {
      return NextResponse.json(
        { error: 'Sendle shipping not configured. Please set up Sendle in Settings > Shipping.' },
        { status: 400 }
      )
    }

    // Get request body for optional overrides
    const body: ShipOrderRequest = await request.json().catch(() => ({}))

    // Calculate parcel dimensions from order items
    let totalWeightGrams = 0
    let maxLength = 20
    let maxWidth = 15
    let totalHeight = 0

    for (const item of order.items) {
      const piece = await pieces.getPiece(tenant.id, item.pieceId)
      if (piece) {
        const qty = item.quantity || 1
        totalWeightGrams += (piece.shippingWeight || 250) * qty
        maxLength = Math.max(maxLength, piece.shippingLength || 20)
        maxWidth = Math.max(maxWidth, piece.shippingWidth || 15)
        totalHeight += (piece.shippingHeight || 5) * qty
      } else {
        totalWeightGrams += 250 * (item.quantity || 1)
        totalHeight += 5 * (item.quantity || 1)
      }
    }

    // Apply overrides if provided
    const weightGrams = body.weightGrams || totalWeightGrams || 500
    const lengthCm = body.lengthCm || maxLength
    const widthCm = body.widthCm || maxWidth
    const heightCm = body.heightCm || totalHeight || 10

    // Create Sendle client
    const client = createSendleClient({
      apiKey: fullTenant.sendleSettings.apiKey,
      senderId: fullTenant.sendleSettings.senderId!,
      environment: fullTenant.sendleSettings.environment,
    })

    // Build order description from items
    const itemDescriptions = order.items
      .map(item => `${item.quantity}x ${item.name}`)
      .join(', ')
    const description = body.description || itemDescriptions.substring(0, 100)

    try {
      // Create Sendle shipping order
      const sendleOrder = await client.createOrder({
        sender_address: {
          // TODO: Get seller's address from tenant settings
          address_line1: fullTenant.location || '123 Business St',
          suburb: 'BRISBANE',
          state_name: 'QLD',
          postcode: '4000',
          country: 'AU',
        },
        receiver_address: {
          address_line1: order.shippingAddress.line1,
          address_line2: order.shippingAddress.line2,
          suburb: order.shippingAddress.city,
          state_name: order.shippingAddress.state,
          postcode: order.shippingAddress.postcode,
          country: order.shippingAddress.country,
        },
        sender_contact: {
          name: fullTenant.businessName,
          email: fullTenant.email,
        },
        receiver_contact: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        parcel: {
          weight_value: weightGrams / 1000,
          weight_units: 'kg',
          length_value: lengthCm,
          width_value: widthCm,
          height_value: heightCm,
          dimension_units: 'cm',
          description,
        },
        customer_reference: order.orderNumber,
        metadata: {
          order_id: order.id,
          tenant_id: tenant.id,
        },
      })

      // Update order with shipping info
      await orders.updateOrder(tenant.id, order.id, {
        status: 'shipped',
        sendleOrderId: sendleOrder.order_id,
        sendleReference: sendleOrder.sendle_reference,
        trackingNumber: sendleOrder.sendle_reference,
        trackingUrl: sendleOrder.tracking_url,
        labelUrl: sendleOrder.labels.pdf_url,
        carrier: 'Sendle',
        shippedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        sendleOrderId: sendleOrder.order_id,
        trackingNumber: sendleOrder.sendle_reference,
        trackingUrl: sendleOrder.tracking_url,
        labelUrl: sendleOrder.labels.pdf_url,
      })
    } catch (sendleError) {
      if (sendleError instanceof SendleError) {
        console.error('Sendle API error:', sendleError.message, sendleError.details)
        return NextResponse.json(
          {
            error: `Sendle API error: ${sendleError.message}`,
            details: sendleError.details,
          },
          { status: sendleError.statusCode >= 400 && sendleError.statusCode < 500 ? 400 : 502 }
        )
      }
      throw sendleError
    }
  } catch (error) {
    console.error('Failed to generate shipping label:', error)
    return NextResponse.json(
      { error: 'Failed to generate shipping label' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders/[id]/ship
 * Get shipping status and label URL for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const order = await orders.getOrder(tenant.id, params.id)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!order.sendleOrderId) {
      return NextResponse.json({
        hasLabel: false,
        status: order.status,
      })
    }

    return NextResponse.json({
      hasLabel: true,
      sendleOrderId: order.sendleOrderId,
      trackingNumber: order.sendleReference,
      trackingUrl: order.trackingUrl,
      labelUrl: order.labelUrl,
      carrier: order.carrier,
      status: order.status,
      shippedAt: order.shippedAt,
    })
  } catch (error) {
    console.error('Failed to get shipping status:', error)
    return NextResponse.json(
      { error: 'Failed to get shipping status' },
      { status: 500 }
    )
  }
}
