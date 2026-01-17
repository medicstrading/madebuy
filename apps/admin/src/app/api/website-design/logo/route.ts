import { tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { logoMediaId } = body

    // Get current tenant
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Update logo (available for all plans)
    await tenants.updateTenant(user.id, {
      logoMediaId: logoMediaId || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update logo:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
