import { domains } from '@madebuy/db'
import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * POST /api/domain/verify
 * Verify domain DNS configuration
 */
export async function POST() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!tenant.customDomain) {
      return NextResponse.json(
        { error: 'No custom domain configured' },
        { status: 400 },
      )
    }

    const result = await domains.verifyDomain(tenant.id, tenant.customDomain)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error verifying domain:', error)
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 },
    )
  }
}
