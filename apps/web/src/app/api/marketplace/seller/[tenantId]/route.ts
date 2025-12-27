import { NextRequest, NextResponse } from 'next/server'
import { marketplace } from '@madebuy/db'

/**
 * GET /api/marketplace/seller/[tenantId]
 * Get seller profile and products
 *
 * Query params:
 * - page?: number (default: 1)
 * - limit?: number (default: 24)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId
    const searchParams = request.nextUrl.searchParams

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 24

    // Get seller profile
    const profile = await marketplace.getSellerProfile(tenantId)

    if (!profile) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Get seller products
    const productsResult = await marketplace.listSellerProducts(tenantId, page, limit)

    // Get seller marketplace stats
    const stats = await marketplace.getTenantMarketplaceStats(tenantId)

    return NextResponse.json({
      profile,
      products: productsResult.products,
      pagination: productsResult.pagination,
      stats,
    })
  } catch (error) {
    console.error('Error fetching seller profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seller' },
      { status: 500 }
    )
  }
}
