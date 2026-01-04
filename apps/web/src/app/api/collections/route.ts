import { NextRequest, NextResponse } from 'next/server'
import { collections, tenants } from '@madebuy/db'

/**
 * GET /api/collections
 * Get published collections for a tenant (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const featured = searchParams.get('featured')
    const limit = searchParams.get('limit')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Validate tenant exists
    const tenant = await tenants.getTenantById(tenantId) || await tenants.getTenantBySlug(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    let result

    if (featured === 'true') {
      result = await collections.getFeaturedCollections(
        tenant.id,
        limit ? parseInt(limit, 10) : 6
      )
    } else {
      result = await collections.listPublishedCollections(
        tenant.id,
        limit ? parseInt(limit, 10) : 20
      )
    }

    return NextResponse.json({ collections: result })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
