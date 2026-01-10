import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'

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

    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')

    if (!connection) {
      return NextResponse.json({
        connected: false,
        marketplace: 'etsy',
      })
    }

    // Don't expose tokens to client
    return NextResponse.json({
      connected: connection.status === 'connected',
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
      { status: 500 }
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

    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')

    if (!connection) {
      return NextResponse.json({ error: 'No Etsy connection found' }, { status: 404 })
    }

    // Revoke the connection (soft delete)
    await marketplace.deleteConnection(tenant.id, connection.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Etsy:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Etsy' },
      { status: 500 }
    )
  }
}
