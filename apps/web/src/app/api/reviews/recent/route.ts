import { NextRequest, NextResponse } from 'next/server'
import { reviews, tenants } from '@madebuy/db'

/**
 * GET /api/reviews/recent
 * Get recent approved reviews across all products for a tenant.
 * Used by the Reviews website design section.
 *
 * Query params:
 *   - tenantId (required): The tenant ID
 *   - limit (optional): Max number of reviews (default 6, max 20)
 *
 * Returns:
 *   - reviews: Array of reviews with piece metadata (name, slug, thumbnail)
 *   - stats: Aggregated rating stats for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const limitParam = searchParams.get('limit')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    // Parse and clamp limit
    let limit = parseInt(limitParam || '6', 10)
    if (isNaN(limit) || limit < 1) limit = 6
    if (limit > 20) limit = 20

    // Validate tenant exists
    const tenant = await tenants.getTenantById(tenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get recent approved reviews with piece metadata
    const [recentReviews, stats] = await Promise.all([
      reviews.listRecentApprovedReviews(tenantId, limit),
      reviews.getTenantReviewStats(tenantId),
    ])

    return NextResponse.json({
      reviews: recentReviews,
      stats,
    })
  } catch (error) {
    console.error('Error fetching recent reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
