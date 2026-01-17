import { bundles, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'

// Validation for tenantId format (alphanumeric, dashes, underscores, 1-50 chars)
const TENANT_ID_REGEX = /^[a-zA-Z0-9_-]{1,50}$/

/**
 * GET /api/bundles
 * Get active bundles for a tenant (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const limit = searchParams.get('limit')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      )
    }

    // Validate tenantId format before database query (P0 security fix)
    if (!TENANT_ID_REGEX.test(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenantId format' },
        { status: 400 },
      )
    }

    // Validate limit if provided
    const parsedLimit = limit ? parseInt(limit, 10) : 20
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 100' },
        { status: 400 },
      )
    }

    // Validate tenant exists
    const tenant =
      (await tenants.getTenantById(tenantId)) ||
      (await tenants.getTenantBySlug(tenantId))
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get active bundles
    const result = await bundles.listActiveBundles(tenant.id, parsedLimit)

    // Get bundles with populated piece details for display
    const bundlesWithPieces = await Promise.all(
      result.map((bundle) => bundles.getBundleWithPieces(tenant.id, bundle.id)),
    )

    // Filter out any null results
    const validBundles = bundlesWithPieces.filter(Boolean)

    return NextResponse.json({ bundles: validBundles })
  } catch (error) {
    console.error('Error fetching bundles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
