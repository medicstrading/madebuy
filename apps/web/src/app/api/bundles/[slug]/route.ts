import { NextRequest, NextResponse } from 'next/server'
import { bundles, tenants } from '@madebuy/db'

/**
 * GET /api/bundles/[slug]
 * Get a single bundle by slug with piece details (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

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

    // Get bundle with piece details
    const bundle = await bundles.getBundleWithPiecesBySlug(tenant.id, slug)

    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    // Only return active bundles on public endpoint
    if (bundle.status !== 'active') {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle })
  } catch (error) {
    console.error('Error fetching bundle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
