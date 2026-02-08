import { pieces, tenants } from '@madebuy/db'
import type { Piece } from '@madebuy/shared'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search
 * Search products by query string
 *
 * Query params:
 * - q: Search query string (required)
 * - tenant: Tenant slug (required)
 * - limit: Max results (default: 20, max: 100)
 * - category: Optional category filter
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Validate required params
    const query = searchParams.get('q')
    const tenantSlug = searchParams.get('tenant')

    if (query === null || !tenantSlug) {
      return NextResponse.json(
        { error: 'Missing required parameters: q, tenant' },
        { status: 400 },
      )
    }

    // Sanitize query
    const sanitizedQuery = query.trim()
    if (sanitizedQuery.length === 0) {
      return NextResponse.json({ results: [] })
    }

    if (sanitizedQuery.length > 200) {
      return NextResponse.json(
        { error: 'Query too long (max 200 characters)' },
        { status: 400 },
      )
    }

    // Look up tenant
    const tenant = await tenants.getTenantBySlug(tenantSlug)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Parse optional params
    const limitParam = searchParams.get('limit')
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100)
      : 20
    const category = searchParams.get('category') || undefined

    // Execute search
    const results = await pieces.searchPieces(tenant.id, sanitizedQuery, {
      limit,
      category,
    })

    // Transform for API response (don't expose internal fields)
    const publicResults = results.map((piece: Piece) => ({
      id: piece.id,
      name: piece.name,
      slug: piece.slug,
      description: piece.description,
      price: piece.price,
      currency: piece.currency,
      category: piece.category,
      tags: piece.tags,
      stock: piece.stock,
      hasVariants: piece.hasVariants,
      mediaIds: piece.mediaIds,
      isFeatured: piece.isFeatured,
    }))

    return NextResponse.json({ results: publicResults })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 },
    )
  }
}
