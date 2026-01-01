import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/session'
import { shippingProfiles } from '@madebuy/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/shipping/profiles/[id]
 * Get a specific shipping profile
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id } = await params

    const profile = await shippingProfiles.getProfile(tenant.id, id)
    if (!profile) {
      return NextResponse.json(
        { error: 'Shipping profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Get shipping profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get shipping profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shipping/profiles/[id]
 * Update a shipping profile
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id } = await params
    const body = await request.json()

    const profile = await shippingProfiles.updateProfile(tenant.id, id, body)
    if (!profile) {
      return NextResponse.json(
        { error: 'Shipping profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Update shipping profile error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update shipping profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/shipping/profiles/[id]
 * Delete a shipping profile
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const tenant = await requireTenant()
    const { id } = await params

    const deleted = await shippingProfiles.deleteProfile(tenant.id, id)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Shipping profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete shipping profile error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete shipping profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
