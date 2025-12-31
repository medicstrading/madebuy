import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { lateClient } from '@madebuy/social'

/**
 * GET /api/late/accounts
 * Get all connected accounts from Late.dev
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await lateClient.getAccounts()

    return NextResponse.json({ accounts: data.accounts })
  } catch (error) {
    console.error('Error fetching Late accounts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
