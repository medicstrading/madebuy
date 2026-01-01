/**
 * POST /api/fulfillment/cancel
 * Cancel a booked shipment (if allowed by carrier)
 *
 * Body:
 * {
 *   shipmentId: string
 * }
 *
 * Returns: { success: boolean, message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders, shipments } from '@madebuy/db'
import { Sendle } from '@madebuy/shared/src/integrations'
import type { SendleConfig } from '@madebuy/shared/src/integrations'

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shipmentId } = body

    if (!shipmentId) {
      return NextResponse.json(
        { error: 'Missing shipmentId' },
        { status: 400 }
      )
    }

    // Get the shipment
    const shipment = await shipments.getShipment(tenant.id, shipmentId)

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // Check if shipment can be cancelled
    if (shipment.status === 'in_transit' || shipment.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot cancel a shipment that is already in transit or delivered' },
        { status: 400 }
      )
    }

    // If Sendle, cancel with Sendle API
    if (shipment.carrier === 'sendle' && shipment.sendleOrderId) {
      const sendleConfig: SendleConfig = {
        apiKey: process.env.SENDLE_API_KEY || '',
        sendleId: process.env.SENDLE_ID || '',
        sandbox: process.env.SENDLE_SANDBOX === 'true',
      }

      if (sendleConfig.apiKey && sendleConfig.sendleId) {
        try {
          await Sendle.cancelOrder(sendleConfig, shipment.sendleOrderId)
        } catch (error) {
          console.error('Failed to cancel Sendle order:', error)
          // Continue with local cancellation even if Sendle API fails
        }
      }
    }

    // Delete the shipment record
    await shipments.deleteShipment(tenant.id, shipmentId)

    // Update the order status back to processing
    await orders.updateOrder(tenant.id, shipment.orderId, {
      status: 'processing',
      trackingNumber: undefined,
      carrier: undefined,
      shippedAt: undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Shipment cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling shipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel shipment' },
      { status: 500 }
    )
  }
}
