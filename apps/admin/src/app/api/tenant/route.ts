import { tenants } from '@madebuy/db'
import { safeValidateUpdateTenant, sanitizeInput } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await tenants.getTenantById(user.id)

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Failed to fetch tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate with Zod
    const validation = safeValidateUpdateTenant(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const updates = validation.data

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      )
    }

    // Sanitize text fields
    const sanitizedUpdates = {
      ...updates,
      businessName: updates.businessName ? sanitizeInput(updates.businessName) : undefined,
      tagline: updates.tagline ? sanitizeInput(updates.tagline) : undefined,
      description: updates.description ? sanitizeInput(updates.description) : undefined,
      location: updates.location ? sanitizeInput(updates.location) : undefined,
    }

    // Remove undefined fields
    const cleanedUpdates = Object.fromEntries(
      Object.entries(sanitizedUpdates).filter(([_, v]) => v !== undefined)
    )

    await tenants.updateTenant(user.id, cleanedUpdates)

    // Return updated tenant
    const updatedTenant = await tenants.getTenantById(user.id)
    return NextResponse.json(updatedTenant)
  } catch (error) {
    console.error('Failed to update tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
