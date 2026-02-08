import { lateClient } from '@madebuy/social'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/late/accounts
 * Get all connected accounts from Late.dev
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!tenant.features?.socialPublishing) {
      return NextResponse.json(
        { error: 'Social publishing not available on your plan' },
        { status: 403 },
      )
    }

    const data = await lateClient.getAccounts()

    return NextResponse.json({ accounts: data.accounts })
  } catch (error) {
    console.error('Error fetching Late accounts:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch accounts',
      },
      { status: 500 },
    )
  }
}
