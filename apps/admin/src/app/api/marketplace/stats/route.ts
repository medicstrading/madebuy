import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { getDatabase } from '@madebuy/db'

/**
 * GET /api/marketplace/stats
 * Get marketplace statistics for current tenant
 */
export async function GET() {
  try {
    const tenant = await getCurrentTenant()

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()

    // Get marketplace stats
    const stats = await marketplace.getTenantMarketplaceStats(tenant.id)

    // Get seller profile
    const profile = await marketplace.getSellerProfile(tenant.id)

    // Get listed products count
    const listedCount = await db.collection('products').countDocuments({
      tenantId: tenant.id,
      'marketplace.listed': true
    })

    // Get approved products count
    const approvedCount = await db.collection('products').countDocuments({
      tenantId: tenant.id,
      'marketplace.listed': true,
      'marketplace.approvalStatus': 'approved'
    })

    // Get pending products count
    const pendingCount = await db.collection('products').countDocuments({
      tenantId: tenant.id,
      'marketplace.listed': true,
      'marketplace.approvalStatus': 'pending'
    })

    // Get recent marketplace sales (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // TODO: Query orders collection for marketplace sales
    // This requires tracking marketplace source in orders

    return NextResponse.json({
      stats,
      profile,
      productCounts: {
        listed: listedCount,
        approved: approvedCount,
        pending: pendingCount,
      },
      hasMarketplaceAccess: tenant.features.marketplaceListing,
      hasFeaturedAccess: tenant.features.marketplaceFeatured,
      plan: tenant.plan,
    })
  } catch (error) {
    console.error('Error fetching marketplace stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marketplace stats' },
      { status: 500 }
    )
  }
}
