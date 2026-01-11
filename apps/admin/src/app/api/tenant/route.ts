import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { tenants } from '@madebuy/db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenant = await tenants.getTenantById(user.id)

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Failed to fetch tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Whitelist allowed fields for update
    const allowedFields = [
      'businessName',
      'tagline',
      'description',
      'location',
      'makerType',
      'customCategories',
      'customMaterialCategories',
      'primaryColor',
      'accentColor',
      'logoMediaId',
      'instagram',
      'facebook',
      'tiktok',
      'pinterest',
      'etsy',
      'websiteDesign',
      'onboardingComplete',
      'onboardingStep',
      'regionalSettings',
    ]

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    await tenants.updateTenant(user.id, updates)

    // Return updated tenant
    const updatedTenant = await tenants.getTenantById(user.id)
    return NextResponse.json(updatedTenant)
  } catch (error) {
    console.error('Failed to update tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
