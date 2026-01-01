/**
 * GET /api/fulfillment/label/[shipmentId]
 * Get printable label for a shipment
 *
 * Query: ?format=pdf|png&size=a4|4x6
 * Returns: { labelUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { shipments } from '@madebuy/db'
import { Sendle } from '@madebuy/shared/src/integrations'
import type { SendleConfig } from '@madebuy/shared/src/integrations'

interface RouteParams {
  params: Promise<{ shipmentId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shipmentId } = await params

    // Parse query params
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || 'pdf') as 'pdf' | 'png'
    const sizeParam = searchParams.get('size') || 'a4'
    const size = sizeParam === '4x6' ? 'cropped' : 'a4' // Sendle uses 'cropped' for 4x6

    // Get the shipment
    const shipment = await shipments.getShipment(tenant.id, shipmentId)

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // If not Sendle, return existing label URL
    if (shipment.carrier !== 'sendle' || !shipment.sendleOrderId) {
      if (shipment.labelUrl) {
        return NextResponse.json({ labelUrl: shipment.labelUrl })
      }
      return NextResponse.json(
        { error: 'No label available for this shipment' },
        { status: 404 }
      )
    }

    // Get fresh label from Sendle
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

    try {
      const labelUrl = await Sendle.getLabel(
        sendleConfig,
        shipment.sendleOrderId,
        format,
        size as 'a4' | 'cropped'
      )

      // Update the stored label URL if it changed
      if (labelUrl !== shipment.labelUrl) {
        await shipments.updateShipmentLabel(tenant.id, shipmentId, {
          trackingNumber: shipment.trackingNumber || '',
          trackingUrl: shipment.trackingUrl || '',
          labelUrl,
        })
      }

      return NextResponse.json({ labelUrl })
    } catch (error) {
      // Return cached label URL if Sendle API fails
      if (shipment.labelUrl) {
        return NextResponse.json({ labelUrl: shipment.labelUrl })
      }
      throw error
    }
  } catch (error) {
    console.error('Error getting label:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get label' },
      { status: 500 }
    )
  }
}
