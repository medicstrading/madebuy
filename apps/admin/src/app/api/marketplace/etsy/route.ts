import { marketplace } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/marketplace/etsy
 *
 * Get Etsy connection status for current tenant
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'etsy',
    )

    if (!connection) {
      return NextResponse.json({
        connected: false,
        enabled: false,
        marketplace: 'etsy',
      })
    }

    // Don't expose tokens to client
    return NextResponse.json({
      connected: connection.status === 'connected',
      enabled: connection.enabled ?? false,
      marketplace: 'etsy',
      status: connection.status,
      shopName: connection.shopName,
      sellerId: connection.sellerId,
      lastSyncAt: connection.lastSyncAt,
      lastError: connection.lastError,
      tokenExpiresAt: connection.tokenExpiresAt,
      createdAt: connection.createdAt,
    })
  } catch (error) {
    console.error('Error fetching Etsy connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection status' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/marketplace/etsy
 *
 * Disconnect Etsy account
 */
export async function DELETE() {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'etsy',
    )

    if (!connection) {
      return NextResponse.json(
        { error: 'No Etsy connection found' },
        { status: 404 },
      )
    }

    // Revoke the connection (soft delete)
    await marketplace.deleteConnection(tenant.id, connection.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Etsy:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Etsy' },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/marketplace/etsy
 *
 * Update Etsy connection settings (e.g., toggle enabled)
 */
export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'etsy',
    )

    if (!connection) {
      return NextResponse.json(
        { error: 'No Etsy connection found' },
        { status: 404 },
      )
    }

    await marketplace.updateConnection(tenant.id, connection.id, { enabled })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error('Error updating Etsy connection:', error)
    return NextResponse.json(
      { error: 'Failed to update Etsy connection' },
      { status: 500 },
    )
  }
}
