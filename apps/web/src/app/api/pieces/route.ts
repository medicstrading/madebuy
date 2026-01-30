import { pieces, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/rate-limit'

const MAX_QUERY_LENGTH = 200

/**
 * GET /api/pieces
 * Search pieces for a tenant storefront (public endpoint)
 *
 * Query params:
 *   - tenantId: tenant ID or slug (required)
 *   - q: search query (required for search, optional for listing)
 *   - category: filter by category (optional)
 *   - limit: max results (optional, default 50)
 */
export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateLimitResponse = await rateLimiters.search(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const query = searchParams.get('q')?.slice(0, MAX_QUERY_LENGTH) // Limit query length
    const category = searchParams.get('category')
    const limitParam = searchParams.get('limit')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      )
    }

    // Validate tenant exists (accept ID or slug)
    const tenant =
      (await tenants.getTenantById(tenantId)) ||
      (await tenants.getTenantBySlug(tenantId))
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50
    const options = {
      limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
      category: category || undefined,
    }

    let results

    if (query?.trim()) {
      // Full-text search
      results = await pieces.searchPieces(tenant.id, query, options)
    } else {
      // List published pieces (no search query)
      results = await pieces.listPieces(tenant.id, {
        status: 'available',
        isPublishedToWebsite: true,
        category: options.category,
        limit: options.limit,
      })
    }

    return NextResponse.json({
      pieces: results,
      query: query || null,
      total: results.length,
    })
  } catch (error) {
    console.error('Error searching pieces:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
