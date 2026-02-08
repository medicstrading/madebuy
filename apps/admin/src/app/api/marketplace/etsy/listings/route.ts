import { marketplace } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'

/**
 * GET /api/marketplace/etsy/listings
 *
 * List all Etsy listings for the current tenant
 * Note: Etsy integration is coming soon, this returns existing DB records only
 */
export async function GET(_request: NextRequest) {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!tenant.features?.marketplaceSync) {
      return NextResponse.json(
        { error: 'Marketplace sync not available on your plan' },
        { status: 403 },
      )
    }

    // Check Etsy connection
    const connection = await marketplace.getConnectionByMarketplace(
      tenant.id,
      'etsy',
    )
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
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/marketplace/etsy/listings
 *
 * Create a new Etsy listing - Coming Soon
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Etsy sync coming Q2 2026. For now, manage your Etsy listings directly on etsy.com.',
    },
    { status: 501 },
  )
}
