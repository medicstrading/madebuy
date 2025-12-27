import { NextResponse } from 'next/server'
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
