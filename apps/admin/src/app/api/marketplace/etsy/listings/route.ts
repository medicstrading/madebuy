import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/marketplace/etsy/listings
 *
 * List all Etsy listings for the current tenant
 * Note: Etsy integration is coming soon, this returns existing DB records only
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Etsy connection
    const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({ error: 'Etsy not connected' }, { status: 400 })
    }

    // Get listings from database (no Etsy API sync yet)
    const listings = await marketplace.listListings(tenant.id, {
      marketplace: 'etsy',
    })

    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Error fetching Etsy listings:', error)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}

/**
 * POST /api/marketplace/etsy/listings
 *
 * Create a new Etsy listing - Coming Soon
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Etsy listing creation coming soon' },
    { status: 501 }
  )
}
