import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { Sendle } from '@madebuy/shared'
import type { SendleIntegration } from '@madebuy/shared'

/**
 * POST /api/shipping/quote
 * Get shipping quotes from Sendle
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

    // Validate required fields
    const {
      pickupSuburb,
      pickupPostcode,
      deliverySuburb,
      deliveryPostcode,
      weight,
      volume,
    } = body

    if (!pickupSuburb || !pickupPostcode || !deliverySuburb || !deliveryPostcode || !weight) {
      return NextResponse.json(
        { error: 'Missing required fields: pickupSuburb, pickupPostcode, deliverySuburb, deliveryPostcode, weight' },
        { status: 400 }
      )
    }

    // Get quotes from Sendle
    const quotes = await Sendle.getQuote(
      {
        apiKey: sendleConfig.apiKey,
        sendleId: sendleConfig.sendleId,
        sandbox: sendleConfig.sandbox,
      },
      {
        pickupSuburb,
        pickupPostcode,
        deliverySuburb,
        deliveryPostcode,
        weight: parseFloat(weight),
        volume: volume
          ? {
              length: parseFloat(volume.length),
              width: parseFloat(volume.width),
              height: parseFloat(volume.height),
            }
          : undefined,
      }
    )

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Shipping quote error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get shipping quotes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
