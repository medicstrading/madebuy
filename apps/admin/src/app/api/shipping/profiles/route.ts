import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { shippingProfiles } from '@madebuy/db'
import type { ShippingProfileInput } from '@madebuy/shared'

/**
 * GET /api/shipping/profiles
 * List all shipping profiles
 */
export async function GET() {
  try {
    const tenant = await requireTenant()
    const profiles = await shippingProfiles.listProfiles(tenant.id)

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('List shipping profiles error:', error)
    return NextResponse.json(
      { error: 'Failed to list shipping profiles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shipping/profiles
 * Create a new shipping profile
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant()
    const body = await request.json()

    // Validate required fields
    const { name, carrier, rateType } = body
    if (!name || !carrier || !rateType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, carrier, rateType' },
        { status: 400 }
      )
    }

    // Validate carrier
    if (!['sendle', 'auspost', 'manual'].includes(carrier)) {
      return NextResponse.json(
        { error: 'Invalid carrier. Must be: sendle, auspost, or manual' },
        { status: 400 }
      )
    }

    // Validate rate type
    if (!['flat', 'weight', 'calculated'].includes(rateType)) {
      return NextResponse.json(
        { error: 'Invalid rateType. Must be: flat, weight, or calculated' },
        { status: 400 }
      )
    }

    const profileInput: ShippingProfileInput = {
      name,
      carrier,
      rateType,
      isDefault: body.isDefault,
      flatRate: body.flatRate,
      weightRates: body.weightRates,
      freeShippingThreshold: body.freeShippingThreshold,
      domesticOnly: body.domesticOnly ?? true,
      maxWeight: body.maxWeight,
    }

    const profile = await shippingProfiles.createProfile(tenant.id, profileInput)

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Create shipping profile error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create shipping profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
