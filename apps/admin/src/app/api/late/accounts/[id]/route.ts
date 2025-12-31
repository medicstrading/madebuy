import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { lateClient } from '@madebuy/social'

/**
 * DELETE /api/late/accounts/[id]
 * Disconnect a Late.dev account
 */
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await lateClient.disconnectAccount(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting account:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect account' },
      { status: 500 }
    )
  }
}
