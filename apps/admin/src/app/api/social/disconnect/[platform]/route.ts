import { tenants } from '@madebuy/db'
import type { SocialPlatform } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { platform: string } },
) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platform = params.platform as SocialPlatform

    // Remove the connection from tenant's social connections
    const existingConnections = tenant.socialConnections || []
    const updatedConnections = existingConnections.filter(
      (c: any) => c.platform !== platform,
    )

    await tenants.updateTenant(tenant.id, {
      socialConnections: updatedConnections,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      },
      { status: 500 },
    )
  }
}
