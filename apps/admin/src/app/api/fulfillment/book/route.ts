/**
 * POST /api/fulfillment/book
 * Book a shipment with carrier
 *
 * Body:
 * {
 *   orderId: string,
 *   carrier: 'sendle' | 'manual',
 *   quoteId?: string, // For Sendle
 *   manualCarrier?: string, // For manual
 *   trackingNumber?: string, // For manual
 *   package?: { weightGrams, lengthCm, widthCm, heightCm }
 * }
 *
 * Returns: { shipment: Shipment }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders, shipments, tenants } from '@madebuy/db'
import { Sendle } from '@madebuy/shared/src/integrations'
import type { SendleConfig } from '@madebuy/shared/src/integrations'

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, carrier, quoteId, manualCarrier, trackingNumber, package: packageDetails } = body

    if (!orderId || !carrier) {
      return NextResponse.json(
        { error: 'Missing orderId or carrier' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await orders.getOrder(tenant.id, orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if already has a shipment
    const existingShipment = await shipments.getShipmentByOrder(tenant.id, orderId)

    if (existingShipment) {
      return NextResponse.json(
        { error: 'Order already has a shipment' },
        { status: 400 }
      )
    }

    // Get tenant data
    const tenantData = await tenants.getTenantById(tenant.id)

    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    let shipmentData

    if (carrier === 'manual') {
      // Manual shipment - just record the tracking info
      shipmentData = await shipments.createShipment(tenant.id, orderId, {
        carrier: 'manual',
        weight: packageDetails?.weightGrams ? packageDetails.weightGrams / 1000 : undefined,
        dimensions: packageDetails ? {
          length: packageDetails.lengthCm,
          width: packageDetails.widthCm,
          height: packageDetails.heightCm,
        } : undefined,
      })

      // Update with tracking info if provided
      if (trackingNumber) {
        // Generate tracking URL based on carrier
        const trackingUrl = getTrackingUrl(manualCarrier || 'other', trackingNumber)

        shipmentData = await shipments.updateShipmentLabel(tenant.id, shipmentData.id, {
          trackingNumber,
          trackingUrl: trackingUrl || '',
          labelUrl: '',
        })
      }

      // Update status to in_transit
      shipmentData = await shipments.updateShipmentStatus(
        tenant.id,
        shipmentData!.id,
        'in_transit'
      )

      // Update order status
      await orders.updateOrder(tenant.id, orderId, {
        status: 'shipped',
        trackingNumber: trackingNumber || undefined,
        carrier: manualCarrier || 'manual',
        shippedAt: new Date(),
      })
    } else if (carrier === 'sendle') {
      // Book with Sendle
      const sendleConfig: SendleConfig = {
        apiKey: process.env.SENDLE_API_KEY || '',
        sendleId: process.env.SENDLE_ID || '',
        sandbox: process.env.SENDLE_SANDBOX === 'true',
      }

      if (!sendleConfig.apiKey || !sendleConfig.sendleId) {
        return NextResponse.json(
          { error: 'Sendle integration not configured' },
          { status: 400 }
        )
      }

      // Default pickup address - should come from tenant settings
      const pickupAddress = {
        line1: process.env.SENDLE_PICKUP_ADDRESS || 'Pickup Address',
        city: process.env.SENDLE_PICKUP_SUBURB || 'Brisbane',
        state: process.env.SENDLE_PICKUP_STATE || 'QLD',
        postcode: process.env.SENDLE_PICKUP_POSTCODE || '4000',
        country: 'AU',
      }

      // Create Sendle order
      const sendleOrder = await Sendle.createOrder(sendleConfig, {
        pickupAddress,
        deliveryAddress: order.shippingAddress,
        weight: packageDetails?.weightGrams ? packageDetails.weightGrams / 1000 : 0.5,
        description: `Order ${order.orderNumber}`,
        customerReference: order.orderNumber,
        senderName: tenantData.businessName,
        senderEmail: tenantData.email,
      })

      // Create shipment record
      shipmentData = await shipments.createShipment(tenant.id, orderId, {
        carrier: 'sendle',
        weight: packageDetails?.weightGrams ? packageDetails.weightGrams / 1000 : 0.5,
        dimensions: packageDetails ? {
          length: packageDetails.lengthCm,
          width: packageDetails.widthCm,
          height: packageDetails.heightCm,
        } : undefined,
      })

      // Get label URL
      let labelUrl = ''
      try {
        labelUrl = await Sendle.getLabel(sendleConfig, sendleOrder.order_id)
      } catch (e) {
        // Label might not be ready immediately
        console.log('Label not ready yet:', e)
      }

      // Update with Sendle info
      shipmentData = await shipments.updateShipmentLabel(tenant.id, shipmentData.id, {
        trackingNumber: sendleOrder.order_id,
        trackingUrl: sendleOrder.tracking_url,
        labelUrl: labelUrl || sendleOrder.order_url,
        sendleOrderId: sendleOrder.order_id,
      })

      // Update order status
      await orders.updateOrder(tenant.id, orderId, {
        status: 'processing',
        trackingNumber: sendleOrder.order_id,
        carrier: 'sendle',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid carrier' },
        { status: 400 }
      )
    }

    return NextResponse.json({ shipment: shipmentData })
  } catch (error) {
    console.error('Error booking shipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to book shipment' },
      { status: 500 }
    )
  }
}

function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const trackingUrls: Record<string, string> = {
    australia_post: `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`,
    sendle: `https://track.sendle.com/tracking?ref=${trackingNumber}`,
    aramex: `https://www.aramex.com/track/results?ShipmentNumber=${trackingNumber}`,
    dhl: `https://www.dhl.com/au-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    tnt: `https://www.tnt.com/express/en_au/site/tracking.html?searchType=con&cons=${trackingNumber}`,
    startrack: `https://startrack.com.au/track/details/${trackingNumber}`,
    fastway: `https://www.aramex.com.au/tools/track/?l=${trackingNumber}`,
  }

  return trackingUrls[carrier] || null
}
