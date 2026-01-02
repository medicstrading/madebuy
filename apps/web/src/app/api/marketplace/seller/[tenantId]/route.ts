import { NextRequest, NextResponse } from 'next/server'
import { marketplace, tenants } from '@madebuy/db'

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
    const searchParams = request.nextUrl.searchParams

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 24

    // Try to find tenant by id first, then by slug
    let tenant = await tenants.getTenantById(params.tenantId)
    if (!tenant) {
      tenant = await tenants.getTenantBySlug(params.tenantId)
    }

    const tenantId = tenant?.id || params.tenantId

    // Get seller profile
    const profile = await marketplace.getSellerProfile(tenantId)

    // Need either tenant or profile to be a valid seller
    if (!tenant && !profile) {
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
      tenant: tenant ? {
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
        storeName: tenant.storeName,
        tagline: tenant.tagline,
        description: tenant.description,
        location: tenant.location,
        makerType: tenant.makerType,
        createdAt: tenant.createdAt,
      } : null,
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
