/**
 * POST /api/fulfillment/quotes
 * Get shipping quotes from Sendle
 *
 * Body:
 * {
 *   orderId: string,
 *   package: { weightGrams, lengthCm, widthCm, heightCm }
 * }
 *
 * Returns: { quotes: SendleQuote[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { orders, tenants } from '@madebuy/db'
import { Sendle } from '@madebuy/shared/src/integrations'
import type { SendleConfig } from '@madebuy/shared/src/integrations'

export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, package: packageDetails } = body

    if (!orderId || !packageDetails) {
      return NextResponse.json(
        { error: 'Missing orderId or package details' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await orders.getOrder(tenant.id, orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get tenant data for pickup address
    const tenantData = await tenants.getTenantById(tenant.id)

    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check for Sendle integration
    // For now, use environment variables as fallback
    const sendleConfig: SendleConfig = {
      apiKey: process.env.SENDLE_API_KEY || '',
      sendleId: process.env.SENDLE_ID || '',
      sandbox: process.env.SENDLE_SANDBOX === 'true',
    }

    if (!sendleConfig.apiKey || !sendleConfig.sendleId) {
      return NextResponse.json(
        { error: 'Sendle integration not configured. Please set up Sendle in settings.' },
        { status: 400 }
      )
    }

    // Default pickup suburb/postcode - should come from tenant settings
    const pickupSuburb = process.env.SENDLE_PICKUP_SUBURB || 'Brisbane'
    const pickupPostcode = process.env.SENDLE_PICKUP_POSTCODE || '4000'

    // Get quotes
    const quotes = await Sendle.getQuote(sendleConfig, {
      pickupSuburb,
      pickupPostcode,
      deliverySuburb: order.shippingAddress.city,
      deliveryPostcode: order.shippingAddress.postcode,
      weight: packageDetails.weightGrams / 1000, // Convert to kg
      volume: {
        length: packageDetails.lengthCm,
        width: packageDetails.widthCm,
        height: packageDetails.heightCm,
      },
    })

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Error getting quotes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get quotes' },
      { status: 500 }
    )
  }
}
